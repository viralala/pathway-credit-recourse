"""Phase 7: evaluate the Phase 6 models. Nothing is retrained here.

Reads the saved predictions (ml/artifacts/phase6_predictions.npz), joins the labels
from data/cs-training.csv by row id, and measures both models on each part:

    discrimination   ROC AUC, KS
    probability      Brier score, calibration (bands, deciles, slope/intercept, ECE)
    diagnostics      confusion matrices at REFERENCE thresholds only

Logistic Regression is the shipped candidate. Gradient Boosting is a benchmark.

The thresholds used for the confusion matrices are diagnostic conventions, not the
approval cut-off. Choosing the cut-off is Phase 8 and is not done here.

Usage (from the repo root):
    python ml/evaluate_models.py

Output:
    ml/artifacts/phase7_evaluation.json

This module does not retrain, recalibrate, choose a cut-off, or write lib/model.json.
"""

from __future__ import annotations

import hashlib
import json

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score, roc_curve

from features import FeatureBuilder
from preprocess import DATA_PATH, ROOT, TARGET, load_raw
from split import PARTS, SEED, file_sha256, load_split

TRAINING_REPORT = ROOT / "ml" / "artifacts" / "phase6_training.json"
PREDICTIONS = ROOT / "ml" / "artifacts" / "phase6_predictions.npz"
EVALUATION_OUT = ROOT / "ml" / "artifacts" / "phase7_evaluation.json"

MODELS = {"logisticRegression": "logistic", "gradientBoosting": "boosting"}

# Predicted-probability bands for the calibration table.
BANDS = [0.0, 0.02, 0.05, 0.10, 0.20, 0.40, 1.0]

# REFERENCE thresholds for the confusion matrices. Neither is the approval cut-off.
#   0.50            the textbook default: "more likely than not to default"
#   training rate   flag anyone the model rates riskier than the average borrower
REFERENCE_THRESHOLDS = {"conventional_0.50": 0.50}

BOOTSTRAP_RESAMPLES = 300


def ks_statistic(y: np.ndarray, p: np.ndarray) -> float:
    """Largest gap between the share of defaulters and non-defaulters above a score."""
    fpr, tpr, _ = roc_curve(y, p)
    return float(np.max(tpr - fpr))


def calibration_line(y: np.ndarray, p: np.ndarray) -> tuple[float, float]:
    """Slope and intercept of the observed outcome against the predicted log-odds.

    Perfect calibration is slope 1, intercept 0. Slope below 1 means the predictions
    are too extreme (overconfident). This is a measurement only: nothing is recalibrated.
    """
    logit = np.log(p / (1 - p)).reshape(-1, 1)
    fit = LogisticRegression(C=1e9, solver="lbfgs", max_iter=1000).fit(logit, y)
    return float(fit.coef_[0][0]), float(fit.intercept_[0])


def band_table(y: np.ndarray, p: np.ndarray) -> list[dict]:
    rows = []
    which = np.clip(np.digitize(p, BANDS[1:-1], right=False), 0, len(BANDS) - 2)
    for i in range(len(BANDS) - 1):
        m = which == i
        n = int(m.sum())
        rows.append(
            {
                "band": f"{BANDS[i]:.2f}-{BANDS[i + 1]:.2f}",
                "rows": n,
                "shareOfRows": n / len(p),
                "meanPredicted": float(p[m].mean()) if n else None,
                "observedRate": float(y[m].mean()) if n else None,
                "defaults": int(y[m].sum()),
            }
        )
    return rows


def decile_table(y: np.ndarray, p: np.ndarray) -> list[dict]:
    """Ten equal-sized groups from lowest to highest predicted risk."""
    order = np.argsort(p, kind="stable")
    rows = []
    for i, idx in enumerate(np.array_split(order, 10), start=1):
        rows.append(
            {
                "decile": i,
                "rows": int(len(idx)),
                "meanPredicted": float(p[idx].mean()),
                "observedRate": float(y[idx].mean()),
                "defaults": int(y[idx].sum()),
            }
        )
    return rows


def expected_calibration_error(deciles: list[dict]) -> float:
    total = sum(d["rows"] for d in deciles)
    return float(sum(d["rows"] / total * abs(d["meanPredicted"] - d["observedRate"]) for d in deciles))


def confusion(y: np.ndarray, p: np.ndarray, threshold: float) -> dict:
    flagged = p >= threshold
    tp = int((flagged & (y == 1)).sum())
    fp = int((flagged & (y == 0)).sum())
    fn = int((~flagged & (y == 1)).sum())
    tn = int((~flagged & (y == 0)).sum())
    return {
        "threshold": threshold,
        "truePositive": tp,
        "falsePositive": fp,
        "falseNegative": fn,
        "trueNegative": tn,
        "flaggedShare": (tp + fp) / len(y),
        "recall": tp / (tp + fn) if tp + fn else None,
        "precision": tp / (tp + fp) if tp + fp else None,
        "falsePositiveRate": fp / (fp + tn) if fp + tn else None,
        "accuracy": (tp + tn) / len(y),
    }


