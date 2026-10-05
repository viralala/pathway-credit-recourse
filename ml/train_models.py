"""Phase 6: train the shipped Logistic Regression and a Gradient Boosting benchmark.

Both models use the saved 60/20/20 split and the 10 approved features, with every
preprocessing statistic fitted on the training rows only (ml/split.py, ml/features.py).

    Logistic Regression   PRIMARY. Additive and explainable: one weight per feature,
                          which the recourse engine depends on. This is the model that
                          will be shipped.
    Gradient Boosting     BENCHMARK ONLY. Shows how much accuracy a non-explainable
                          model could add. It is never shipped, whatever it scores.

Usage (from the repo root):
    python ml/train_models.py

Outputs:
    ml/artifacts/phase6_training.json      configurations, intercept, coefficients,
                                           probability summaries, split and versions
    ml/artifacts/phase6_predictions.npz    row ids and both models' predicted
                                           probabilities for every row, per part

This module replaces the training path of ml/train.py (old cleaning, includes age,
75/25 split), which it neither imports nor runs. It does not compute evaluation
metrics, choose a cut-off, or write lib/model.json or public/metrics.json.
"""

from __future__ import annotations

import hashlib
import json
import platform
import sys

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression

from features import MODEL_FEATURE_KEYS, FeatureBuilder
from preprocess import DATA_PATH, ROOT, TARGET, load_raw
from split import MANIFEST_OUT, PARTS, SEED, file_sha256, load_split

REPORT_OUT = ROOT / "ml" / "artifacts" / "phase6_training.json"
PREDICTIONS_OUT = ROOT / "ml" / "artifacts" / "phase6_predictions.npz"

# The feature set and order approved in Phase 4. Checked against ml/features.py so a
# later edit there cannot silently change what the model is trained on.
APPROVED_FEATURES = [
    "utilization",
    "late30",
    "late60",
    "late90",
    "lateSpecialCode",
    "monthlyIncome",
    "debtRatio",
    "openCreditLines",
    "incomeMissing",
    "incomePlaceholder",
]

# Logistic Regression: scikit-learn's standard settings, stated explicitly, no tuning.
#   l1_ratio=0, C=1   plain L2 penalty at the default strength. With 90,000 rows and
#                     10 standardized features it barely moves the weights; it is
#                     there for numerical stability.
#   class_weight=None the 6.7% default rate is NOT rebalanced. Rebalancing would
#                     inflate every predicted probability; the imbalance is handled
#                     later by where the cut-off is placed.
#   solver=lbfgs      exact and deterministic for a problem this size.
#   max_iter=1000     headroom only; convergence is asserted below.
LOGISTIC_PARAMS = {
    "l1_ratio": 0.0,
    "C": 1.0,
    "class_weight": None,
    "fit_intercept": True,
    "solver": "lbfgs",
    "max_iter": 1000,
    "tol": 1e-4,
    "random_state": SEED,
}

# Gradient Boosting: scikit-learn's defaults plus a seed. Deliberately not tuned.
BOOSTING_PARAMS = {
    "n_estimators": 100,
    "learning_rate": 0.1,
    "max_depth": 3,
    "subsample": 1.0,
    "min_samples_leaf": 1,
    "random_state": SEED,
}


def probability_summary(p: np.ndarray) -> dict[str, float]:
    q = np.quantile(p, [0.01, 0.05, 0.25, 0.50, 0.75, 0.95, 0.99])
    return {
        "n": int(len(p)),
        "min": float(p.min()),
        "p01": float(q[0]),
        "p05": float(q[1]),
        "p25": float(q[2]),
        "median": float(q[3]),
        "mean": float(p.mean()),
        "p75": float(q[4]),
        "p95": float(q[5]),
        "p99": float(q[6]),
        "max": float(p.max()),
        "std": float(p.std()),
    }


def array_sha256(a: np.ndarray) -> str:
    return hashlib.sha256(np.ascontiguousarray(a, dtype="<f8").tobytes()).hexdigest()


def train(x: pd.DataFrame, y: np.ndarray) -> tuple[LogisticRegression, GradientBoostingClassifier]:
    logistic = LogisticRegression(**LOGISTIC_PARAMS).fit(x.to_numpy(), y)
    boosting = GradientBoostingClassifier(**BOOSTING_PARAMS).fit(x.to_numpy(), y)
    return logistic, boosting


