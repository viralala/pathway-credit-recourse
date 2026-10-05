"""Phase 5: reproducible stratified 60/20/20 split, with features fitted on training only.

    raw = load_raw()
    split = make_split(raw)                        # {"train": ids, "validation": ids, "test": ids}
    fb = FeatureBuilder().fit(raw.iloc[split["train"]])
    x_valid = fb.transform(raw.iloc[split["validation"]])

Row ids are 0-based positions in data/cs-training.csv (row 0 = first data row).

Roles of the three parts:
    train        fit everything: medians, means, stds and, later, the model
    validation   compare models and pick the cut-off
    test         touched once at the very end for the reported numbers

Usage (from the repo root):
    python ml/split.py   # splits, verifies, and writes the two files below

Outputs:
    ml/artifacts/split_manifest.json   seed, sizes, default rates, dataset + split
                                       fingerprints, training-only feature statistics
    ml/artifacts/split_ids.npz         the exact row ids of each part

This module does not train a model, choose a cut-off, or write model.json.
"""

from __future__ import annotations

import hashlib
import json
import platform

import numpy as np
import pandas as pd
import sklearn
from sklearn.model_selection import train_test_split

from features import MODEL_FEATURE_KEYS, FeatureBuilder
from preprocess import DATA_PATH, ROOT, TARGET, load_raw

SEED = 42
FRACTIONS = {"train": 0.60, "validation": 0.20, "test": 0.20}
PARTS = list(FRACTIONS)

MANIFEST_OUT = ROOT / "ml" / "artifacts" / "split_manifest.json"
IDS_OUT = ROOT / "ml" / "artifacts" / "split_ids.npz"


def make_split(raw: pd.DataFrame, seed: int = SEED) -> dict[str, np.ndarray]:
    """Stratified 60/20/20 split on the target. Returns sorted row positions per part."""
    ids = np.arange(len(raw))
    y = raw[TARGET].to_numpy()
    # Two stratified cuts: first peel off the test part, then cut validation out of
    # what is left (0.20 of the whole = 0.25 of the remaining 0.80).
    rest, test = train_test_split(ids, test_size=FRACTIONS["test"], random_state=seed, stratify=y)
    train, validation = train_test_split(
        rest,
        test_size=FRACTIONS["validation"] / (1 - FRACTIONS["test"]),
        random_state=seed,
        stratify=y[rest],
    )
    return {"train": np.sort(train), "validation": np.sort(validation), "test": np.sort(test)}


def fingerprint(ids: np.ndarray) -> str:
    """SHA-256 of the row ids, so a re-run can prove it produced the same part."""
    return hashlib.sha256(np.asarray(ids, dtype="<i8").tobytes()).hexdigest()


