"""Phase 9: export the trained Logistic Regression to lib/model.json. Nothing is retrained.

Every number comes from files already on disk:

    ml/artifacts/phase6_training.json   intercept, 10 coefficients, feature order,
                                        floors/caps/logs, training means and stds,
                                        cleaning medians and thresholds
    ml/artifacts/phase8_cutoff.json     the frozen approval cut-off (0.10)

lib/model.json is written in exactly the schema lib/types.ts `CreditModel` expects
(per feature: key, label, source, clip, log1p, mean, std, coef), so lib/model.ts
computes  intercept + sum(coef * (transform(value) - mean) / std)  unchanged.
It must not carry any other field: lib/model.ts casts the JSON to `CreditModel`,
and TypeScript rejects that cast as soon as the JSON has a field the type lacks.

What that schema cannot express (the cleaning rules for missing or out-of-range
inputs, the decision rule, provenance) goes in lib/model.meta.json. lib/model.ts
imports its `preprocessing` block and applies those rules before scoring, so the
app cleans a raw applicant exactly as ml/preprocess.py does.

Before anything is written, the export is checked against the saved Python
predictions for all 150,000 rows, using only the two JSON documents about to be
written (not ml/features.py), so a wrong or missing number cannot go unnoticed.

Usage (from the repo root):
    python ml/export_model.py

Outputs:
    lib/model.json        the model, in the app's existing schema
    lib/model.meta.json   feature order, decision rule, cleaning rules, provenance

This module does not train, recalibrate, or change the cut-off.
"""

from __future__ import annotations

import hashlib
import json

import numpy as np
import pandas as pd

from preprocess import DATA_PATH, RAW_TO_KEY, ROOT, TARGET, load_raw
from split import PARTS, file_sha256, load_split

TRAINING_REPORT = ROOT / "ml" / "artifacts" / "phase6_training.json"
CUTOFF_REPORT = ROOT / "ml" / "artifacts" / "phase8_cutoff.json"
PREDICTIONS = ROOT / "ml" / "artifacts" / "phase6_predictions.npz"
MODEL_OUT = ROOT / "lib" / "model.json"
META_OUT = ROOT / "lib" / "model.meta.json"

MODEL_VERSION = 2  # version 1 was the synthetic-data model with age, dependents and real-estate loans

# When ml/train_models.py produced phase6_training.json. Fixed here, rather than
# "now", so exporting again gives a byte-identical file.
TRAINED_AT = "2026-10-05T05:20:24Z"

# Scorecard scale the app already uses (same values as ml/train.py and the previous
# model.json). They only translate log-odds into a 300-900 score; they do not
# affect probabilities or the approve/reject decision.
THRESHOLD_SCORE = 650
POINTS_TO_DOUBLE_ODDS = 50

TOLERANCE = 1e-6

KEY_TO_RAW = {key: raw for raw, key in RAW_TO_KEY.items()}
LABELS = {
    "utilization": "Credit card utilization",
    "late30": "Payments 30-59 days late",
    "late60": "Payments 60-89 days late",
    "late90": "Payments 90+ days late",
    "lateSpecialCode": "Late-payment history reported as a special code",
    "monthlyIncome": "Monthly income",
    "debtRatio": "Debt-to-income ratio",
    "openCreditLines": "Open credit lines and loans",
    "incomeMissing": "Income not provided",
    "incomePlaceholder": "Income given as 0 or 1",
}
# The three 0/1 flags are not typed in by an applicant; they are worked out from the
# other inputs. For someone who gives a real income and real late-payment counts
# they are all 0.
DERIVED = {
    "lateSpecialCode": "derived: 1 if any late-payment count is at or above lateSpecialCodeMin, else 0",
    "incomeMissing": "derived: 1 if monthly income is missing, else 0",
    "incomePlaceholder": "derived: 1 if monthly income is at or below incomePlaceholderMax, else 0",
}


