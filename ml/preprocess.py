"""Phase 3 data cleaning for Kaggle "Give Me Some Credit".

One reusable, leakage-safe preprocessor:

    pre = Preprocessor().fit(train_raw)      # learns medians from TRAINING rows only
    x_train = pre.transform(train_raw)       # then the same frozen rules everywhere:
    x_valid = pre.transform(valid_raw)
    x_test = pre.transform(test_raw)
    x_new = pre.transform_one({...})         # a single applicant from the app

    pre.to_dict() / Preprocessor.from_dict() # JSON round trip, so the exact same
                                             # numbers can be shipped to TypeScript

Design rules:
    * No row is ever deleted. The data has only ~6.7% defaults, and the oddest
      rows (e.g. the 96/98 codes) are also the riskiest, so they are kept and flagged.
    * Fixed thresholds (caps, "what counts as invalid") are constants in this file.
    * Learned statistics (medians) come from fit() only. transform() never looks
      at the data it is given to decide a fill value, so validation, test and new
      applicants cannot leak into the cleaning.
    * transform() is row-independent and has no randomness: one row cleaned alone
      gives the same result as the same row cleaned inside a batch.

Usage (from the repo root):
    python ml/preprocess.py   # cleans data/cs-training.csv, prints the Phase 3 report

This module does not select features, split data, scale, or train anything.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "cs-training.csv"

TARGET = "SeriousDlqin2yrs"

# Raw Kaggle column -> app key (same keys ml/train.py and the web app use).
RAW_TO_KEY = {
    "RevolvingUtilizationOfUnsecuredLines": "utilization",
    "age": "age",
    "NumberOfTime30-59DaysPastDueNotWorse": "late30",
    "DebtRatio": "debtRatio",
    "MonthlyIncome": "monthlyIncome",
    "NumberOfOpenCreditLinesAndLoans": "openCreditLines",
    "NumberOfTimes90DaysLate": "late90",
    "NumberRealEstateLoansOrLines": "realEstateLoans",
    "NumberOfTime60-89DaysPastDueNotWorse": "late60",
    "NumberOfDependents": "dependents",
}
RAW_COLUMNS = list(RAW_TO_KEY)
LATE_KEYS = ["late30", "late60", "late90"]

# Indicator columns added by the cleaning (1 = the rule fired for this row).
FLAG_COLUMNS = [
    "lateSpecialCode",
    "incomeMissing",
    "incomePlaceholder",
    "debtRatioUnreliable",
    "utilizationInvalid",
    "dependentsMissing",
]
OUTPUT_COLUMNS = list(RAW_TO_KEY.values()) + FLAG_COLUMNS

# --- Fixed thresholds (decided from the EDA, never re-estimated) -------------------

# Late-payment counts: real values stop at 13 / 11 / 17, then jump to 96 and 98.
# Nobody is late 98 times in two years, so anything >= 90 is a bureau special code.
LATE_SPECIAL_MIN = 90
LATE_SPECIAL_REPLACEMENT = 0.0

# MonthlyIncome of 0 or 1 behaves like a placeholder, not a salary: those rows default
# less than people earning 1,000-2,000 and their DebtRatio is broken in the same way
# as rows with missing income. Income at or below this value is treated as unusable.
INCOME_PLACEHOLDER_MAX = 1.0

# Utilization should be 0-1. Slightly above 1 is a real over-limit borrower and is the
# riskiest group in the data (38-47% default), so it is kept. Above 10 the default rate
# falls back to average (7.1%), i.e. those values are data errors, not extreme borrowers.
# Risk stops rising past 1.5 (47.7% at 1.2-1.5, 38.7% at 1.5-2.0), so that is the cap.
UTILIZATION_CAP = 1.5
UTILIZATION_INVALID_ABOVE = 10.0

# DebtRatio on rows with usable income: 95% are below 1. A handful run into the
# hundreds or thousands; cap them so they cannot dominate a linear model. Risk rises
# up to 2.0 (14.5% at 1.5-2.0) and falls again beyond it (9.9% at 2.0-3.0).
DEBT_RATIO_CAP = 2.0

# Nobody under 18 can hold credit; the data has exactly one such row (age 0).
MIN_VALID_AGE = 18


class Preprocessor:
    """Fit on training rows, then apply the identical cleaning to any rows."""

    def __init__(self) -> None:
        self.medians_: dict[str, float] | None = None

    # ---- shared rule definitions --------------------------------------------------

    @staticmethod
    def _raw(df: pd.DataFrame) -> pd.DataFrame:
        missing = [c for c in RAW_COLUMNS if c not in df.columns]
        if missing:
            raise ValueError(f"input is missing required columns: {missing}")
        return df[RAW_COLUMNS].rename(columns=RAW_TO_KEY).astype(float)

    @staticmethod
    def _masks(x: pd.DataFrame) -> dict[str, pd.Series]:
        """Which rows each cleaning rule applies to. Used by fit, transform and the report."""
        income_missing = x["monthlyIncome"].isna()
        income_placeholder = x["monthlyIncome"] <= INCOME_PLACEHOLDER_MAX
        income_unusable = income_missing | income_placeholder
        return {
            "late_special": (x[LATE_KEYS] >= LATE_SPECIAL_MIN).any(axis=1),
            "income_missing": income_missing,
            "income_placeholder": income_placeholder,
            "income_unusable": income_unusable,
            # DebtRatio = monthly debt / monthly income. Without a usable income the
            # column holds the raw debt amount instead (median ~1,000, always a whole
            # number), so it cannot be read as a ratio on these rows.
            "debt_ratio_unreliable": income_unusable,
            "debt_ratio_capped": ~income_unusable & (x["debtRatio"] > DEBT_RATIO_CAP),
            "utilization_invalid": x["utilization"] > UTILIZATION_INVALID_ABOVE,
            "utilization_capped": (x["utilization"] > UTILIZATION_CAP)
            & (x["utilization"] <= UTILIZATION_INVALID_ABOVE),
            "dependents_missing": x["dependents"].isna(),
            "age_invalid": x["age"] < MIN_VALID_AGE,
        }

    # ---- fit: the only place statistics are learned -------------------------------

    def fit(self, train: pd.DataFrame) -> "Preprocessor":
        """Learn fill values. Pass TRAINING rows only, never validation/test rows."""
        x = self._raw(train)
        m = self._masks(x)
        # Each median is taken over the trustworthy values only, so the placeholders
        # and errors being replaced do not influence what they are replaced with.
        self.medians_ = {
            "monthlyIncome": float(x.loc[~m["income_unusable"], "monthlyIncome"].median()),
            "debtRatio": float(x.loc[~m["debt_ratio_unreliable"], "debtRatio"].median()),
            "utilization": float(x.loc[~m["utilization_invalid"], "utilization"].median()),
            "dependents": float(x["dependents"].median()),
            "age": float(x.loc[~m["age_invalid"], "age"].median()),
        }
        bad = [k for k, v in self.medians_.items() if not np.isfinite(v)]
        if bad:
            raise ValueError(f"could not learn a median for {bad}: no usable training values")
        return self

    # ---- transform: frozen rules, no learning -------------------------------------

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean rows using the statistics learned in fit(). Never drops a row."""
        if self.medians_ is None:
            raise RuntimeError("Preprocessor is not fitted; call fit(train) first")
        med = self.medians_
        x = self._raw(df)
        m = self._masks(x)

        # 1. Late-payment special codes (96/98). The real count is unknown, so the
        #    three counts are set to 0 and `lateSpecialCode` carries the signal instead
        #    (these rows default at ~55%). The codes always appear in all three columns.
        for key in LATE_KEYS:
            x[key] = x[key].where(x[key] < LATE_SPECIAL_MIN, LATE_SPECIAL_REPLACEMENT)
        x["lateSpecialCode"] = m["late_special"].astype(int)

        # 2 + 3. Income. Missing and placeholder (0 or 1) incomes are both replaced by
        #    the training median of real incomes, but flagged separately because they
        #    are different situations with different default rates.
        x["monthlyIncome"] = x["monthlyIncome"].where(~m["income_unusable"], med["monthlyIncome"])
        x["incomeMissing"] = m["income_missing"].astype(int)
        x["incomePlaceholder"] = m["income_placeholder"].astype(int)

        # 4. DebtRatio. Where income is unusable the value is a debt amount, not a
        #    ratio: replace it with the training median ratio and flag the row.
        #    Elsewhere it is a real ratio and is only capped.
        #    Note: `debtRatioUnreliable` equals incomeMissing OR incomePlaceholder by
        #    construction; feature selection must not feed all three to a linear model.
        x["debtRatio"] = x["debtRatio"].where(~m["debt_ratio_unreliable"], med["debtRatio"])
        x["debtRatio"] = x["debtRatio"].clip(upper=DEBT_RATIO_CAP)
        x["debtRatioUnreliable"] = m["debt_ratio_unreliable"].astype(int)

        # 5. Utilization. Above 10 is a data error: replace with the training median
        #    and flag it. (Capping errors instead would put average-risk rows in
        #    the highest-risk bucket.) Real over-limit values are kept up to the cap.
        x["utilization"] = x["utilization"].where(~m["utilization_invalid"], med["utilization"])
        x["utilization"] = x["utilization"].clip(upper=UTILIZATION_CAP)
        x["utilizationInvalid"] = m["utilization_invalid"].astype(int)

        # 6. Dependents: fill with the training median and flag.
        x["dependents"] = x["dependents"].fillna(med["dependents"])
        x["dependentsMissing"] = m["dependents_missing"].astype(int)

        # 7. Impossible age (under 18): replace with the training median age.
        #    No flag: it is one row in 150,000, too rare to learn anything from.
        x["age"] = x["age"].where(~m["age_invalid"], med["age"])

        return x[OUTPUT_COLUMNS]

    def transform_one(self, applicant: Mapping[str, Any]) -> dict[str, float]:
        """Clean a single applicant given as {raw Kaggle column: value}. None = missing."""
        row = pd.DataFrame([{c: applicant.get(c) for c in RAW_COLUMNS}])
        return self.transform(row).iloc[0].to_dict()

    def rule_counts(self, df: pd.DataFrame) -> dict[str, int]:
        """How many rows of `df` each cleaning rule touches."""
        return {name: int(mask.sum()) for name, mask in self._masks(self._raw(df)).items()}

    # ---- persistence ----------------------------------------------------------------

    def to_dict(self) -> dict[str, Any]:
        if self.medians_ is None:
            raise RuntimeError("Preprocessor is not fitted; call fit(train) first")
        return {
            "medians": dict(self.medians_),
            "thresholds": {
                "lateSpecialMin": LATE_SPECIAL_MIN,
                "lateSpecialReplacement": LATE_SPECIAL_REPLACEMENT,
                "incomePlaceholderMax": INCOME_PLACEHOLDER_MAX,
                "utilizationCap": UTILIZATION_CAP,
                "utilizationInvalidAbove": UTILIZATION_INVALID_ABOVE,
                "debtRatioCap": DEBT_RATIO_CAP,
                "minValidAge": MIN_VALID_AGE,
            },
            "columns": OUTPUT_COLUMNS,
        }

    @classmethod
    def from_dict(cls, state: Mapping[str, Any]) -> "Preprocessor":
        pre = cls()
        pre.medians_ = {k: float(v) for k, v in state["medians"].items()}
        return pre


