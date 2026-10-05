"""Phase 8: choose the approval cut-off for the Logistic Regression. Nothing is retrained.

An applicant is REJECTED when the predicted probability of default is at or above
the cut-off, and APPROVED when it is below.

The procedure, in this order:
    1. Build the candidate table from the VALIDATION predictions only.
    2. The chosen cut-off is the constant SELECTED_CUTOFF below. It was decided from
       the validation table and is frozen in code.
    3. Only then are the TEST predictions scored at that cut-off, as a final
       confirmation. The test numbers do not feed back into the choice.

Usage (from the repo root):
    python ml/select_cutoff.py

Output:
    ml/artifacts/phase8_cutoff.json

This module does not retrain, recalibrate, change model weights, or write lib/model.json.
"""

from __future__ import annotations

import hashlib
import json

import numpy as np
import pandas as pd

from preprocess import DATA_PATH, ROOT, TARGET, load_raw
from split import MANIFEST_OUT, SEED, file_sha256, load_split

TRAINING_REPORT = ROOT / "ml" / "artifacts" / "phase6_training.json"
EVALUATION_REPORT = ROOT / "ml" / "artifacts" / "phase7_evaluation.json"
PREDICTIONS = ROOT / "ml" / "artifacts" / "phase6_predictions.npz"
CUTOFF_OUT = ROOT / "ml" / "artifacts" / "phase8_cutoff.json"

# Round-number candidates spanning the range where a cut-off could sensibly sit.
# On validation the predictions run from 0.9% to 98%, with the median at 2.5%, the
# 75th percentile at 6.2% and the 95th at 25.7%, so the grid is dense from 3% to 20%
# and sparse beyond. 0.50 is included only to show why it is unsuitable.
CANDIDATE_GRID = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.15, 0.175, 0.20, 0.25, 0.30, 0.50]

# The four defensible options and what each one stands for.
SHORTLIST = {
    0.05: "Cautious lender: sits in the range that best balances catching defaulters against clearing good applicants (balanced accuracy).",
    0.08: "Reject the riskiest fifth: the approval policy the current app was built around (about 80% approved).",
    0.10: "One-in-ten rule: reject when estimated risk of serious delinquency reaches 10%.",
    0.15: "Lenient lender: sits in the range with the best precision/recall balance (F1), approving about nine in ten.",
}

# THE DECISION. Chosen from the validation table and frozen before the test set is scored.
SELECTED_CUTOFF = 0.10
RATIONALE = [
    "Natural break in the validation data: applicants scored 5-10% default at 8-10% whatever their exact score, "
    "while those scored 10-12% default at 13%, 12-15% at 19% and 15-20% at 21%. Risk starts climbing at 10%.",
    "Lowering the cut-off from 10% to 8% would reject 2,016 more validation applicants to stop 182 defaults: "
    "ten good applicants turned away for each default avoided, and mostly people with full credit cards but no late payments.",
    "Raising it from 10% to 15% would approve 1,256 more applicants who default at 15%, more than twice the population rate.",
    "It keeps a meaningful approved population (about 87%) while catching about 60% of defaulters and rejecting about 10% of good applicants.",
    "It is easy to explain: a one-in-ten estimated chance of serious delinquency.",
    "For recourse, about 31% of rejected applicants are within 5 percentage points of the line, so a meaningful share are genuinely borderline.",
]

# Declared before looking at the test set: validation and test are 'stable' at the
# frozen cut-off if they agree within these margins (roughly two standard errors).
STABILITY_TOLERANCE = {"approvalRate": 0.01, "specificity": 0.01, "recall": 0.03, "precision": 0.03}

BORDERLINE_WIDTHS = [0.01, 0.02, 0.05]