def main() -> None:
    assert MODEL_FEATURE_KEYS == APPROVED_FEATURES, "ml/features.py no longer matches the approved feature set"

    # ---- data and the saved split -----------------------------------------------------
    manifest = json.loads(MANIFEST_OUT.read_text())
    data_sha = file_sha256(DATA_PATH)
    if data_sha != manifest["dataset"]["sha256"]:
        raise ValueError("data/cs-training.csv is not the file the saved split was made from")
    raw = load_raw()
    split = load_split(raw)
    frames = {part: raw.iloc[split[part]] for part in PARTS}
    y = {part: frames[part][TARGET].to_numpy() for part in PARTS}

    all_ids = np.concatenate([split[part] for part in PARTS])
    assert len(np.unique(all_ids)) == len(all_ids) == len(raw), "split parts overlap or miss rows"
    assert [len(split[part]) for part in PARTS] == [90_000, 30_000, 30_000]

    # ---- features: every statistic from the training rows only ------------------------
    builder = FeatureBuilder().fit(frames["train"])
    assert builder.to_dict() == manifest["featureBuilder"], "feature statistics differ from the Phase 5 manifest"
    x = {part: builder.transform(frames[part]) for part in PARTS}
    for part in PARTS:
        assert list(x[part].columns) == APPROVED_FEATURES, part
        assert x[part].shape == (len(split[part]), 10) and np.isfinite(x[part].to_numpy()).all(), part
        assert TARGET not in x[part].columns

    # ---- train: both models see the same training matrix and nothing else -------------
    logistic, boosting = train(x["train"], y["train"])
    assert logistic.n_iter_[0] < LOGISTIC_PARAMS["max_iter"], "Logistic Regression did not converge"
    assert logistic.coef_.shape == (1, 10) and logistic.intercept_.shape == (1,)
    assert list(logistic.classes_) == [0, 1] and list(boosting.classes_) == [0, 1]

    predictions = {
        part: {
            "logistic": logistic.predict_proba(x[part].to_numpy())[:, 1],
            "boosting": boosting.predict_proba(x[part].to_numpy())[:, 1],
        }
        for part in PARTS
    }
    coefficients = {key: float(c) for key, c in zip(APPROVED_FEATURES, logistic.coef_[0])}
    intercept = float(logistic.intercept_[0])

    # ---- verification -----------------------------------------------------------------
    # The Logistic Regression is exactly intercept + sum(weight x feature): recompute
    # the probabilities by hand from the recorded numbers.
    for part in PARTS:
        z = intercept + x[part].to_numpy() @ np.array([coefficients[k] for k in APPROVED_FEATURES])
        assert np.allclose(1 / (1 + np.exp(-z)), predictions[part]["logistic"], rtol=0, atol=1e-12), part
        for name in ("logistic", "boosting"):
            p = predictions[part][name]
            assert p.shape == (len(split[part]),) and np.isfinite(p).all() and (p > 0).all() and (p < 1).all()
    # A fitted logistic model with an intercept reproduces the training default rate
    # on average. (A property of the fit, not an evaluation of the model.)
    assert abs(predictions["train"]["logistic"].mean() - y["train"].mean()) < 1e-3

    # Reproducible: training again from scratch gives the same models.
    logistic_2, boosting_2 = train(x["train"], y["train"])
    assert np.array_equal(logistic.coef_, logistic_2.coef_) and np.array_equal(logistic.intercept_, logistic_2.intercept_)
    assert np.array_equal(predictions["test"]["boosting"], boosting_2.predict_proba(x["test"].to_numpy())[:, 1])

    # No leakage from held-out rows: overwrite every validation and test row, features
    # and labels, then redo everything. The trained models must be identical.
    corrupted = raw.copy()
    held_out = np.concatenate([split["validation"], split["test"]])
    for col in corrupted.columns:
        corrupted.iloc[held_out, corrupted.columns.get_loc(col)] = 1.0 if col == TARGET else 987_654.0
    c_train = corrupted.iloc[split["train"]]
    c_builder = FeatureBuilder().fit(c_train)
    c_logistic, c_boosting = train(c_builder.transform(c_train), c_train[TARGET].to_numpy())
    assert c_builder.to_dict() == builder.to_dict()
    assert np.array_equal(c_logistic.coef_, logistic.coef_) and np.array_equal(c_logistic.intercept_, logistic.intercept_)
    assert np.array_equal(c_boosting.predict_proba(x["test"].to_numpy()), boosting.predict_proba(x["test"].to_numpy()))

    # The old training path was not used.
    assert "train" not in sys.modules, "ml/train.py was imported"

    # ---- save ---------------------------------------------------------------------------
    arrays = {}
    for part in PARTS:
        arrays[f"{part}_ids"] = split[part].astype(np.int32)
        arrays[f"{part}_logistic"] = predictions[part]["logistic"]
        arrays[f"{part}_boosting"] = predictions[part]["boosting"]
    PREDICTIONS_OUT.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(PREDICTIONS_OUT, **arrays)

    report = {
        "phase": 6,
        "primaryModel": "logisticRegression",
        "benchmarkModel": "gradientBoosting",
        "note": "Logistic Regression is the model to be shipped. Gradient Boosting is a benchmark only. "
        "No evaluation metrics and no cut-off are computed in this phase.",
        "dataset": {"file": manifest["dataset"]["file"], "sha256": data_sha},
        "target": TARGET,
        "split": {
            "source": "ml/artifacts/split_manifest.json + split_ids.npz via load_split()",
            "seed": manifest["seed"],
            "parts": {
                part: {
                    "rows": int(len(split[part])),
                    "defaults": int(y[part].sum()),
                    "defaultRate": float(y[part].mean()),
                    "idsSha256": manifest["parts"][part]["idsSha256"],
                }
                for part in PARTS
            },
        },
        "features": {
            "order": APPROVED_FEATURES,
            "count": len(APPROVED_FEATURES),
            "fittedOn": "train",
            "preparation": builder.to_dict(),
        },
        "logisticRegression": {
            "role": "primary / shipped",
            "estimator": "sklearn.linear_model.LogisticRegression",
            "params": logistic.get_params(),
            "iterations": int(logistic.n_iter_[0]),
            "converged": True,
            "inputScale": "standardized features: each coefficient is the change in log-odds of default per 1 training standard deviation",
            "intercept": intercept,
            "coefficients": coefficients,
        },
        "gradientBoosting": {
            "role": "benchmark only, never shipped",
            "estimator": "sklearn.ensemble.GradientBoostingClassifier",
            "params": boosting.get_params(),
            "trees": int(boosting.n_estimators_),
        },
        "predictedProbability": {
            name: {part: probability_summary(predictions[part][key]) for part in PARTS}
            for name, key in (("logisticRegression", "logistic"), ("gradientBoosting", "boosting"))
        },
        "predictions": {
            "file": PREDICTIONS_OUT.relative_to(ROOT).as_posix(),
            "layout": "<part>_ids, <part>_logistic, <part>_boosting for part in train/validation/test; "
            "ids are 0-based CSV row positions, values are P(SeriousDlqin2yrs = 1). "
            "Labels are not stored: read them from the CSV by row id.",
            "sha256": {
                part: {"logistic": array_sha256(predictions[part]["logistic"]), "boosting": array_sha256(predictions[part]["boosting"])}
                for part in PARTS
            },
        },
        "seed": SEED,
        "versions": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit-learn": sklearn.__version__,
        },
    }
    REPORT_OUT.write_text(json.dumps(report, indent=2) + "\n")

    # ---- console report -----------------------------------------------------------------
    print("=== Phase 6: model training ===")
    print(f"split seed {manifest['seed']}, loaded with load_split(); statistics fitted on train only")
    for part in PARTS:
        print(f"  {part:11s} X={x[part].shape}  defaults={int(y[part].sum()):5,d}  rate={y[part].mean():.4%}")
    print(f"features ({len(APPROVED_FEATURES)}): {APPROVED_FEATURES}")

    print("\nLogistic Regression (primary / shipped)")
    print(f"  params     : {logistic.get_params()}")
    print(f"  iterations : {int(logistic.n_iter_[0])} (converged)")
    print(f"  intercept  : {intercept:+.6f}")
    for key in APPROVED_FEATURES:
        print(f"  {key:18s} {coefficients[key]:+.6f}")

    print("\nGradient Boosting (benchmark only)")
    print(f"  params     : {boosting.get_params()}")

    print("\npredicted probability of default:")
    rows = []
    for name, key in (("logistic", "logistic"), ("boosting", "boosting")):
        for part in PARTS:
            rows.append({"model": name, "part": part, **probability_summary(predictions[part][key])})
    table = pd.DataFrame(rows).set_index(["model", "part"]).drop(columns=["n", "p01", "p05"])
    print(table.to_string(float_format=lambda v: f"{v:.4f}"))

    print(f"\nwrote {REPORT_OUT.relative_to(ROOT).as_posix()}, {PREDICTIONS_OUT.relative_to(ROOT).as_posix()}")
    print("all verification checks passed")


if __name__ == "__main__":
    main()