def evaluate(y: np.ndarray, p: np.ndarray, thresholds: dict[str, float]) -> dict:
    base = float(y.mean())
    brier = float(brier_score_loss(y, p))
    brier_base = base * (1 - base)  # Brier score of always predicting the default rate
    deciles = decile_table(y, p)
    slope, intercept = calibration_line(y, p)
    return {
        "rows": int(len(y)),
        "defaults": int(y.sum()),
        "defaultRate": base,
        "auc": float(roc_auc_score(y, p)),
        "ks": ks_statistic(y, p),
        "brier": brier,
        "brierOfBaseRate": brier_base,
        "brierSkill": 1 - brier / brier_base,
        "calibration": {
            "meanPredicted": float(p.mean()),
            "observedRate": base,
            "slope": slope,
            "intercept": intercept,
            "expectedCalibrationError": expected_calibration_error(deciles),
            "largestDecileGap": float(max(abs(d["meanPredicted"] - d["observedRate"]) for d in deciles)),
            "bands": band_table(y, p),
            "deciles": deciles,
        },
        "confusionAtReferenceThresholds": {name: confusion(y, p, t) for name, t in thresholds.items()},
    }


def bootstrap(y: np.ndarray, p_logistic: np.ndarray, p_boosting: np.ndarray, rng: np.random.Generator) -> dict:
    """How much the numbers would wobble on another sample of the same size."""
    n = len(y)
    out = {k: [] for k in ("aucLogistic", "aucBoosting", "aucGap", "brierLogistic", "brierBoosting", "brierGap")}
    for _ in range(BOOTSTRAP_RESAMPLES):
        i = rng.integers(0, n, n)
        yy = y[i]
        a_l, a_b = roc_auc_score(yy, p_logistic[i]), roc_auc_score(yy, p_boosting[i])
        b_l, b_b = brier_score_loss(yy, p_logistic[i]), brier_score_loss(yy, p_boosting[i])
        for k, v in zip(out, (a_l, a_b, a_b - a_l, b_l, b_b, b_l - b_b)):
            out[k].append(v)
    return {k: {"low": float(np.quantile(v, 0.025)), "high": float(np.quantile(v, 0.975))} for k, v in out.items()}