def load_raw() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    return df.drop(columns=[c for c in df.columns if c.startswith("Unnamed")])


def main() -> None:
    raw = load_raw()

    # No train/validation/test split exists yet (that is a later phase), so this run
    # fits on every row purely to exercise the code. These medians are NOT the final
    # ones: once the split exists, fit() must be called on the training split only.
    pre = Preprocessor().fit(raw)
    clean = pre.transform(raw)

    print("=== Phase 3: data cleaning report ===")
    print(f"original rows : {len(raw):,}")
    print(f"final rows    : {len(clean):,}")
    print(f"rows deleted  : {len(raw) - len(clean):,}")
    print(f"\ncolumns before ({raw.shape[1]}): {list(raw.columns)}")
    print(f"\ncolumns after  ({clean.shape[1]} features; target kept separately): {list(clean.columns)}")

    print("\nmissing values before:")
    before = raw.isna().sum()
    print(before[before > 0].to_string())
    print(f"missing values after : {int(clean.isna().sum().sum())}")

    print("\nrows affected by each rule:")
    for name, n in pre.rule_counts(raw).items():
        print(f"  {name:24s} {n:7,d}  ({n / len(raw):.3%})")

    print("\nlearned medians (demo fit on all rows, see comment in main):")
    for name, v in pre.medians_.items():
        print(f"  {name:14s} {v:,.4f}")

    print("\ncleaned ranges:")
    print(clean.describe().T[["min", "50%", "mean", "max"]].to_string(float_format=lambda v: f"{v:,.4f}"))

    y = raw[TARGET]
    print("\ndefault rate where each flag is set:")
    for flag in FLAG_COLUMNS:
        on = clean[flag] == 1
        print(f"  {flag:20s} n={int(on.sum()):6,d}  default rate={y[on].mean():.2%}")

    # ---- verification ---------------------------------------------------------------
    assert len(clean) == len(raw) and clean.index.equals(raw.index), "rows were dropped or reordered"
    assert not clean.isna().any().any(), "missing values remain"
    assert np.isfinite(clean.to_numpy()).all(), "non-finite values remain"
    assert clean[LATE_KEYS].max().max() < LATE_SPECIAL_MIN
    assert clean["utilization"].max() <= UTILIZATION_CAP
    assert clean["debtRatio"].max() <= DEBT_RATIO_CAP
    assert clean["age"].min() >= MIN_VALID_AGE
    assert clean["monthlyIncome"].min() > INCOME_PLACEHOLDER_MAX

    # Deterministic: same input, same output.
    pd.testing.assert_frame_equal(clean, pre.transform(raw))

    # Survives a JSON round trip (this is how the stats will reach other code).
    restored = Preprocessor.from_dict(json.loads(json.dumps(pre.to_dict())))
    pd.testing.assert_frame_equal(clean, restored.transform(raw))

    # Row-independent: a row cleaned alone equals the same row cleaned in the batch.
    picks = raw.sample(n=200, random_state=0).index
    for i in picks:
        alone = pre.transform(raw.loc[[i]]).iloc[0]
        assert alone.equals(clean.loc[i]), f"row {i} cleaned differently on its own"

    # Leakage: fitting on some rows and transforming others must not refit. Two halves
    # by position, used only as a mechanical check here, not as the project's split.
    half = len(raw) // 2
    first, second = raw.iloc[:half], raw.iloc[half:]
    pre_first = Preprocessor().fit(first)
    frozen = dict(pre_first.medians_)
    out_second = pre_first.transform(second)
    assert pre_first.medians_ == frozen, "transform changed the fitted statistics"
    filled = second["MonthlyIncome"].isna().to_numpy()
    assert (out_second.loc[filled, "monthlyIncome"] == frozen["monthlyIncome"]).all()
    assert frozen["monthlyIncome"] == float(
        first.loc[first["MonthlyIncome"] > INCOME_PLACEHOLDER_MAX, "MonthlyIncome"].median()
    )

    # Single new applicant, including missing fields and a special code.
    one = pre.transform_one(
        {
            "RevolvingUtilizationOfUnsecuredLines": 1.3,
            "age": 34,
            "NumberOfTime30-59DaysPastDueNotWorse": 98,
            "DebtRatio": 2400,
            "MonthlyIncome": None,
            "NumberOfOpenCreditLinesAndLoans": 4,
            "NumberOfTimes90DaysLate": 98,
            "NumberRealEstateLoansOrLines": 0,
            "NumberOfTime60-89DaysPastDueNotWorse": 98,
            "NumberOfDependents": None,
        }
    )
    assert one["utilization"] == 1.3 and one["late30"] == 0 and one["lateSpecialCode"] == 1
    assert one["monthlyIncome"] == pre.medians_["monthlyIncome"] and one["incomeMissing"] == 1
    assert one["debtRatio"] == pre.medians_["debtRatio"] and one["debtRatioUnreliable"] == 1
    assert one["dependents"] == pre.medians_["dependents"] and one["dependentsMissing"] == 1

    print("\nall verification checks passed")


if __name__ == "__main__":
    main()
