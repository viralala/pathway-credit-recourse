import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { analyze } from "@/lib/analyze";
import { describeAssumptions } from "@/lib/config";
import { actionText, asLang, displayValue, pct, reasonText, summaryText, t, tf, type Lang } from "@/lib/i18n";
import { MODEL } from "@/lib/model";
import type { FeatureKey } from "@/lib/types";
import { applicantFromParams, paramsFor, type SearchParams } from "@/lib/url";
import metrics from "@/public/metrics.json";

export const metadata: Metadata = { title: "Lender report · Pathway" };

const H: Record<Lang, Record<string, string>> = {
  en: {
    title: "Statement of reasons for credit decision",
    sub: "Adverse-action style report (simulated)",
    applicant: "Applicant data used",
    decision: "Decision",
    reasons: "Principal reasons, ranked",
    plan: "Path to approval",
    timeline: "Projected timeline",
    assumptions: "Assumptions",
    model: "Model",
    rights: "Your rights (illustrative)",
    rightsBody:
      "You may request a human review of this decision, correct any inaccurate data, and re-apply. This report explains the factors used; the plan never relies on age, dependents or real-estate loans being changed.",
    print: "Print / save as PDF",
    back: "Back to applicant",
  },
  hi: {
    title: "ऋण निर्णय के कारणों का विवरण",
    sub: "प्रतिकूल-निर्णय शैली की रिपोर्ट (सिमुलेशन)",
    applicant: "प्रयुक्त आवेदक डेटा",
    decision: "निर्णय",
    reasons: "मुख्य कारण, क्रम से",
    plan: "स्वीकृति का रास्ता",
    timeline: "अनुमानित समयरेखा",
    assumptions: "मान्यताएँ",
    model: "मॉडल",
    rights: "आपके अधिकार (उदाहरण)",
    rightsBody:
      "आप इस निर्णय की मानवीय समीक्षा माँग सकते हैं, गलत डेटा सुधरवा सकते हैं और दोबारा आवेदन कर सकते हैं। यह रिपोर्ट प्रयुक्त कारकों को समझाती है; योजना कभी आयु, आश्रितों या रियल-एस्टेट ऋणों में बदलाव पर निर्भर नहीं करती।",
    print: "प्रिंट / PDF सहेजें",
    back: "आवेदक पर वापस",
  },
  mr: {
    title: "कर्ज निर्णयाच्या कारणांचे विवरण",
    sub: "प्रतिकूल-निर्णय स्वरूपाचा अहवाल (सिम्युलेशन)",
    applicant: "वापरलेला अर्जदार डेटा",
    decision: "निर्णय",
    reasons: "मुख्य कारणे, क्रमाने",
    plan: "मंजुरीचा मार्ग",
    timeline: "अंदाजित वेळापत्रक",
    assumptions: "गृहितके",
    model: "मॉडेल",
    rights: "तुमचे अधिकार (उदाहरणार्थ)",
    rightsBody:
      "तुम्ही या निर्णयाचे मानवी पुनरावलोकन मागू शकता, चुकीचा डेटा दुरुस्त करू शकता आणि पुन्हा अर्ज करू शकता. हा अहवाल वापरलेले घटक स्पष्ट करतो; योजना कधीही वय, अवलंबित किंवा स्थावर मालमत्ता कर्जांतील बदलावर अवलंबून नाही.",
    print: "प्रिंट / PDF जतन करा",
    back: "अर्जदाराकडे परत",
  },
};

const FIELDS: FeatureKey[] = [
  "monthlyIncome",
  "utilization",
  "debtRatio",
  "openCreditLines",
  "late30",
  "late60",
  "late90",
  "age",
  "dependents",
  "realEstateLoans",
];