def metrics_at(y: np.ndarray, p: np.ndarray, threshold: float) -> dict:
    rejected = p >= threshold
    tp = int((rejected & (y == 1)).sum())  # defaulters rejected (caught)
    fp = int((rejected & (y == 0)).sum())  # good applicants rejected
    fn = int((~rejected & (y == 1)).sum())  # defaulters approved (missed)
    tn = int((~rejected & (y == 0)).sum())  # good applicants approved
    recall = tp / (tp + fn)
    specificity = tn / (tn + fp)
    precision = tp / (tp + fp) if tp + fp else None
    return {
        "threshold": float(threshold),
        "approvalRate": (tn + fn) / len(y),
        "rejectionRate": (tp + fp) / len(y),
        "applicantsRejected": tp + fp,
        "truePositives": tp,
        "falsePositives": fp,
        "trueNegatives": tn,
        "falseNegatives": fn,
        "defaultersCaught": tp,
        "goodApplicantsRejected": fp,
        "recall": recall,
        "precision": precision,
        "specificity": specificity,
        "falsePositiveRate": 1 - specificity,
        "balancedAccuracy": (recall + specificity) / 2,
        "f1": 2 * tp / (2 * tp + fp + fn),
        "defaultRateAmongApproved": fn / (fn + tn),
        "goodRejectedPerDefaulterCaught": fp / tp if tp else None,
    }


def best_threshold(y: np.ndarray, p: np.ndarray, key: str) -> float:
    """The observed score that maximises a metric (used to anchor the shortlist)."""
    grid = np.unique(np.round(np.quantile(p, np.linspace(0.30, 0.995, 400)), 6))
    return float(max(grid, key=lambda t: metrics_at(y, p, t)[key]))


def marginal_bands(y: np.ndarray, p: np.ndarray, edges: list[float]) -> list[dict]:
    """Applicants between neighbouring cut-offs: the people a small move would affect."""
    rows = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & (p < hi)
        rows.append(
            {
                "from": lo,
                "to": hi,
                "applicants": int(m.sum()),
                "defaults": int(y[m].sum()),
                "observedDefaultRate": float(y[m].mean()) if m.any() else None,
                "meanPredicted": float(p[m].mean()) if m.any() else None,
            }
        )
    return rows


def borderline(y: np.ndarray, p: np.ndarray, cutoff: float) -> dict:
    rejected_total = int((p >= cutoff).sum())
    out = {}
    for w in BORDERLINE_WIDTHS:
        just_rejected = (p >= cutoff) & (p <= cutoff + w)
        just_approved = (p < cutoff) & (p >= cutoff - w)
        out[f"within{int(round(w * 100))}pp"] = {
            "total": int(just_rejected.sum() + just_approved.sum()),
            "rejectedSide": int(just_rejected.sum()),
            "approvedSide": int(just_approved.sum()),
            "rejectedSideShareOfAllRejected": float(just_rejected.sum() / rejected_total),
            "rejectedSideObservedDefaultRate": float(y[just_rejected].mean()) if just_rejected.any() else None,
            "approvedSideObservedDefaultRate": float(y[just_approved].mean()) if just_approved.any() else None,
        }
    return out


def load_part(part: str, raw: pd.DataFrame, split: dict, training: dict) -> tuple[np.ndarray, np.ndarray]:
    """Labels and Logistic Regression probabilities for one part, checked against Phase 6."""
    with np.load(PREDICTIONS) as saved:
        ids, p = saved[f"{part}_ids"], saved[f"{part}_logistic"]
    assert np.array_equal(ids, split[part]), f"{part}: prediction rows are not the saved split"
    digest = hashlib.sha256(np.ascontiguousarray(p, dtype="<f8").tobytes()).hexdigest()
    assert digest == training["predictions"]["sha256"][part]["logistic"], f"{part}: predictions changed since Phase 6"
    return raw[TARGET].to_numpy()[ids], p


