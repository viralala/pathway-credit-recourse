"""Phase 10: write the raw test applicants and their Python predictions for the TypeScript parity check.

The web app scores applicants in TypeScript (lib/model.ts). To prove it gives the same
answer as the Python model on RAW inputs (missing incomes, 96/98 codes, out-of-range
values and all), this script writes every test-split applicant exactly as it appears in
data/cs-training.csv, next to the probability and decision the Python model gave it.
scripts/parity.ts then scores the same rows with the app's code and compares.

Nothing is trained and nothing is recomputed into the model:

    probabilities   read from ml/artifacts/phase6_predictions.npz (checked against the
                    fingerprint in phase6_training.json), and re-derived here from the raw
                    rows through ml/features.py + the stored coefficients as a cross-check
    decision rule   ml/select_cutoff.py: reject when probability >= cut-off, approve below
    cut-off         ml/artifacts/phase8_cutoff.json (0.10)

Usage (from the repo root):
    python ml/export_parity.py
    npx tsx scripts/parity.ts

Output:
    data/parity_test.json   30,000 raw test applicants + Python probability and decision,
                            plus decisions for probabilities at and next to the cut-off.
                            It holds raw Kaggle rows, so it lives in data/ (git-ignored).
"""

from __future__ import annotations

import hashlib
import json
import math

import numpy as np

from features import MODEL_FEATURE_KEYS, FeatureBuilder
from preprocess import DATA_PATH, RAW_TO_KEY, ROOT, load_raw
from split import file_sha256, load_split

TRAINING_REPORT = ROOT / "ml" / "artifacts" / "phase6_training.json"
CUTOFF_REPORT = ROOT / "ml" / "artifacts" / "phase8_cutoff.json"
PREDICTIONS = ROOT / "ml" / "artifacts" / "phase6_predictions.npz"
OUT = ROOT / "data" / "parity_test.json"

PART = "test"
# What the app's applicant carries, plus age: the model does not use age, the fairness
# audit (scripts/evaluate.ts) groups by it.
EXPORTED_KEYS = ["utilization", "late30", "late60", "late90", "monthlyIncome", "debtRatio", "openCreditLines", "age"]


def approves(probability: np.ndarray, cutoff: float) -> np.ndarray:
    """The Phase 8 rule (ml/select_cutoff.py `metrics_at`): rejected = p >= cutoff."""
    return ~(probability >= cutoff)


def main() -> None:
    training = json.loads(TRAINING_REPORT.read_text())
    cutoff_report = json.loads(CUTOFF_REPORT.read_text())
    if file_sha256(DATA_PATH) != training["dataset"]["sha256"]:
        raise ValueError("data/cs-training.csv is not the file the Phase 6 model was trained on")
    cutoff = cutoff_report["selectedCutoff"]
    assert cutoff == 0.10 and cutoff_report["model"] == "logisticRegression"

    raw = load_raw()
    ids = load_split(raw)[PART]
    rows = raw.iloc[ids]

    with np.load(PREDICTIONS) as saved:
        assert np.array_equal(saved[f"{PART}_ids"], ids)
        probability = saved[f"{PART}_logistic"].astype(float)
    digest = hashlib.sha256(np.ascontiguousarray(probability, dtype="<f8").tobytes()).hexdigest()
    assert digest == training["predictions"]["sha256"][PART]["logistic"], "predictions changed since Phase 6"

    # Cross-check: the saved predictions are what the raw rows give through the Python
    # cleaning + feature code and the stored coefficients.
    lr = training["logisticRegression"]
    x = FeatureBuilder.from_dict(training["features"]["preparation"]).transform(rows)
    assert list(x.columns) == MODEL_FEATURE_KEYS == training["features"]["order"]
    z = lr["intercept"] + x.to_numpy() @ np.array([lr["coefficients"][k] for k in MODEL_FEATURE_KEYS])
    rederived = 1 / (1 + np.exp(-z))
    assert np.abs(rederived - probability).max() < 1e-12, "raw rows no longer reproduce the saved predictions"

    approved = approves(probability, cutoff)
    stored = cutoff_report["testFinalConfirmation"]["atSelectedCutoff"]
    assert int((~approved).sum()) == stored["applicantsRejected"], "decisions differ from the Phase 8 report"

    key_to_raw = {key: raw_col for raw_col, key in RAW_TO_KEY.items()}
    columns = {key: rows[key_to_raw[key]].to_numpy(dtype=float) for key in EXPORTED_KEYS}
    applicants = []
    for i, row_id in enumerate(ids):
        record = {"id": int(row_id)}
        for key in EXPORTED_KEYS:
            v = float(columns[key][i])
            record[key] = None if math.isnan(v) else v  # null = not provided
        record["pythonProbability"] = float(probability[i])
        record["pythonApproved"] = bool(approved[i])
        applicants.append(record)

    # The rule itself, at and immediately around the cut-off.
    edge = [float(np.nextafter(cutoff, 0)), cutoff, float(np.nextafter(cutoff, 1)), 0.0999999, 0.1000001, 0.0, 1.0]
    boundary = [{"probability": p, "pythonApproved": bool(approves(np.array([p]), cutoff)[0])} for p in edge]
    assert [b["pythonApproved"] for b in boundary] == [True, False, False, True, False, True, False]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "part": PART,
                "rows": len(applicants),
                "cutoff": cutoff,
                "rule": cutoff_report["rule"],
                "datasetSha256": training["dataset"]["sha256"],
                "predictionsSha256": digest,
                "boundary": boundary,
                "applicants": applicants,
            }
        )
        + "\n"
    )

    missing_income = int(np.isnan(columns["monthlyIncome"]).sum())
    print("=== Phase 10: parity export ===")
    print(f"part {PART}: {len(applicants):,} raw applicants ({missing_income:,} with no income), cut-off {cutoff}")
    print(f"approved {int(approved.sum()):,}  rejected {int((~approved).sum()):,}  (matches the Phase 8 report)")
    print(f"raw rows reproduce the saved predictions to {np.abs(rederived - probability).max():.1e}")
    print(f"wrote {OUT.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
