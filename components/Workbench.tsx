"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { analyze } from "@/lib/analyze";
import { describeAssumptions } from "@/lib/config";
import { actionText, pct, reasonText, summaryText, t, tf, type Lang } from "@/lib/i18n";
import { SAMPLES } from "@/lib/samples";
import type { Applicant, FeatureKey } from "@/lib/types";
import { paramsFor } from "@/lib/url";
import { BauhausArt, Scribble } from "./BauhausArt";
import { TimelineChart } from "./TimelineChart";

type Unit = "money" | "pct" | "count";
const PRIMARY: { key: FeatureKey; unit: Unit; max: number }[] = [
  { key: "monthlyIncome", unit: "money", max: 100000 },
  { key: "utilization", unit: "pct", max: 150 },
  { key: "debtRatio", unit: "pct", max: 300 },
  { key: "age", unit: "count", max: 100 },
];
const SECONDARY: { key: FeatureKey; unit: Unit; max: number }[] = [
  { key: "openCreditLines", unit: "count", max: 30 },
  { key: "late30", unit: "count", max: 10 },
  { key: "late60", unit: "count", max: 10 },
  { key: "late90", unit: "count", max: 10 },
  { key: "dependents", unit: "count", max: 10 },
  { key: "realEstateLoans", unit: "count", max: 10 },
];

const KIND_STYLE: Record<string, string> = {
  actionable: "bg-orange text-ink",
  "slow-moving": "bg-plum text-cream",
  time: "bg-rose text-brown",
};