def build_model(training: dict, cutoff: dict) -> tuple[dict, dict]:
    """The model in the app's schema, and the metadata that schema has no room for."""
    prep = training["features"]["preparation"]
    lr = training["logisticRegression"]
    thresholds, medians = prep["preprocessor"]["thresholds"], prep["preprocessor"]["medians"]

    features = []
    for spec in prep["features"]:
        key = spec["key"]
        is_flag = spec["cap"] is None
        features.append(
            {
                "key": key,
                "label": LABELS[key],
                "source": DERIVED[key] if is_flag else KEY_TO_RAW[key],
                # Flags are already 0 or 1, so [0, 1] leaves them unchanged.
                "clip": [0.0, 1.0] if is_flag else [spec["floor"], spec["cap"]],
                "log1p": spec["log1p"],
                "mean": spec["mean"],
                "std": spec["std"],
                "coef": lr["coefficients"][key],
            }
        )

    model = {
        "version": MODEL_VERSION,
        "trainedAt": TRAINED_AT,
        "dataSource": "kaggle",
        "target": "Probability of serious delinquency (90+ days) within 2 years",
        "intercept": lr["intercept"],
        "threshold": cutoff["selectedCutoff"],
        "thresholdScore": THRESHOLD_SCORE,
        "pointsToDoubleOdds": POINTS_TO_DOUBLE_ODDS,
        "incomeImputation": medians["monthlyIncome"],
        "features": features,
    }
    meta = {
        "describes": MODEL_OUT.relative_to(ROOT).as_posix(),
        "modelVersion": MODEL_VERSION,
        "featureOrder": training["features"]["order"],
        "decisionRule": {
            "approve": "probability < threshold",
            "reject": "probability >= threshold",
            "threshold": cutoff["selectedCutoff"],
            "selectedOn": cutoff["selectedOn"],
        },
        "preprocessing": {
            "note": "Cleaning applied to the raw inputs BEFORE the per-feature clip, log1p and standardization. "
            "Needed only for missing or out-of-range inputs; for a normal applicant no rule fires and all three flags are 0.",
            "steps": [
                "lateSpecialCode = 1 if any of late30/late60/late90 >= lateSpecialCodeMin, else 0; any such count becomes lateSpecialReplacement",
                "incomeMissing = 1 if monthlyIncome is missing; incomePlaceholder = 1 if monthlyIncome <= incomePlaceholderMax",
                "if either income flag is 1: monthlyIncome = medians.monthlyIncome and debtRatio = medians.debtRatio",
                "if utilization > utilizationInvalidAbove: utilization = medians.utilization",
                "then per feature: clip to [clip[0], clip[1]], log1p if set, subtract mean, divide by std",
                "logit = intercept + sum(coef * standardized feature); probability = 1 / (1 + exp(-logit))",
            ],
            "lateSpecialCodeMin": thresholds["lateSpecialMin"],
            "lateSpecialReplacement": thresholds["lateSpecialReplacement"],
            "incomePlaceholderMax": thresholds["incomePlaceholderMax"],
            "utilizationInvalidAbove": thresholds["utilizationInvalidAbove"],
            "medians": {k: medians[k] for k in ("monthlyIncome", "debtRatio", "utilization")},
            "statisticsFittedOn": "training rows only (90,000)",
        },
        "provenance": {
            "model": lr["estimator"],
            "params": {k: lr["params"][k] for k in ("C", "l1_ratio", "class_weight", "fit_intercept", "solver", "max_iter", "tol", "random_state")},
            "coefficientScale": "per 1 training standard deviation of the transformed feature",
            "datasetSha256": training["dataset"]["sha256"],
            "splitSeed": training["split"]["seed"],
            "trainingRows": training["split"]["parts"]["train"]["rows"],
            "trainingReport": TRAINING_REPORT.relative_to(ROOT).as_posix(),
            "cutoffReport": CUTOFF_REPORT.relative_to(ROOT).as_posix(),
            "trainingReportSha256": file_sha256(TRAINING_REPORT),
            "cutoffReportSha256": file_sha256(CUTOFF_REPORT),
            "versions": training["versions"],
        },
    }
    return model, meta


def score_from_json(model: dict, meta: dict, raw: pd.DataFrame) -> np.ndarray:
    """Probability of default for raw Kaggle-format rows, using ONLY the exported JSON."""
    pre = meta["preprocessing"]
    late = {k: raw[KEY_TO_RAW[k]].to_numpy(dtype=float) for k in ("late30", "late60", "late90")}
    income = raw[KEY_TO_RAW["monthlyIncome"]].to_numpy(dtype=float)
    debt_ratio = raw[KEY_TO_RAW["debtRatio"]].to_numpy(dtype=float)
    utilization = raw[KEY_TO_RAW["utilization"]].to_numpy(dtype=float)

    special = np.zeros(len(raw), dtype=bool)
    for v in late.values():
        special |= v >= pre["lateSpecialCodeMin"]
    late = {k: np.where(v >= pre["lateSpecialCodeMin"], pre["lateSpecialReplacement"], v) for k, v in late.items()}
    income_missing = np.isnan(income)
    with np.errstate(invalid="ignore"):
        income_placeholder = income <= pre["incomePlaceholderMax"]
        unusable = income_missing | income_placeholder
        values = {
            **late,
            "lateSpecialCode": special.astype(float),
            "monthlyIncome": np.where(unusable, pre["medians"]["monthlyIncome"], income),
            "debtRatio": np.where(unusable, pre["medians"]["debtRatio"], debt_ratio),
            "utilization": np.where(utilization > pre["utilizationInvalidAbove"], pre["medians"]["utilization"], utilization),
            "openCreditLines": raw[KEY_TO_RAW["openCreditLines"]].to_numpy(dtype=float),
            "incomeMissing": income_missing.astype(float),
            "incomePlaceholder": income_placeholder.astype(float),
        }

    z = np.full(len(raw), model["intercept"], dtype=float)
    for f in model["features"]:
        v = np.clip(values[f["key"]], f["clip"][0], f["clip"][1])
        if f["log1p"]:
            v = np.log1p(v)
        z += f["coef"] * (v - f["mean"]) / f["std"]
    return 1 / (1 + np.exp(-z))