def main() -> None:
    training = json.loads(TRAINING_REPORT.read_text())
    evaluation = json.loads(EVALUATION_REPORT.read_text())
    manifest = json.loads(MANIFEST_OUT.read_text())
    if file_sha256(DATA_PATH) != training["dataset"]["sha256"]:
        raise ValueError("data/cs-training.csv is not the file the Phase 6 models were trained on")
    assert training["primaryModel"] == "logisticRegression"
    raw = load_raw()
    split = load_split(raw)

    # ---- 1. candidates: VALIDATION only ---------------------------------------------------
    y_val, p_val = load_part("validation", raw, split, training)
    anchors = {
        "maxBalancedAccuracy": best_threshold(y_val, p_val, "balancedAccuracy"),
        "maxF1": best_threshold(y_val, p_val, "f1"),
        "approve80Percent": float(np.quantile(p_val, 0.80)),
        "approve85Percent": float(np.quantile(p_val, 0.85)),
        "approve90Percent": float(np.quantile(p_val, 0.90)),
        "validationDefaultRate": float(y_val.mean()),
    }
    candidates = [metrics_at(y_val, p_val, t) for t in CANDIDATE_GRID]
    anchor_rows = {name: metrics_at(y_val, p_val, t) for name, t in anchors.items()}
    bands = marginal_bands(y_val, p_val, [0.0, 0.03, 0.05, 0.08, 0.10, 0.12, 0.15, 0.20, 0.30, 1.0])
    shortlist = {f"{t:.2f}": {"standsFor": why, **metrics_at(y_val, p_val, t)} for t, why in SHORTLIST.items()}

    # ---- 2. the frozen decision ---------------------------------------------------------------
    assert SELECTED_CUTOFF in SHORTLIST and SELECTED_CUTOFF in CANDIDATE_GRID
    cutoff = SELECTED_CUTOFF
    selected_validation = metrics_at(y_val, p_val, cutoff)
    borderline_validation = borderline(y_val, p_val, cutoff)

    # ---- 3. FINAL CONFIRMATION on test, at the frozen cut-off only -----------------------------
    y_test, p_test = load_part("test", raw, split, training)
    confirmation = metrics_at(y_test, p_test, cutoff)
    borderline_test = borderline(y_test, p_test, cutoff)

    differences = {k: confirmation[k] - selected_validation[k] for k in ("approvalRate", "rejectionRate", "recall", "precision", "specificity", "falsePositiveRate", "f1", "balancedAccuracy")}
    within = {k: abs(differences[k]) <= tol for k, tol in STABILITY_TOLERANCE.items()}
    stable = all(within.values())

    # ---- sanity ----------------------------------------------------------------------------
    for m, y in ((selected_validation, y_val), (confirmation, y_test)):
        assert m["truePositives"] + m["falsePositives"] + m["trueNegatives"] + m["falseNegatives"] == len(y) == 30_000
        assert m["truePositives"] + m["falseNegatives"] == int(y.sum())
        assert abs(m["approvalRate"] + m["rejectionRate"] - 1) < 1e-12
    # The Phase 7 reference matrix at 0.50 must be reproduced exactly by this code.
    ref = evaluation["results"]["logisticRegression"]["validation"]["confusionAtReferenceThresholds"]["conventional_0.50"]
    at_half = metrics_at(y_val, p_val, 0.50)
    assert (at_half["truePositives"], at_half["falsePositives"]) == (ref["truePositive"], ref["falsePositive"])

    CUTOFF_OUT.write_text(
        json.dumps(
            {
                "phase": 8,
                "model": "logisticRegression",
                "rule": "reject when predicted probability of default >= cutoff; approve when below",
                "selectedCutoff": cutoff,
                "selectedOn": "validation",
                "rationale": RATIONALE,
                "probabilitiesRecalibrated": False,
                "calibrationNote": "Phase 7 found the model understates risk a little in the 5-40% range. "
                "The cut-off was therefore judged on observed default rates, not on the stated probability alone.",
                "validation": {
                    "predictionRange": {q: float(np.quantile(p_val, v)) for q, v in (("min", 0), ("p25", 0.25), ("median", 0.5), ("p75", 0.75), ("p90", 0.9), ("p95", 0.95), ("max", 1))},
                    "candidates": candidates,
                    "dataDrivenAnchors": anchor_rows,
                    "marginalBands": bands,
                    "shortlist": shortlist,
                    "atSelectedCutoff": selected_validation,
                    "borderline": borderline_validation,
                },
                "testFinalConfirmation": {
                    "note": "Scored once at the frozen cut-off. Not used to choose or adjust the cut-off.",
                    "atSelectedCutoff": confirmation,
                    "borderline": borderline_test,
                },
                "stability": {
                    "testMinusValidation": differences,
                    "tolerance": STABILITY_TOLERANCE,
                    "withinTolerance": within,
                    "stable": stable,
                },
                "references": {
                    "split": {"manifest": MANIFEST_OUT.relative_to(ROOT).as_posix(), "ids": manifest["idsFile"], "seed": manifest["seed"]},
                    "trainingReport": TRAINING_REPORT.relative_to(ROOT).as_posix(),
                    "predictions": PREDICTIONS.relative_to(ROOT).as_posix(),
                    "evaluation": EVALUATION_REPORT.relative_to(ROOT).as_posix(),
                    "datasetSha256": training["dataset"]["sha256"],
                    "predictionsSha256": {part: training["predictions"]["sha256"][part]["logistic"] for part in ("validation", "test")},
                },
                "modelInfo": {
                    "estimator": training["logisticRegression"]["estimator"],
                    "features": training["features"]["order"],
                    "intercept": training["logisticRegression"]["intercept"],
                    "coefficients": training["logisticRegression"]["coefficients"],
                    "seed": SEED,
                    "versions": training["versions"],
                },
            },
            indent=2,
        )
        + "\n"
    )

    # ---- console report --------------------------------------------------------------------
    pd.set_option("display.width", 250)
    cols = ["threshold", "approvalRate", "rejectionRate", "applicantsRejected", "truePositives", "falsePositives", "trueNegatives", "falseNegatives",
            "recall", "precision", "specificity", "falsePositiveRate", "balancedAccuracy", "f1"]
    short = {"approvalRate": "approve", "rejectionRate": "reject", "applicantsRejected": "rejected", "truePositives": "TP", "falsePositives": "FP", "trueNegatives": "TN",
             "falseNegatives": "FN", "falsePositiveRate": "FPR", "balancedAccuracy": "balAcc", "specificity": "spec"}
    fmt = lambda v: f"{v:.4f}"  # noqa: E731
    print("=== Phase 8: cut-off selection (Logistic Regression) ===")
    print("\nVALIDATION candidates (30,000 applicants, 2,005 defaulters)")
    print(pd.DataFrame(candidates)[cols].rename(columns=short).to_string(index=False, float_format=fmt))
    print("\nVALIDATION data-driven anchors")
    print(pd.DataFrame(anchor_rows).T[cols].rename(columns=short).to_string(float_format=fmt))
    print("\nVALIDATION applicants between neighbouring cut-offs")
    print(pd.DataFrame(bands).to_string(index=False, float_format=fmt))
    print("\nVALIDATION shortlist")
    print(pd.DataFrame(shortlist).T[cols + ["defaultRateAmongApproved", "goodRejectedPerDefaulterCaught"]].rename(columns=short).to_string(float_format=fmt))

    print(f"\nSELECTED CUT-OFF (frozen): {cutoff:.2f}")
    print("\nTEST: FINAL CONFIRMATION at the frozen cut-off (not used for selection)")
    side = pd.DataFrame({"validation": selected_validation, "test": confirmation, "test - validation": {k: confirmation[k] - selected_validation[k] for k in selected_validation if k != "threshold"}})
    print(side.drop(index="threshold").to_string(float_format=fmt))
    print(f"\nstability within tolerance: {within} -> stable = {stable}")

    print("\nborderline applicants around the cut-off")
    for name, b in (("validation", borderline_validation), ("test", borderline_test)):
        print(f"  {name}")
        print("  " + pd.DataFrame(b).T.to_string(float_format=fmt).replace("\n", "\n  "))
    print(f"\nwrote {CUTOFF_OUT.relative_to(ROOT).as_posix()}")
    print("all verification checks passed")


if __name__ == "__main__":
    main()
