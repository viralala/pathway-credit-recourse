"""Phase 4 feature preparation: cleaned data -> the 10 model-ready features.

Sits on top of ml/preprocess.py. One object does the whole raw -> model-input path:

    fb = FeatureBuilder().fit(train_raw)   # learns medians, means, stds from TRAINING rows only
    x_train = fb.transform(train_raw)      # then the same frozen numbers everywhere:
    x_valid = fb.transform(valid_raw)
    x_test = fb.transform(test_raw)
    x_new = fb.transform_one({...})        # a single applicant from the app

    fb.to_dict() / FeatureBuilder.from_dict()   # JSON round trip

Steps, in order:
    1. clean          ml/preprocess.py (special codes, missing values, invalid values)
    2. select         keep the 10 approved features, drop the rest
    3. floor and cap  fixed limits where risk stops changing or values stop being trustworthy
    4. log1p          for features where the first unit matters far more than later ones
    5. standardize    (value - training mean) / training std

Usage (from the repo root):
    python ml/features.py   # builds the features for data/cs-training.csv and verifies them

This module does not split data, train a model, or write model.json.
"""

from __future__ import annotations

import json
from typing import Any, Mapping, NamedTuple

import numpy as np
import pandas as pd

from preprocess import DEBT_RATIO_CAP, RAW_COLUMNS, TARGET, UTILIZATION_CAP, Preprocessor, load_raw


class FeatureSpec(NamedTuple):
    key: str
    cap: float | None  # values are clipped to [floor, cap]; None = no cap (0/1 flags)
    log1p: bool  # apply log(1 + x) after capping
    floor: float = 0.0


# The approved feature set for the shipped Logistic Regression model.
MODEL_FEATURES = [
    # Strongest feature. Already capped at 1.5 by the cleaning step (same constant).
    FeatureSpec("utilization", UTILIZATION_CAP, False),
    # The three late-payment counts stay separate so the model learns its own severity
    # weight for each. The first late event moves risk far more than the fifth, hence
    # log1p; counts above 5 are rare and add nothing, hence the cap.
    FeatureSpec("late30", 5.0, True),
    FeatureSpec("late60", 5.0, True),
    FeatureSpec("late90", 5.0, True),
    # 1 when the late counts were a 96/98 bureau code (those rows default at ~55%).
    FeatureSpec("lateSpecialCode", None, False),
    # Very skewed (max 3 million); risk stops falling above 25,000.
    # Incomes of 2-999 (1.5% of rows) are kept as real incomes, not placeholders, but
    # they default far less than a low income should (6.2% vs 10.8% at 1,000-1,499) and
    # after the log an income of 2 sits 12 standard deviations out. Flooring at 1,000
    # stops those rows dragging the income weight. The floor runs after the cleaning
    # step, so missing and 0/1 incomes have already become the training median, and it
    # touches only this feature: the row's debtRatio is left alone.
    FeatureSpec("monthlyIncome", 25_000.0, True, floor=1_000.0),
    # Already capped at 2.0 by the cleaning step (same constant).
    FeatureSpec("debtRatio", DEBT_RATIO_CAP, False),
    # All the signal is between 0 and 5 open lines; flat above that.
    FeatureSpec("openCreditLines", 5.0, False),
    # Income flags: keep imputed rows from distorting the income and debt-ratio weights.
    FeatureSpec("incomeMissing", None, False),
    FeatureSpec("incomePlaceholder", None, False),
]
MODEL_FEATURE_KEYS = [f.key for f in MODEL_FEATURES]

# Produced by the cleaning step but deliberately NOT given to the shipped model.
EXCLUDED_FEATURES = {
    "age": "non-actionable and sensitive; Pathway's decision must rest on things a borrower can change",
    "dependents": "weak, sensitive (family status), non-actionable",
    "realEstateLoans": "U-shaped so a linear model cannot use it; overlaps debtRatio and openCreditLines",
    "debtRatioUnreliable": "exactly incomeMissing + incomePlaceholder, so it is redundant",
    "dependentsMissing": "weak; every such row is already covered by incomeMissing",
    "utilizationInvalid": "no relationship with default (7.05% vs 6.68%)",
}