def main() -> None:
    report = json.loads(TRAINING_REPORT.read_text())
    if file_sha256(DATA_PATH) != report["dataset"]["sha256"]:
        raise ValueError("data/cs-training.csv is not the file the Phase 6 models were trained on")
    raw = load_raw()
    split = load_split(raw)

    # ---- the saved predictions are the Phase 6 ones, untouched ---------------------------
    with np.load(PREDICTIONS) as saved:
        preds = {k: saved[k] for k in saved.files}
    y, p = {}, {}
    for part in PARTS:
        assert np.array_equal(preds[f"{part}_ids"], split[part]), f"{part}: prediction rows are not the saved split"
        y[part] = raw[TARGET].to_numpy()[split[part]]
        assert int(y[part].sum()) == report["split"]["parts"][part]["defaults"]
        p[part] = {}
        for model, key in MODELS.items():
            values = preds[f"{part}_{key}"]
            digest = hashlib.sha256(np.ascontiguousarray(values, dtype="<f8").tobytes()).hexdigest()
            assert digest == report["predictions"]["sha256"][part][key], f"{part}/{key}: predictions changed since Phase 6"
            p[part][model] = values

    # The Logistic Regression predictions follow from the recorded numbers alone:
    # rebuild them from the report's statistics, intercept and coefficients.
    builder = FeatureBuilder.from_dict(report["features"]["preparation"])
    lr = report["logisticRegression"]
    weights = np.array([lr["coefficients"][k] for k in report["features"]["order"]])
    for part in PARTS:
        z = lr["intercept"] + builder.transform(raw.iloc[split[part]]).to_numpy() @ weights
        assert np.allclose(1 / (1 + np.exp(-z)), p[part]["logisticRegression"], rtol=0, atol=1e-12), part

    # ---- evaluate ------------------------------------------------------------------------
    thresholds = {**REFERENCE_THRESHOLDS, "training_default_rate": float(y["train"].mean())}
    results = {model: {part: evaluate(y[part], p[part][model], thresholds) for part in PARTS} for model in MODELS}

    rng = np.random.default_rng(SEED)
    intervals = {
        part: bootstrap(y[part], p[part]["logisticRegression"], p[part]["gradientBoosting"], rng)
        for part in ("validation", "test")
    }

    gaps = {}
    for part in PARTS:
        a, b = results["logisticRegression"][part], results["gradientBoosting"][part]
        gaps[part] = {
            "aucBoostingMinusLogistic": b["auc"] - a["auc"],
            "ksBoostingMinusLogistic": b["ks"] - a["ks"],
            "brierLogisticMinusBoosting": a["brier"] - b["brier"],
        }
    stability = {
        model: {
            "aucTrainMinusValidation": r["train"]["auc"] - r["validation"]["auc"],
            "aucTrainMinusTest": r["train"]["auc"] - r["test"]["auc"],
            "aucValidationMinusTest": r["validation"]["auc"] - r["test"]["auc"],
            "ksValidationMinusTest": r["validation"]["ks"] - r["test"]["ks"],
            "brierValidationMinusTest": r["validation"]["brier"] - r["test"]["brier"],
        }
        for model, r in results.items()
    }

    # ---- sanity ----------------------------------------------------------------------------
    for model in MODELS:
        for part in PARTS:
            r = results[model][part]
            assert 0.5 < r["auc"] < 1 and 0 < r["ks"] < 1 and 0 < r["brier"] < r["brierOfBaseRate"]
            for c in r["confusionAtReferenceThresholds"].values():
                assert c["truePositive"] + c["falsePositive"] + c["falseNegative"] + c["trueNegative"] == r["rows"]
                assert c["truePositive"] + c["falseNegative"] == r["defaults"]
            assert sum(b["rows"] for b in r["calibration"]["bands"]) == r["rows"]
            assert sum(d["rows"] for d in r["calibration"]["deciles"]) == r["rows"]

    EVALUATION_OUT.write_text(
        json.dumps(
            {
                "phase": 7,
                "note": "Evaluation of the Phase 6 models from their saved predictions; nothing retrained or recalibrated. "
                "Confusion matrices use REFERENCE thresholds for diagnosis only. The approval cut-off is not chosen here.",
                "inputs": {
                    "trainingReport": TRAINING_REPORT.relative_to(ROOT).as_posix(),
                    "predictions": PREDICTIONS.relative_to(ROOT).as_posix(),
                    "datasetSha256": report["dataset"]["sha256"],
                },
                "primaryModel": "logisticRegression",
                "benchmarkModel": "gradientBoosting",
                "referenceThresholds": {
                    "values": thresholds,
                    "warning": "Diagnostic only. Not the approval cut-off; that is chosen in Phase 8.",
                },
                "probabilityBands": BANDS,
                "results": results,
                "boostingVersusLogistic": gaps,
                "stability": stability,
                "bootstrap95": {"resamples": BOOTSTRAP_RESAMPLES, "seed": SEED, "intervals": intervals},
            },
            indent=2,
        )
        + "\n"
    )

    # ---- console report --------------------------------------------------------------------
    pd.set_option("display.width", 200)
    fmt = lambda v: f"{v:.4f}"  # noqa: E731
    print("=== Phase 7: model evaluation (no retraining) ===")
    for metric, title in (("auc", "ROC AUC (higher is better)"), ("ks", "KS (higher is better)"), ("brier", "Brier score (lower is better)"), ("brierSkill", "Brier skill vs always predicting the default rate")):
        print(f"\n{title}")
        print(pd.DataFrame({m: {part: results[m][part][metric] for part in PARTS} for m in MODELS}).T.to_string(float_format=fmt))
    print(f"\nBrier score of always predicting the default rate: {results['logisticRegression']['test']['brierOfBaseRate']:.4f}")

    print("\n95% bootstrap intervals")
    for part, iv in intervals.items():
        print(f"  {part}")
        for k, v in iv.items():
            print(f"    {k:14s} [{v['low']:+.4f}, {v['high']:+.4f}]")

    print("\ncalibration summary")
    rows = {}
    for m in MODELS:
        for part in PARTS:
            c = results[m][part]["calibration"]
            rows[(m, part)] = {k: c[k] for k in ("meanPredicted", "observedRate", "slope", "intercept", "expectedCalibrationError", "largestDecileGap")}
    print(pd.DataFrame(rows).T.to_string(float_format=fmt))

    for part in ("validation", "test"):
        for m in MODELS:
            print(f"\ncalibration by probability band: {m}, {part}")
            print(pd.DataFrame(results[m][part]["calibration"]["bands"]).set_index("band").to_string(float_format=fmt))
    for part in ("validation", "test"):
        print(f"\ncalibration by decile (predicted / observed): {part}")
        print(
            pd.DataFrame(
                {
                    f"{m[:8]}_{col}": [d[col] for d in results[m][part]["calibration"]["deciles"]]
                    for m in MODELS
                    for col in ("meanPredicted", "observedRate")
                },
                index=range(1, 11),
            ).to_string(float_format=fmt)
        )

    print("\nconfusion matrices at REFERENCE thresholds (diagnostic only, not the cut-off)")
    for name, t in thresholds.items():
        print(f"  threshold {name} = {t:.4f}")
        rows = {(m, part): {k: v for k, v in results[m][part]["confusionAtReferenceThresholds"][name].items() if k != "threshold"} for m in MODELS for part in PARTS}
        print("  " + pd.DataFrame(rows).T.to_string(float_format=fmt).replace("\n", "\n  "))

    print("\nboosting versus logistic")
    print(pd.DataFrame(gaps).T.to_string(float_format=fmt))
    print("\nstability")
    print(pd.DataFrame(stability).T.to_string(float_format=fmt))
    print(f"\nwrote {EVALUATION_OUT.relative_to(ROOT).as_posix()}")
    print("all verification checks passed")


if __name__ == "__main__":
    main()