def main() -> None:
    training = json.loads(TRAINING_REPORT.read_text())
    cutoff = json.loads(CUTOFF_REPORT.read_text())
    if file_sha256(DATA_PATH) != training["dataset"]["sha256"]:
        raise ValueError("data/cs-training.csv is not the file the Phase 6 model was trained on")
    assert training["primaryModel"] == cutoff["model"] == "logisticRegression"
    assert cutoff["selectedCutoff"] == 0.10 and cutoff["selectedOn"] == "validation"

    # Round-trip through text so the checks below see exactly what will be on disk.
    built_model, built_meta = build_model(training, cutoff)
    text, meta_text = json.dumps(built_model, indent=2) + "\n", json.dumps(built_meta, indent=2) + "\n"
    model, meta = json.loads(text), json.loads(meta_text)

    # ---- the export carries the Phase 6 and Phase 8 numbers exactly --------------------------
    lr, prep = training["logisticRegression"], training["features"]["preparation"]
    order = training["features"]["order"]
    assert len(model["features"]) == 10 and [f["key"] for f in model["features"]] == order == meta["featureOrder"]
    assert model["intercept"] == lr["intercept"]
    assert all(f["coef"] == lr["coefficients"][f["key"]] for f in model["features"])
    for f, spec in zip(model["features"], prep["features"]):
        assert (f["mean"], f["std"], f["log1p"]) == (spec["mean"], spec["std"], spec["log1p"]), f["key"]
        assert f["clip"] == ([0.0, 1.0] if spec["cap"] is None else [spec["floor"], spec["cap"]]), f["key"]
    assert model["threshold"] == meta["decisionRule"]["threshold"] == cutoff["selectedCutoff"] == 0.10
    assert model["incomeImputation"] == prep["preprocessor"]["medians"]["monthlyIncome"]
    assert model["version"] == meta["modelVersion"]
    # Exactly the fields of lib/types.ts CreditModel, no more and no fewer.
    assert set(model) == {"version", "trainedAt", "dataSource", "target", "intercept", "threshold", "thresholdScore", "pointsToDoubleOdds", "incomeImputation", "features"}
    for f in model["features"]:
        assert set(f) == {"key", "label", "source", "clip", "log1p", "mean", "std", "coef"}
        assert len(f["clip"]) == 2 and f["std"] > 0 and np.isfinite(f["coef"])

    # ---- the export reproduces the saved Python predictions ---------------------------------
    raw = load_raw()
    split = load_split(raw)
    y = raw[TARGET].to_numpy()
    with np.load(PREDICTIONS) as saved:
        saved = {k: saved[k] for k in saved.files}
    print("=== Phase 9: export to lib/model.json ===")
    print(f"features ({len(order)}): {order}")
    print(f"intercept {model['intercept']:+.6f}   cut-off {model['threshold']}")
    print(f"\nexported model vs saved Python predictions (tolerance {TOLERANCE:g})")
    worst = 0.0
    for part in PARTS:
        assert np.array_equal(saved[f"{part}_ids"], split[part])
        expected = saved[f"{part}_logistic"]
        digest = hashlib.sha256(np.ascontiguousarray(expected, dtype="<f8").tobytes()).hexdigest()
        assert digest == training["predictions"]["sha256"][part]["logistic"], f"{part}: predictions changed since Phase 6"
        got = score_from_json(model, meta, raw.iloc[split[part]])
        diff = np.abs(got - expected)
        worst = max(worst, float(diff.max()))
        decisions_agree = int(((got >= model["threshold"]) == (expected >= cutoff["selectedCutoff"])).sum())
        print(
            f"  {part:11s} rows={len(got):6,d}  max abs diff={diff.max():.3e}  mean abs diff={diff.mean():.3e}"
            f"  mismatches={int((diff >= TOLERANCE).sum())}  same decision={decisions_agree:,d}/{len(got):,d}"
        )
        assert np.isfinite(got).all() and diff.max() < TOLERANCE, f"{part}: export does not reproduce the Python model"
        assert decisions_agree == len(got)

        if part in ("validation", "test"):
            # The exported rule gives exactly the Phase 8 confusion matrix.
            stored = cutoff["validation" if part == "validation" else "testFinalConfirmation"]["atSelectedCutoff"]
            rejected, labels = got >= model["threshold"], y[split[part]]
            mine = (int((rejected & (labels == 1)).sum()), int((rejected & (labels == 0)).sum()), int((~rejected & (labels == 0)).sum()), int((~rejected & (labels == 1)).sum()))
            assert mine == (stored["truePositives"], stored["falsePositives"], stored["trueNegatives"], stored["falseNegatives"]), part
            print(f"              approved={int((~rejected).sum()):,d}  rejected={int(rejected.sum()):,d}  matches the Phase 8 confusion matrix")

    MODEL_OUT.write_text(text)
    META_OUT.write_text(meta_text)
    print(f"\nlargest difference over all 150,000 rows: {worst:.3e}")
    print(f"wrote {MODEL_OUT.relative_to(ROOT).as_posix()}, {META_OUT.relative_to(ROOT).as_posix()}")
    print("all verification checks passed")


if __name__ == "__main__":
    main()