function Field({
  label,
  unit,
  value,
  max,
  big,
  onChange,
}: {
  label: string;
  unit: Unit;
  value: number;
  max: number;
  big?: boolean;
  onChange: (v: number) => void;
}) {
  const shown = unit === "pct" ? Math.round(value * 100) : Math.round(value);
  return (
    <label className="block">
      <span className="block text-[13px] text-cream/70">{label}</span>
      <span className={`mt-1 flex items-baseline gap-1 font-extrabold tracking-tight text-cream ${big ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
        {unit === "money" && <span className="text-cream/80">$</span>}
        <input
          className="field-input pb-1"
          style={{ width: `${Math.max(2, String(shown).length) + 0.8}ch` }}
          aria-label={label}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          step={unit === "money" ? 100 : 1}
          value={shown}
          onChange={(e) => {
            const v = Math.min(max, Math.max(0, Number(e.target.value) || 0));
            onChange(unit === "pct" ? v / 100 : v);
          }}
        />
        {unit === "pct" && <span className="text-cream/80">%</span>}
      </span>
    </label>
  );
}

function SectionHead({ n, kicker, title, sub, dark }: { n: number; kicker: string; title: string; sub: string; dark?: boolean }) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-full text-lg font-extrabold ${dark ? "bg-orange text-ink" : "bg-indigo text-cream"}`}>{n}</span>
        <span className={`text-sm font-bold uppercase tracking-[0.2em] ${dark ? "text-orange" : "text-plum"}`}>{kicker}</span>
      </div>
      <div className="sm:pl-6">
        <h2 className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${dark ? "text-cream" : "text-indigo"}`}>{title}</h2>
        <p className={`mt-2 max-w-2xl ${dark ? "text-cream/75" : "text-brown"}`}>{sub}</p>
      </div>
    </div>
  );
}

export function Workbench({
  initialApplicant,
  initialName,
  initialSampleId,
  lang,
}: {
  initialApplicant: Applicant;
  initialName: string;
  initialSampleId: string | null;
  lang: Lang;
}) {
  const [applicant, setApplicant] = useState(initialApplicant);
  const [name, setName] = useState(initialName);
  const [sampleId, setSampleId] = useState(initialSampleId);
  const [aiText, setAiText] = useState<{ key: string; text: string } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const ui = t(lang);
  const r = useMemo(() => analyze(applicant), [applicant]);
  const { assessment: a, plan, timeline } = r;

  const sync = (next: Applicant, nextSample: string | null, nextName: string) => {
    const q = paramsFor(next, { sampleId: nextSample, lang, name: nextName === "Applicant" ? undefined : nextName });
    window.history.replaceState(null, "", `${window.location.pathname}?${q}${window.location.hash}`);
  };
  const setField = (key: FeatureKey, v: number) => {
    const next = { ...applicant, [key]: v };
    setApplicant(next);
    setSampleId(null);
    setName("Applicant");
    sync(next, null, "Applicant");
  };
  const loadSample = (id: string) => {
    const s = SAMPLES.find((x) => x.id === id)!;
    setApplicant(s.applicant);
    setSampleId(s.id);
    setName(s.name);
    sync(s.applicant, s.id, s.name);
  };

  const feasible = r.recourse.status === "plan";
  const approvalLabel = a.approved
    ? ui.approvedNow
    : timeline.approvalMonth === null
      ? tf(ui.noPlan, { n: r.horizon })
      : timeline.approvalMonth === 1
        ? ui.approvedIn1
        : tf(ui.approvedIn, { n: timeline.approvalMonth });
  const summary = summaryText(lang, {
    name,
    approved: a.approved,
    score: a.score,
    threshold: r.thresholdScore,
    topReason: a.reasons[0] ? { key: a.reasons[0].key, value: a.reasons[0].value } : null,
    approvalMonth: timeline.approvalMonth,
    horizon: r.horizon,
  });
  const reportHref = `/report?${paramsFor(applicant, { sampleId, lang, name })}`;
  const gaugePos = (s: number) => `${((s - 300) / 600) * 100}%`;
  const maxPts = Math.max(1, ...a.reasons.map((x) => x.points));

  async function rewrite() {
    setRewriting(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: summary, lang }),
      });
      const j = (await res.json()) as { text?: string };
      setAiText({ key: summary, text: j.text || summary });
    } catch {
      setAiText({ key: summary, text: summary });
    } finally {
      setRewriting(false);
    }
  }
  const shownSummary = aiText && aiText.key === summary ? aiText.text : summary;

  return (
    <div lang={lang}>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="dot-grid pointer-events-none absolute right-0 top-0 hidden h-40 w-72 opacity-60 lg:block" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:pt-12">
          <div className="relative grid lg:grid-cols-12">
            <div className="relative bg-indigo px-6 py-10 sm:px-10 lg:col-span-7 lg:py-14 lg:pr-36">
              <span className="absolute -left-4 bottom-16 hidden h-10 w-10 rounded-full bg-red lg:block" aria-hidden />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">Pathway</p>
              <h1 className="mt-3 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-cream sm:text-5xl lg:text-[3.6rem]">
                {ui.tagline}
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-cream/80">{ui.heroBody}</p>

              <div className="mt-8">
                <p className="text-[13px] text-cream/70">{ui.tryDemo}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {SAMPLES.map((s) => {
                    const active = sampleId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        data-sample={s.id}
                        onClick={() => loadSample(s.id)}
                        className={`border px-3 py-2.5 text-left transition-colors ${
                          active ? "border-orange bg-orange text-ink" : "border-cream/25 text-cream hover:border-cream/60"
                        }`}
                      >
                        <span className="block text-sm font-bold">{s.name}</span>
                        <span className={`block text-xs ${active ? "text-ink/75" : "text-cream/60"}`}>{s.tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-9 grid grid-cols-2 gap-x-8 gap-y-7">
                {PRIMARY.map((f) => (
                  <Field key={f.key} big label={ui.fields[f.key]} unit={f.unit} max={f.max} value={applicant[f.key]} onChange={(v) => setField(f.key, v)} />
                ))}
              </div>
              <div className="mt-7 grid grid-cols-3 gap-x-6 gap-y-6 sm:grid-cols-6">
                {SECONDARY.map((f) => (
                  <Field key={f.key} label={ui.fields[f.key]} unit={f.unit} max={f.max} value={applicant[f.key]} onChange={(v) => setField(f.key, v)} />
                ))}
              </div>
              <a
                href="#why"
                className="mt-9 inline-flex items-center gap-2 bg-orange px-7 py-3.5 text-[15px] font-bold text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {ui.assess} <span aria-hidden>↓</span>
              </a>
            </div>

            <div className="relative min-h-[420px] lg:col-span-5">
              <div className="absolute inset-0">
                <BauhausArt approved={a.approved} />
              </div>
              {/* RESULT CARD */}
              <div className="relative z-10 mx-4 my-10 bg-paper p-7 shadow-[0_30px_60px_-30px_rgba(8,3,106,0.45)] sm:mx-auto sm:max-w-sm lg:absolute lg:-left-20 lg:top-24 lg:mx-0 lg:my-0 lg:w-[22rem]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{ui.score}</p>
                  <span
                    data-decision={a.approved ? "approved" : "declined"}
                    className={`px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider ${a.approved ? "bg-indigo text-cream" : "bg-red text-cream"}`}
                  >
                    {a.approved ? ui.approved : ui.declined}
                  </span>
                </div>
                <p className="mt-3 text-6xl font-extrabold tracking-tight text-ink">{Math.round(a.score)}</p>
                <Scribble color={a.approved ? "var(--indigo)" : "var(--orange)"} />

                <div className="relative mt-5 h-2 bg-rose/60" aria-hidden>
                  <div className="absolute inset-y-0 left-0 bg-indigo" style={{ width: gaugePos(a.score) }} />
                  <div className="absolute -top-1.5 h-5 w-0.5 bg-orange" style={{ left: gaugePos(r.thresholdScore) }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-brown/70">
                  <span>300</span>
                  <span>900</span>
                </div>

                <dl className="mt-4 divide-y divide-rose text-sm">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-brown/80">{ui.threshold}</dt>
                    <dd className="font-semibold">{r.thresholdScore}</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-brown/80">{ui.pd}</dt>
                    <dd className="font-semibold">{pct(a.pd, 1)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-brown/80">{ui.when}</dt>
                    <dd className="text-right font-bold text-indigo" data-testid="approval-label">{approvalLabel}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-col items-center gap-1.5 text-[13px] text-brown">
                  <a href="#plan" className="underline underline-offset-4 hover:text-indigo">{ui.whatTitle}</a>
                  <Link href={reportHref} className="underline underline-offset-4 hover:text-indigo">{ui.printReport}</Link>
                  <Link href={`/fairness${lang !== "en" ? `?lang=${lang}` : ""}`} className="underline underline-offset-4 hover:text-indigo">{ui.fairness}</Link>
                </div>
                <span className="absolute -bottom-5 -left-5 hidden h-10 w-10 bg-indigo lg:block" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 border-l-8 border-orange bg-paper p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{ui.explanation}</p>
            <p className="mt-2 text-lg leading-relaxed text-ink" data-testid="summary">{shownSummary}</p>
          </div>
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={rewrite}
              disabled={rewriting}
              className="border-2 border-indigo px-4 py-2 text-sm font-bold text-indigo transition-colors hover:bg-indigo hover:text-cream disabled:opacity-60"
            >
              {rewriting ? ui.rewriting : ui.rewrite}
            </button>
            <p className="max-w-[16rem] text-xs text-brown/70">{ui.rewriteNote}</p>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6">
        <SectionHead n={1} kicker={ui.why} title={ui.whyTitle} sub={ui.whySub} />
        {a.reasons.length === 0 ? (
          <p className="bg-paper p-6 text-brown">{ui.noReasons}</p>
        ) : (
          <ol className="grid gap-3">
            {a.reasons.map((x, i) => (
              <li key={x.key} className="grid gap-3 bg-paper p-5 sm:grid-cols-[3rem_1fr_14rem] sm:items-center">
                <span className={`grid h-10 w-10 place-items-center text-sm font-extrabold ${i === 0 ? "bg-red text-cream" : "bg-rose text-brown"}`}>
                  R{i + 1}
                </span>
                <div>
                  <p className="font-bold text-ink">{ui.fields[x.key]}</p>
                  <p className="text-[15px] text-brown">{reasonText(lang, x.key, x.value)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 bg-rose/40">
                    <div className={`h-full ${i === 0 ? "bg-red" : "bg-orange"}`} style={{ width: `${(x.points / maxPts) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right text-sm font-bold text-ink">−{Math.round(x.points)} pts</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* WHAT */}
      <section id="plan" className="scroll-mt-24 bg-indigo">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHead dark n={2} kicker={ui.what} title={ui.whatTitle} sub={ui.whatSub} />
          {a.approved || !plan ? (
            <p className="bg-paper p-6 font-semibold text-indigo">{ui.approvedNow}. {ui.noReasons}</p>
          ) : (
            <>
              {!feasible && <p className="mb-4 bg-red p-4 font-semibold text-cream">{tf(ui.noPlan, { n: r.horizon })}</p>}
              <ol className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
                <li className="flex flex-col justify-between bg-red p-5 text-cream">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-cream/80">{ui.today}</span>
                  <span className="mt-6 text-2xl font-extrabold">{ui.declined}</span>
                  <span className="text-sm text-cream/80">{Math.round(plan.scoreBefore)} pts</span>
                </li>
                {plan.actions.map((act, i) => (
                  <li key={act.key} className="flex flex-col bg-paper p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{ui.step} {i + 1}</span>
                      <span className={`px-2 py-0.5 text-[11px] font-bold ${KIND_STYLE[act.kind]}`}>{ui.kinds[act.kind]}</span>
                    </div>
                    <p className="mt-3 flex-1 font-semibold leading-snug text-ink">{actionText(lang, act)}</p>
                    <p className="mt-4 text-xs text-brown">
                      {act.months} {ui.monthsShort} · {ui.effort} {act.effort.toFixed(1)}
                    </p>
                  </li>
                ))}
                <li className={`flex flex-col justify-between p-5 ${feasible ? "bg-orange text-ink" : "bg-rose text-brown"}`}>
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">{ui.reapply}</span>
                  <span className="mt-6 text-2xl font-extrabold">{feasible ? `${ui.approved}*` : "—"}</span>
                  <span className="text-sm">
                    {ui.planScore}: {Math.round(plan.scoreAfter)}
                  </span>
                </li>
              </ol>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-wrap items-center gap-3 border border-cream/20 p-4 text-cream">
                  <span className="bg-plum px-2 py-0.5 text-xs font-bold">{ui.never}</span>
                  <span className="text-sm text-cream/85">{ui.neverList}</span>
                </div>
                <div className="border border-cream/20 p-4 text-sm text-cream/85">
                  {ui.total} {ui.effort}: <strong className="text-cream">{plan.effort.toFixed(1)}</strong> · *{ui.projected}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* WHEN */}
      <section id="timeline" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6">
        <SectionHead n={3} kicker={ui.when} title={ui.whenTitle} sub={ui.whenSub} />
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="bg-paper p-5 sm:p-7">
            <p className="text-3xl font-extrabold tracking-tight text-indigo sm:text-4xl">{approvalLabel}</p>
            <div className="mt-2 flex flex-wrap gap-5 text-sm text-brown">
              <span className="flex items-center gap-2"><span className="h-1 w-6 bg-indigo" />{ui.withPlan}</span>
              <span className="flex items-center gap-2"><span className="h-0 w-6 border-t-2 border-dashed border-plum" />{ui.withoutPlan}</span>
              <span className="flex items-center gap-2"><span className="h-0.5 w-6 bg-orange" />{ui.threshold} {r.thresholdScore}</span>
            </div>
            <div className="mt-4">
              <TimelineChart timeline={timeline} labels={{ withPlan: ui.withPlan, withoutPlan: ui.withoutPlan, month: ui.month, threshold: ui.threshold }} />
            </div>
          </div>
          <aside className="bg-brown p-6 text-cream">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">{ui.assumptions}</p>
            <dl className="mt-4 space-y-3 text-sm">
              {describeAssumptions().map((x) => (
                <div key={x.label}>
                  <dt className="font-bold">{x.label}</dt>
                  <dd className="text-cream/75">{x.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-cream/60">Income in $ (units of the US Give Me Some Credit dataset).</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