def file_sha256(path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_split(raw: pd.DataFrame) -> dict[str, np.ndarray]:
    """The saved split, after checking it belongs to this dataset and is intact."""
    manifest = json.loads(MANIFEST_OUT.read_text())
    if len(raw) != manifest["rows"]["total"]:
        raise ValueError("dataset has a different number of rows than the saved split")
    with np.load(IDS_OUT) as saved:
        split = {part: saved[part] for part in PARTS}
    for part in PARTS:
        if fingerprint(split[part]) != manifest["parts"][part]["idsSha256"]:
            raise ValueError(f"saved ids for '{part}' do not match the manifest")
    return split


def main() -> None:
    raw = load_raw()
    y = raw[TARGET]
    split = make_split(raw)
    frames = {part: raw.iloc[split[part]] for part in PARTS}

    print("=== Phase 5: train / validation / test split ===")
    print(f"seed          : {SEED}")
    print("method        : stratified on SeriousDlqin2yrs, 60/20/20 (sklearn train_test_split, two cuts)")
    print(f"total rows    : {len(raw):,}  defaults {int(y.sum()):,}  rate {y.mean():.4%}")
    for part in PARTS:
        t = frames[part][TARGET]
        print(f"{part:14s}: {len(t):7,d} rows ({len(t) / len(raw):.2%})  defaults {int(t.sum()):6,d}  rate {t.mean():.4%}")

    # ---- the split itself -------------------------------------------------------------
    all_ids = np.concatenate([split[part] for part in PARTS])
    assert len(all_ids) == len(raw), "parts do not add up to the dataset"
    assert len(np.unique(all_ids)) == len(raw), "a row appears in more than one part"
    assert np.array_equal(np.sort(all_ids), np.arange(len(raw))), "a row was lost"
    for a in PARTS:
        for b in PARTS:
            if a < b:
                assert not np.intersect1d(split[a], split[b]).size, f"{a} and {b} overlap"
    for part in PARTS:
        assert abs(len(split[part]) / len(raw) - FRACTIONS[part]) < 1e-4, part
    rates = {part: float(frames[part][TARGET].mean()) for part in PARTS}
    spread = max(rates.values()) - min(rates.values())
    assert spread < 0.0005, "default rates differ too much between parts"
    print(f"largest gap in default rate between parts: {spread * 100:.4f} percentage points")

    # Reproducible: the same seed gives the same parts, a different seed does not.
    again = make_split(raw)
    assert all(np.array_equal(split[part], again[part]) for part in PARTS)
    assert not np.array_equal(split["test"], make_split(raw, seed=SEED + 1)["test"])

    # ---- features: fitted on training rows only ------------------------------------
    fb = FeatureBuilder().fit(frames["train"])
    x = {part: fb.transform(frames[part]) for part in PARTS}
    state = fb.to_dict()

    print("\ntraining-only statistics (frozen and reused for validation, test and new applicants):")
    print("  cleaning medians:")
    for name, value in fb.preprocessor.medians_.items():
        print(f"    {name:14s} {value:,.4f}")
    print("  feature means and standard deviations (after floor, cap and log):")
    stats = pd.DataFrame({"mean": fb.mean_, "std": fb.std_}).loc[MODEL_FEATURE_KEYS]
    print("    " + stats.to_string(float_format=lambda v: f"{v:.6f}").replace("\n", "\n    "))

    print("\ntransformed shapes and how each part looks on the training scale:")
    for part in PARTS:
        m, s = x[part].mean(), x[part].std(ddof=0)
        print(
            f"  {part:11s} shape={x[part].shape}  missing={int(x[part].isna().sum().sum())}"
            f"  feature means within [{m.min():+.4f}, {m.max():+.4f}]  stds within [{s.min():.4f}, {s.max():.4f}]"
        )

    for part in PARTS:
        assert list(x[part].columns) == MODEL_FEATURE_KEYS and TARGET not in x[part].columns
        assert len(x[part]) == len(split[part]) and np.isfinite(x[part].to_numpy()).all()

    # ---- validation/test cannot influence anything that is fitted -------------------
    # (a) Transforming does not alter the fitted state.
    assert fb.to_dict() == state
    # (b) Every statistic equals a by-hand recomputation from the training rows alone.
    by_hand = fb.prepare(frames["train"])
    assert all(np.isclose(fb.mean_[k], by_hand[k].mean()) for k in MODEL_FEATURE_KEYS)
    assert all(np.isclose(fb.std_[k], by_hand[k].std(ddof=0)) for k in MODEL_FEATURE_KEYS)
    train_income = frames["train"]["MonthlyIncome"]
    assert fb.preprocessor.medians_["monthlyIncome"] == float(train_income[train_income > 1].median())
    # (c) Training rows come out exactly centred and scaled; the other parts are close
    #     but not exact, which is what "not refitted on them" looks like.
    assert np.allclose(x["train"].mean(), 0, atol=1e-9) and np.allclose(x["train"].std(ddof=0), 1, atol=1e-9)
    assert not np.allclose(x["validation"].mean(), 0, atol=1e-9)
    assert not np.allclose(x["test"].mean(), 0, atol=1e-9)
    # (d) Rewrite every validation and test row with absurd values and redo the whole
    #     procedure on that corrupted dataset: the fitted statistics and the training
    #     features must come out identical.
    corrupted = raw.copy()
    held_out = np.concatenate([split["validation"], split["test"]])
    for col in corrupted.columns:
        if col != TARGET:
            corrupted.iloc[held_out, corrupted.columns.get_loc(col)] = 987_654.0
    fb_corrupted = FeatureBuilder().fit(corrupted.iloc[split["train"]])
    assert fb_corrupted.to_dict() == state, "held-out rows influenced the fitted statistics"
    pd.testing.assert_frame_equal(fb_corrupted.transform(corrupted.iloc[split["train"]]), x["train"])
    # (e) The statistics are genuinely training-only: fitting on all rows gives different numbers.
    assert FeatureBuilder().fit(raw).to_dict() != state
    # (f) Floors, caps and thresholds are constants in the code, not fitted values:
    #     they are the same whatever rows are fitted on.
    fitted_on_test = FeatureBuilder().fit(frames["test"]).to_dict()
    assert fitted_on_test["preprocessor"]["thresholds"] == state["preprocessor"]["thresholds"]
    assert [(f["floor"], f["cap"], f["log1p"]) for f in fitted_on_test["features"]] == [
        (f["floor"], f["cap"], f["log1p"]) for f in state["features"]
    ]

    # ---- save what is needed to reproduce the experiment ----------------------------
    manifest = {
        "dataset": {
            "file": DATA_PATH.relative_to(ROOT).as_posix(),
            "sha256": file_sha256(DATA_PATH),
            "rowIdConvention": "0-based position of the row in the CSV (first data row = 0)",
        },
        "target": TARGET,
        "method": "stratified on target; sklearn train_test_split twice (test first, then validation)",
        "seed": SEED,
        "fractions": FRACTIONS,
        "rows": {"total": int(len(raw)), "defaults": int(y.sum()), "defaultRate": float(y.mean())},
        "parts": {
            part: {
                "rows": int(len(split[part])),
                "defaults": int(frames[part][TARGET].sum()),
                "defaultRate": rates[part],
                "idsSha256": fingerprint(split[part]),
            }
            for part in PARTS
        },
        "idsFile": IDS_OUT.relative_to(ROOT).as_posix(),
        "featureBuilderFittedOn": "train",
        "featureBuilder": state,
        "versions": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit-learn": sklearn.__version__,
        },
    }
    MANIFEST_OUT.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_OUT.write_text(json.dumps(manifest, indent=2) + "\n")
    np.savez_compressed(IDS_OUT, **{part: split[part].astype(np.int32) for part in PARTS})

    # The saved files reproduce the split exactly.
    loaded = load_split(raw)
    assert all(np.array_equal(loaded[part], split[part]) for part in PARTS)
    restored = FeatureBuilder.from_dict(json.loads(MANIFEST_OUT.read_text())["featureBuilder"])
    pd.testing.assert_frame_equal(restored.transform(frames["test"]), x["test"])

    print(f"\nwrote {MANIFEST_OUT.relative_to(ROOT).as_posix()}, {IDS_OUT.relative_to(ROOT).as_posix()}")
    print("all verification checks passed")


if __name__ == "__main__":
    main()
