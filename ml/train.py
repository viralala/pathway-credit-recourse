"""Train Pathway's interpretable credit model offline and export it as JSON.

Usage (from the repo root):
    python ml/train.py              # trains, exports, then runs the TS recourse evaluation
    python ml/train.py --skip-eval  # only trains + exports

Data:
    If data/cs-training.csv (Kaggle "Give Me Some Credit") exists it is used.
    Otherwise a synthetic dataset with the same columns is generated so the
    project works out of the box. The data source is recorded in the outputs.

Outputs:
    lib/model.json                 coefficients, scaler, intercept, threshold
    public/metrics.json            AUC + data notes (recourse metrics are merged
                                   in by scripts/evaluate.ts, the same TypeScript
                                   engine the web app ships)
    ml/artifacts/eval_sample.json  held-out applicants used for recourse metrics
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "cs-training.csv"
MODEL_OUT = ROOT / "lib" / "model.json"
METRICS_OUT = ROOT / "public" / "metrics.json"
EVAL_OUT = ROOT / "ml" / "artifacts" / "eval_sample.json"

SEED = 42
TARGET = "SeriousDlqin2yrs"

# Raw Kaggle column -> (app key, label, clip_min, clip_max, log1p)
FEATURES = [
    ("RevolvingUtilizationOfUnsecuredLines", "utilization", "Credit card utilization", 0.0, 1.5, False),
    ("age", "age", "Age", 18.0, 100.0, False),
    ("NumberOfTime30-59DaysPastDueNotWorse", "late30", "Payments 30-59 days late", 0.0, 10.0, False),
    ("DebtRatio", "debtRatio", "Debt-to-income ratio", 0.0, 3.0, False),
    ("MonthlyIncome", "monthlyIncome", "Monthly income", 0.0, 1e6, True),
    ("NumberOfOpenCreditLinesAndLoans", "openCreditLines", "Open credit lines and loans", 0.0, 30.0, False),
    ("NumberOfTimes90DaysLate", "late90", "Payments 90+ days late", 0.0, 10.0, False),
    ("NumberRealEstateLoansOrLines", "realEstateLoans", "Real-estate loans", 0.0, 10.0, False),
    ("NumberOfTime60-89DaysPastDueNotWorse", "late60", "Payments 60-89 days late", 0.0, 10.0, False),
    ("NumberOfDependents", "dependents", "Dependents", 0.0, 10.0, False),
]

# Lender policy: reject the riskiest share of applicants (by predicted default probability).
REJECT_SHARE = 0.20
THRESHOLD_SCORE = 650  # Pathway score at the approval cut-off
POINTS_TO_DOUBLE_ODDS = 50


def generate_synthetic(n: int = 120_000, seed: int = SEED) -> pd.DataFrame:
    """Synthetic data with Give Me Some Credit's columns and similar marginals."""
    rng = np.random.default_rng(seed)
    stress = rng.normal(0, 1, n)  # latent financial stress, drives correlated behaviour

    age = np.clip(rng.normal(52, 14.5, n), 21, 95).round()
    age_peak = np.minimum(age, 52) - 21
    log_income = 8.25 + 0.013 * age_peak - 0.18 * stress + rng.normal(0, 0.55, n)
    income = np.exp(log_income).round(-1)
    income[rng.random(n) < 0.12] = np.nan  # Kaggle data has ~20% missing income

    util_latent = -1.6 + 1.25 * stress - 0.012 * (age - 52) + rng.normal(0, 0.9, n)
    utilization = 1.15 / (1 + np.exp(-util_latent))
    utilization = np.where(rng.random(n) < 0.18, rng.uniform(0, 0.04, n), utilization)

    debt_ratio = np.exp(np.log(0.33) + 0.28 * stress + rng.normal(0, 0.55, n))
    open_lines = rng.poisson(np.clip(8.5 + 0.04 * (age - 52) - 0.6 * stress, 1, None))
    real_estate = rng.poisson(np.clip(0.9 + 0.012 * (age - 40) + 0.3 * (log_income - 8.5), 0.05, None))
    dependents = rng.poisson(np.clip(0.75 + 0.02 * (45 - np.abs(age - 40)) / 5, 0.05, None)).astype(float)
    dependents[rng.random(n) < 0.02] = np.nan

    late_rate = np.exp(-2.2 + 0.95 * stress)
    late30 = rng.poisson(late_rate * 1.2)
    late60 = rng.poisson(late_rate * 0.45)
    late90 = rng.poisson(late_rate * 0.5 * (stress > 0.3))

    inc_filled = np.where(np.isnan(income), 5400, income)
    logit = (
        -4.3
        + 2.6 * np.minimum(utilization, 1.2)
        + 0.55 * np.minimum(late30, 6)
        + 0.85 * np.minimum(late90, 6)
        + 0.7 * np.minimum(late60, 6)
        - 0.022 * (age - 52)
        + 0.75 * np.minimum(debt_ratio, 2.0)
        - 0.45 * (np.log1p(inc_filled) - 8.55)
        - 0.035 * np.minimum(open_lines, 20)
        + 0.12 * np.minimum(np.nan_to_num(dependents), 6)
        + 0.25 * stress
    )
    default = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)

    return pd.DataFrame(
        {
            TARGET: default,
            "RevolvingUtilizationOfUnsecuredLines": utilization.round(4),
            "age": age.astype(int),
            "NumberOfTime30-59DaysPastDueNotWorse": late30,
            "DebtRatio": debt_ratio.round(4),
            "MonthlyIncome": income,
            "NumberOfOpenCreditLinesAndLoans": open_lines,
            "NumberOfTimes90DaysLate": late90,
            "NumberRealEstateLoansOrLines": real_estate,
            "NumberOfTime60-89DaysPastDueNotWorse": late60,
            "NumberOfDependents": dependents,
        }
    )


