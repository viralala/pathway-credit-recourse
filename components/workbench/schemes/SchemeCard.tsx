import { CircleHelp, CircleMinus, Compass, ExternalLink, TriangleAlert, type LucideIcon } from "lucide-react";
import { useId } from "react";
import { tf, type Lang } from "@/lib/i18n";
import type { MatchStatus, ProfileFieldKey, SchemeMatch } from "@/lib/schemes/types";
import type { SchemeStrings } from "@/lib/strings/schemes";
import { cn } from "@/lib/utils";
import { CriterionList } from "./CriterionList";
import { formatDate, loanRangeText, requiredCounts } from "./format";
import { MissingFields } from "./MissingFields";

/**
 * Status look: pastel fill, an icon and the words. Positive for a match, informational for "need more
 * information", muted for no match. No tick: a tick would read as an approval.
 */
const STATUS: Record<MatchStatus, { icon: LucideIcon; tone: string }> = {
  appears_relevant: { icon: Compass, tone: "bg-pastel-mint text-deep-mint" },
  needs_more_information: { icon: CircleHelp, tone: "bg-pastel-sky text-deep-sky" },
  not_matched: { icon: CircleMinus, tone: "bg-muted text-muted-foreground" },
};

/** Only web links are rendered; anything else (a javascript: URL from a bad row) is dropped. */
function safeUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

function ExternalAnchor({ href, newTab, children, english }: { href: string; newTab: string; children: React.ReactNode; english?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      lang={english ? "en" : undefined}
      className="inline-flex items-center gap-1.5 rounded-md font-semibold text-primary underline underline-offset-3 outline-none hover:text-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span>{children}</span>
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">({newTab})</span>
    </a>
  );
}

/** One scheme: what it is, how much of its published criteria the answers confirm, and why. */
export function SchemeCard({
  s,
  lang,
  match,
  onAnswerField,
}: {
  s: SchemeStrings;
  lang: Lang;
  match: SchemeMatch;
  /** Scroll to and focus the form question for this field. */
  onAnswerField: (key: ProfileFieldKey) => void;
}) {
  const titleId = useId();
  const { scheme, status, evaluation } = match;
  const look = STATUS[status] ?? STATUS.needs_more_information;
  const Icon = look.icon;
  const criteria = Array.isArray(evaluation?.criteria) ? evaluation.criteria : [];
  const { confirmed, total } = requiredCounts(criteria);
  const score = typeof match.relevance?.score === "number" ? Math.max(0, Math.min(100, Math.round(match.relevance.score))) : null;
  const missing = status === "needs_more_information" && Array.isArray(evaluation?.missingFields) ? [...new Set(evaluation.missingFields)] : [];
  const benefits = Array.isArray(scheme.benefits) ? scheme.benefits : [];
  const loanRange = loanRangeText(s, scheme);
  const officialUrl = safeUrl(scheme.officialUrl);
  const applicationUrl = safeUrl(scheme.applicationUrl);
  const unverified = scheme.verificationStatus === "unverified";
  const otherSources = (Array.isArray(scheme.sources) ? scheme.sources : [])
    .map((src) => ({ title: src?.title, url: safeUrl(src?.url) }))
    .filter((src): src is { title: string; url: string } => !!src.url && typeof src.title === "string" && src.url !== officialUrl && src.url !== applicationUrl);

  return (
    <article aria-labelledby={titleId} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
      <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold", look.tone)}>
        <Icon aria-hidden className="size-3.5" />
        {s.status[status] ?? s.status.needs_more_information}
      </span>

      {/* The scheme's own text is English, whatever the page language. */}
      <h5 id={titleId} lang="en" className="mt-3 text-xl font-extrabold tracking-tight text-balance text-foreground">
        {scheme.name}
        {scheme.shortName && scheme.shortName !== scheme.name && (
          <span className="ml-2 text-base font-bold text-muted-foreground">({scheme.shortName})</span>
        )}
      </h5>

      {unverified && (
        <p className="mt-3 flex items-start gap-3 rounded-xl bg-warning-soft p-3 text-sm font-semibold text-warning-foreground">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{s.card.unverified}</span>
        </p>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
        <div className="min-w-0">
          <p lang="en" className="text-[15px] text-pretty text-foreground/90">
            {scheme.summary}
          </p>

          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold text-muted-foreground">{s.card.agency}</dt>
              <dd lang="en" className="mt-0.5 font-medium">
                {scheme.implementingAgency}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted-foreground">{s.card.type}</dt>
              <dd className="mt-0.5 font-medium">{s.card.types[scheme.schemeType] ?? scheme.schemeType}</dd>
            </div>
            {loanRange && (
              <div>
                <dt className="text-xs font-bold text-muted-foreground">{s.card.loanRange}</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{loanRange}</dd>
              </div>
            )}
          </dl>

          {benefits.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-muted-foreground">{s.card.benefits}</p>
              <ul lang="en" className="mt-1.5 grid list-disc gap-1 pl-5 text-sm marker:text-muted-foreground">
                {benefits.map((b, i) => (
                  <li key={`${i}-${b}`} className="text-pretty">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid content-start gap-3">
          <div className="rounded-xl bg-muted/70 p-4">
            <p className="text-sm font-bold text-foreground tabular-nums">
              {total > 0 ? tf(s.card.confirmed, { n: confirmed, m: total }) : s.card.confirmedNone}
            </p>
            {total > 0 && (
              <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-chart-2" style={{ width: `${(confirmed / total) * 100}%` }} />
              </div>
            )}
            {score !== null && (
              <p className="mt-3 text-xs font-bold text-foreground tabular-nums" title={s.card.matchCaption}>
                {tf(s.card.matchScore, { n: score })}
              </p>
            )}
            <p className="mt-1 text-xs text-pretty text-muted-foreground">{s.card.matchCaption}</p>
          </div>

          {missing.length > 0 && (
            <div className="rounded-xl bg-pastel-sky p-4 text-deep-sky">
              <p className="text-sm font-bold">{s.card.missingHeading}</p>
              <p className="mt-0.5 text-xs">{s.card.missingIntro}</p>
              <div className="mt-3">
                <MissingFields s={s} fields={missing} onAnswerField={onAnswerField} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <CriterionList s={s} criteria={criteria} />
      </div>

      <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm">
        {scheme.howToApply && (
          <div>
            <p className="text-xs font-bold text-muted-foreground">{s.card.howToApply}</p>
            <p lang="en" className="mt-0.5 text-pretty">
              {scheme.howToApply}
            </p>
          </div>
        )}
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {officialUrl && (
            <li>
              <ExternalAnchor href={officialUrl} newTab={s.card.newTab}>
                {s.card.officialSource}
              </ExternalAnchor>
            </li>
          )}
          {applicationUrl && (
            <li>
              <ExternalAnchor href={applicationUrl} newTab={s.card.newTab}>
                {s.card.apply}
              </ExternalAnchor>
            </li>
          )}
        </ul>
        {otherSources.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground">{s.card.otherSources}</p>
            <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1.5">
              {otherSources.map((src) => (
                <li key={src.url}>
                  <ExternalAnchor href={src.url} newTab={s.card.newTab} english>
                    {src.title}
                  </ExternalAnchor>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!unverified && scheme.lastVerifiedAt && (
          <p className="text-xs text-muted-foreground">{tf(s.card.lastChecked, { date: formatDate(lang, scheme.lastVerifiedAt) })}</p>
        )}
      </div>
    </article>
  );
}