export default async function ReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const lang = asLang(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const ui = t(lang);
  const h = H[lang];
  const { applicant, name, sampleId } = applicantFromParams(sp);
  const r = analyze(applicant);
  const a = r.assessment;
  const ref = `PW-${(sampleId ?? "custom").toUpperCase()}-${Math.round(a.score)}`;
  const summary = summaryText(lang, {
    name,
    approved: a.approved,
    score: a.score,
    threshold: r.thresholdScore,
    topReason: a.reasons[0] ? { key: a.reasons[0].key, value: a.reasons[0].value } : null,
    approvalMonth: r.timeline.approvalMonth,
    horizon: r.horizon,
  });
  const milestones = [0, 3, 6, 12, 18, 24, 36].filter((m) => m <= r.horizon).map((m) => r.timeline.points[m]);

  return (
    <div lang={lang} className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/?${paramsFor(applicant, { sampleId, lang, name })}`}
          className="text-sm font-semibold text-indigo underline underline-offset-4"
        >
          ← {h.back}
        </Link>
        <PrintButton label={h.print} />
      </div>

      <article className="print-sheet border border-rose bg-white p-6 shadow-[0_30px_60px_-40px_rgba(8,3,106,0.5)] sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-indigo pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{h.sub}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-indigo sm:text-3xl">{h.title}</h1>
          </div>
          <div className="text-right text-xs text-brown">
            <p className="font-bold">Pathway · Demo Lender</p>
            <p>Ref {ref}</p>
            <p>Model trained {MODEL.trainedAt.slice(0, 10)}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-[1fr_14rem]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{h.decision}</h2>
            <p className="mt-2 leading-relaxed text-ink">{summary}</p>
          </div>
          <div className={`p-4 text-cream ${a.approved ? "bg-indigo" : "bg-red"}`}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80" data-decision={a.approved ? "approved" : "declined"}>
              {a.approved ? ui.approved : ui.declined}
            </p>
            <p className="mt-2 text-4xl font-extrabold">{Math.round(a.score)}</p>
            <p className="text-xs opacity-80">
              {ui.threshold} {r.thresholdScore} · {ui.pd} {pct(a.pd, 1)}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{h.reasons}</h2>
          {a.reasons.length === 0 ? (
            <p className="mt-2 text-brown">{ui.noReasons}</p>
          ) : (
            <ol className="mt-2 divide-y divide-rose border-y border-rose">
              {a.reasons.map((x, i) => (
                <li key={x.key} className="grid grid-cols-[2.5rem_1fr_auto] items-start gap-3 py-3">
                  <span className="font-extrabold text-indigo">R{i + 1}</span>
                  <span>
                    <strong>{ui.fields[x.key]}</strong>
                    <span className="block text-sm text-brown">{reasonText(lang, x.key, x.value)}</span>
                  </span>
                  <span className="text-sm font-bold">−{Math.round(x.points)} pts</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {!a.approved && r.plan && (
          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{h.plan}</h2>
              <ol className="mt-2 space-y-2">
                {r.plan.actions.map((act, i) => (
                  <li key={act.key} className="flex gap-3 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center bg-orange text-xs font-extrabold text-ink">{i + 1}</span>
                    <span>
                      {actionText(lang, act)}{" "}
                      <span className="text-brown/70">
                        ({act.months} {ui.monthsShort})
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-brown">
                {ui.never}: {ui.neverList}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{h.timeline}</h2>
              <p className="mt-2 font-bold text-indigo">
                {r.timeline.approvalMonth === null
                  ? tf(ui.noPlan, { n: r.horizon })
                  : tf(ui.approvedIn, { n: r.timeline.approvalMonth })}
              </p>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-rose text-left text-brown/80">
                    <th className="py-1 font-semibold">{ui.month}</th>
                    <th className="py-1 text-right font-semibold">{ui.withPlan}</th>
                    <th className="py-1 text-right font-semibold">{ui.withoutPlan}</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((p) => (
                    <tr key={p.month} className="border-b border-rose/50">
                      <td className="py-1">{p.month}</td>
                      <td className={`py-1 text-right font-semibold ${p.approved ? "text-indigo" : ""}`}>{Math.round(p.score)}</td>
                      <td className="py-1 text-right text-brown">{Math.round(p.baselineScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{h.applicant}</h2>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 text-sm min-[480px]:grid-cols-2">
              {FIELDS.map((k) => (
                <div key={k} className="flex justify-between gap-2 border-b border-rose/60 py-1">
                  <dt className="text-brown">{ui.fields[k]}</dt>
                  <dd className="font-semibold">{displayValue(k, applicant[k])}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-plum">{h.assumptions}</h2>
            <ul className="mt-2 space-y-1 text-xs text-brown">
              {describeAssumptions().map((x) => (
                <li key={x.label}>
                  <strong className="text-ink">{x.label}:</strong> {x.value}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-8 grid gap-6 border-t border-rose pt-5 text-xs text-brown sm:grid-cols-2">
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-plum">{h.model}</h2>
            <p className="mt-1">
              Logistic regression on {metrics.dataSource} data (Give Me Some Credit schema), hold-out AUC {metrics.auc}. Reason codes are
              exact per-feature contributions to the log-odds, relative to the average applicant.
            </p>
          </div>
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-plum">{h.rights}</h2>
            <p className="mt-1">{h.rightsBody}</p>
          </div>
          <p className="border-l-4 border-orange pl-3 font-semibold text-ink sm:col-span-2">{ui.disclaimer}</p>
        </section>
      </article>
    </div>
  );
}