class FeatureBuilder:
    """Raw Kaggle-format rows -> the 10 standardized model features."""

    def __init__(self) -> None:
        self.preprocessor = Preprocessor()
        self.mean_: dict[str, float] | None = None
        self.std_: dict[str, float] | None = None

    def _check_fitted(self) -> None:
        if self.mean_ is None or self.std_ is None:
            raise RuntimeError("FeatureBuilder is not fitted; call fit(train) first")

    # ---- fit: the only place statistics are learned -------------------------------

    def fit(self, train: pd.DataFrame) -> "FeatureBuilder":
        """Learn every statistic. Pass TRAINING rows only, never validation/test rows."""
        self.preprocessor.fit(train)
        x = self._prepare(train)
        std = x.std(ddof=0)
        # A column that is constant in the training rows has std 0; dividing by 1
        # instead leaves it at 0 after centring rather than producing NaN.
        std = std.where(std > 0, 1.0)
        self.mean_ = {k: float(x[k].mean()) for k in MODEL_FEATURE_KEYS}
        self.std_ = {k: float(std[k]) for k in MODEL_FEATURE_KEYS}
        return self

    # ---- transform: frozen rules, no learning -------------------------------------

    def _prepare(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean, select, floor, cap and log. Everything except standardization."""
        clean = self.preprocessor.transform(df)
        out = pd.DataFrame(index=clean.index)
        for spec in MODEL_FEATURES:
            col = clean[spec.key].astype(float)
            if spec.cap is not None:
                col = col.clip(lower=spec.floor, upper=spec.cap)
            if spec.log1p:
                col = np.log1p(col)
            out[spec.key] = col
        return out

    def prepare(self, df: pd.DataFrame) -> pd.DataFrame:
        """The 10 features after cleaning, floor, cap and log, before standardization."""
        self._check_fitted()
        return self._prepare(df)

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """The 10 standardized features the model consumes. Never drops a row."""
        self._check_fitted()
        x = self._prepare(df)
        for key in MODEL_FEATURE_KEYS:
            x[key] = (x[key] - self.mean_[key]) / self.std_[key]
        return x

    def transform_one(self, applicant: Mapping[str, Any]) -> dict[str, float]:
        """Features for a single applicant given as {raw Kaggle column: value}. None = missing."""
        row = pd.DataFrame([{c: applicant.get(c) for c in RAW_COLUMNS}])
        return self.transform(row).iloc[0].to_dict()

    # ---- persistence ----------------------------------------------------------------

    def to_dict(self) -> dict[str, Any]:
        self._check_fitted()
        return {
            "preprocessor": self.preprocessor.to_dict(),
            "features": [
                {
                    "key": spec.key,
                    "floor": spec.floor,
                    "cap": spec.cap,
                    "log1p": spec.log1p,
                    "mean": self.mean_[spec.key],
                    "std": self.std_[spec.key],
                }
                for spec in MODEL_FEATURES
            ],
        }

    @classmethod
    def from_dict(cls, state: Mapping[str, Any]) -> "FeatureBuilder":
        fb = cls()
        fb.preprocessor = Preprocessor.from_dict(state["preprocessor"])
        fb.mean_ = {f["key"]: float(f["mean"]) for f in state["features"]}
        fb.std_ = {f["key"]: float(f["std"]) for f in state["features"]}
        return fb


def main() -> None:
    raw = load_raw()

    # No train/validation/test split exists yet (that is Phase 5), so this run fits on
    # every row purely to exercise the code. These statistics are NOT the final ones:
    # once the split exists, fit() must be called on the training split only.
    fb = FeatureBuilder().fit(raw)
    prepared = fb.prepare(raw)
    x = fb.transform(raw)

    print("=== Phase 4: model feature report ===")
    print(f"rows in / out : {len(raw):,} / {len(x):,}")
    print(f"model features ({x.shape[1]}): {list(x.columns)}")
    print(f"excluded      : {sorted(EXCLUDED_FEATURES)}")

    print("\nper-feature treatment and statistics (demo fit on all rows, see comment in main):")
    rows = []
    for spec in MODEL_FEATURES:
        rows.append(
            {
                "feature": spec.key,
                "floor": "-" if spec.cap is None else f"{spec.floor:g}",
                "cap": "-" if spec.cap is None else f"{spec.cap:g}",
                "log1p": "yes" if spec.log1p else "-",
                "min": prepared[spec.key].min(),
                "max": prepared[spec.key].max(),
                "train_mean": fb.mean_[spec.key],
                "train_std": fb.std_[spec.key],
            }
        )
    print(pd.DataFrame(rows).set_index("feature").to_string(float_format=lambda v: f"{v:.4f}"))

    print("\nstandardized output:")
    print(x.describe().T[["mean", "std", "min", "max"]].to_string(float_format=lambda v: f"{v:.4f}"))

    # ---- 1. exactly the 10 approved features --------------------------------------
    expected = [
        "utilization", "late30", "late60", "late90", "lateSpecialCode",
        "monthlyIncome", "debtRatio", "openCreditLines", "incomeMissing", "incomePlaceholder",
    ]
    assert list(x.columns) == expected, "feature set differs from the approved list"
    assert not set(x.columns) & set(EXCLUDED_FEATURES), "an excluded feature reached the model"
    assert TARGET not in x.columns
    assert len(x) == len(raw) and x.index.equals(raw.index), "rows were dropped or reordered"
    assert np.isfinite(x.to_numpy()).all(), "missing or non-finite values in the features"
    for spec in MODEL_FEATURES:
        if spec.cap is not None:
            low, top = (np.log1p(spec.floor), np.log1p(spec.cap)) if spec.log1p else (spec.floor, spec.cap)
            assert prepared[spec.key].min() >= low - 1e-12 and prepared[spec.key].max() <= top + 1e-12, spec.key
        else:
            assert set(prepared[spec.key].unique()) <= {0.0, 1.0}, spec.key

    # ---- 2. deterministic ---------------------------------------------------------
    pd.testing.assert_frame_equal(x, fb.transform(raw))
    pd.testing.assert_frame_equal(x, FeatureBuilder().fit(raw).transform(raw))
    restored = FeatureBuilder.from_dict(json.loads(json.dumps(fb.to_dict())))
    pd.testing.assert_frame_equal(x, restored.transform(raw))
    shuffled = raw.sample(frac=1.0, random_state=1)
    pd.testing.assert_frame_equal(x, fb.transform(shuffled).loc[raw.index])  # row order is irrelevant

    # ---- 3. no target leakage -----------------------------------------------------
    # The target is never read: removing it, or scrambling it, changes nothing in
    # either the fitted statistics or the output.
    no_target = raw.drop(columns=[TARGET])
    fb_no_target = FeatureBuilder().fit(no_target)
    assert fb_no_target.to_dict() == fb.to_dict()
    pd.testing.assert_frame_equal(x, fb_no_target.transform(no_target))
    scrambled = raw.assign(**{TARGET: raw[TARGET].sample(frac=1.0, random_state=2).to_numpy()})
    assert FeatureBuilder().fit(scrambled).to_dict() == fb.to_dict()
    pd.testing.assert_frame_equal(x, fb.transform(scrambled))

    # ---- 4. a single new applicant ------------------------------------------------
    applicant = {
        "RevolvingUtilizationOfUnsecuredLines": 0.82,
        "age": 29,
        "NumberOfTime30-59DaysPastDueNotWorse": 2,
        "DebtRatio": 0.45,
        "MonthlyIncome": 4200,
        "NumberOfOpenCreditLinesAndLoans": 7,
        "NumberOfTimes90DaysLate": 0,
        "NumberRealEstateLoansOrLines": 1,
        "NumberOfTime60-89DaysPastDueNotWorse": 1,
        "NumberOfDependents": 2,
    }
    one = fb.transform_one(applicant)
    assert list(one) == expected and all(np.isfinite(v) for v in one.values())
    z = lambda key, value: (value - fb.mean_[key]) / fb.std_[key]  # noqa: E731
    assert np.isclose(one["utilization"], z("utilization", 0.82))
    assert np.isclose(one["late30"], z("late30", np.log1p(2)))
    assert np.isclose(one["monthlyIncome"], z("monthlyIncome", np.log1p(4200)))
    assert np.isclose(one["openCreditLines"], z("openCreditLines", 5.0))  # 7 capped to 5
    assert np.isclose(one["incomeMissing"], z("incomeMissing", 0.0))
    # Income floor: anything from 2 to 999 is treated as 1,000, and only the income
    # feature moves (no flag set, debt ratio untouched).
    low = fb.transform_one({**applicant, "MonthlyIncome": 400})
    assert np.isclose(low["monthlyIncome"], z("monthlyIncome", np.log1p(1000)))
    assert low == fb.transform_one({**applicant, "MonthlyIncome": 1000}) == fb.transform_one({**applicant, "MonthlyIncome": 2})
    assert {k: v for k, v in low.items() if k != "monthlyIncome"} == {k: v for k, v in one.items() if k != "monthlyIncome"}
    # A 0/1 placeholder is still the training median plus the flag, not the floor.
    placeholder = fb.transform_one({**applicant, "MonthlyIncome": 1})
    assert np.isclose(placeholder["monthlyIncome"], z("monthlyIncome", np.log1p(fb.preprocessor.medians_["monthlyIncome"])))
    assert np.isclose(placeholder["incomePlaceholder"], z("incomePlaceholder", 1.0))
    # Age, dependents and real-estate loans cannot influence the output.
    assert fb.transform_one({**applicant, "age": 71, "NumberOfDependents": 0, "NumberRealEstateLoansOrLines": 4}) == one
    # Missing income, special codes and out-of-range values are handled for one row too.
    odd = fb.transform_one(
        {
            **applicant,
            "MonthlyIncome": None,
            "DebtRatio": 2400,
            "NumberOfTime30-59DaysPastDueNotWorse": 98,
            "NumberOfTime60-89DaysPastDueNotWorse": 98,
            "NumberOfTimes90DaysLate": 98,
            "RevolvingUtilizationOfUnsecuredLines": 1.9,
        }
    )
    assert all(np.isfinite(v) for v in odd.values())
    assert np.isclose(odd["incomeMissing"], z("incomeMissing", 1.0))
    assert np.isclose(odd["lateSpecialCode"], z("lateSpecialCode", 1.0))
    assert np.isclose(odd["late90"], z("late90", 0.0))
    assert np.isclose(odd["utilization"], z("utilization", 1.5))
    assert np.isclose(odd["monthlyIncome"], z("monthlyIncome", np.log1p(fb.preprocessor.medians_["monthlyIncome"])))
    # One row cleaned alone equals the same row inside the batch.
    for i in raw.sample(n=200, random_state=0).index:
        assert np.allclose(fb.transform(raw.loc[[i]]).iloc[0], x.loc[i], rtol=0, atol=1e-12), i

    # ---- 5. statistics come from the fitted rows only -----------------------------
    # Two halves by position, used only as a mechanical check, not as the project's split.
    half = len(raw) // 2
    first, second = raw.iloc[:half], raw.iloc[half:]
    fb_first = FeatureBuilder().fit(first)
    frozen = json.dumps(fb_first.to_dict(), sort_keys=True)
    out_first = fb_first.transform(first)
    out_second = fb_first.transform(second)
    assert json.dumps(fb_first.to_dict(), sort_keys=True) == frozen, "transform changed the fitted statistics"
    # Fitted rows come out with mean 0 and std 1; unseen rows do not, because nothing was refitted on them.
    assert np.allclose(out_first.mean(), 0, atol=1e-9) and np.allclose(out_first.std(ddof=0), 1, atol=1e-9)
    assert not np.allclose(out_second.mean(), 0, atol=1e-9)
    # Corrupting the unseen rows cannot change what the fitted rows produce.
    wild = second.assign(MonthlyIncome=second["MonthlyIncome"] * 1000, DebtRatio=0.0)
    fb_first.transform(wild)
    pd.testing.assert_frame_equal(out_first, fb_first.transform(first))
    # And the statistics equal a by-hand recomputation from the fitted rows alone.
    by_hand = fb_first.prepare(first)
    assert all(np.isclose(fb_first.mean_[k], by_hand[k].mean()) for k in expected)
    assert all(np.isclose(fb_first.std_[k], by_hand[k].std(ddof=0)) for k in expected)

    print("\nall verification checks passed")


if __name__ == "__main__":
    main()