def load_data() -> tuple[pd.DataFrame, str]:
    if DATA_PATH.exists():
        df = pd.read_csv(DATA_PATH)
        df = df.drop(columns=[c for c in df.columns if c.startswith("Unnamed")])
        return df, "kaggle"
    return generate_synthetic(), "synthetic"


def clean(df: pd.DataFrame, income_median: float) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    for raw, key, _label, lo, hi, _log in FEATURES:
        col = df[raw].astype(float)
        if key == "monthlyIncome":
            col = col.fillna(income_median)
        elif key == "dependents":
            col = col.fillna(0)
        if key.startswith("late"):
            col = col.where(col < 90, 0)  # Kaggle codes 96/98 as "unknown"
        out[key] = col.clip(lo, hi)
    out = out[out["age"] >= 18]
    return out


def transform(x: pd.DataFrame) -> np.ndarray:
    cols = []
    for _raw, key, _label, _lo, _hi, log in FEATURES:
        v = x[key].to_numpy(dtype=float)
        cols.append(np.log1p(v) if log else v)
    return np.column_stack(cols)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-eval", action="store_true")
    args = parser.parse_args()

    raw, source = load_data()
    income_median = float(raw["MonthlyIncome"].median())
    data = clean(raw, income_median)
    y = raw.loc[data.index, TARGET].to_numpy()
    print(f"data: {source}, rows={len(data)}, default rate={y.mean():.3%}")

    x_train, x_test, y_train, y_test = train_test_split(
        data, y, test_size=0.25, random_state=SEED, stratify=y
    )
    scaler = StandardScaler().fit(transform(x_train))
    model = LogisticRegression(max_iter=2000, C=1.0)
    model.fit(scaler.transform(transform(x_train)), y_train)

    pd_train = model.predict_proba(scaler.transform(transform(x_train)))[:, 1]
    pd_test = model.predict_proba(scaler.transform(transform(x_test)))[:, 1]
    auc = float(roc_auc_score(y_test, pd_test))
    threshold = float(np.quantile(pd_train, 1 - REJECT_SHARE))
    approve_test = pd_test <= threshold
    print(f"AUC={auc:.4f}  PD threshold={threshold:.4f}  test approval rate={approve_test.mean():.2%}")

    features_json = []
    for i, (raw_col, key, label, lo, hi, log) in enumerate(FEATURES):
        features_json.append(
            {
                "key": key,
                "label": label,
                "source": raw_col,
                "clip": [lo, hi],
                "log1p": log,
                "mean": float(scaler.mean_[i]),
                "std": float(scaler.scale_[i]),
                "coef": float(model.coef_[0][i]),
            }
        )

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    MODEL_OUT.write_text(
        json.dumps(
            {
                "version": 1,
                "trainedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "dataSource": source,
                "target": "Probability of serious delinquency (90+ days) within 2 years",
                "intercept": float(model.intercept_[0]),
                "threshold": threshold,
                "thresholdScore": THRESHOLD_SCORE,
                "pointsToDoubleOdds": POINTS_TO_DOUBLE_ODDS,
                "incomeImputation": income_median,
                "features": features_json,
            },
            indent=2,
        )
        + "\n"
    )

    data_note = (
        "Kaggle 'Give Me Some Credit' (cs-training.csv), 25% stratified hold-out"
        if source == "kaggle"
        else "Synthetic dataset generated by ml/train.py with the same columns as Kaggle "
        "'Give Me Some Credit' (data/cs-training.csv was not present); 25% stratified hold-out"
    )
    METRICS_OUT.parent.mkdir(parents=True, exist_ok=True)
    METRICS_OUT.write_text(
        json.dumps(
            {
                "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "dataSource": source,
                "dataNote": data_note,
                "rows": {"train": int(len(x_train)), "test": int(len(x_test))},
                "defaultRate": float(y.mean()),
                "auc": round(auc, 4),
                "threshold": threshold,
                "testApprovalRate": float(approve_test.mean()),
            },
            indent=2,
        )
        + "\n"
    )

    # Held-out applicants for the recourse evaluation (TypeScript engine).
    sample = x_test.sample(n=min(3000, len(x_test)), random_state=SEED)
    EVAL_OUT.parent.mkdir(parents=True, exist_ok=True)
    EVAL_OUT.write_text(json.dumps(sample.round(4).to_dict(orient="records")) + "\n")
    print(f"wrote {MODEL_OUT.relative_to(ROOT)}, {METRICS_OUT.relative_to(ROOT)}, {EVAL_OUT.relative_to(ROOT)}")

    if not args.skip_eval:
        npx = "npx.cmd" if sys.platform == "win32" else "npx"
        subprocess.run([npx, "tsx", "scripts/evaluate.ts"], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
