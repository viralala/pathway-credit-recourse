"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Landmark, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { tf, type Lang } from "@/lib/i18n";
import { connectStrings, type ConnectStrings } from "@/lib/strings/connect";
import { cn } from "@/lib/utils";
import type { AAFetchResult, AAMode, DemoProfile } from "@/lib/aa/types";

type Step = "loading" | "start" | "consent" | "waiting" | "fetching" | "done" | "declined" | "error";
type ErrKey = keyof ConnectStrings["errors"];
type RetryTarget = "config" | "start" | "fetch";

const PROFILES: DemoProfile[] = ["salaried", "stretched", "thin-file"];
const POLL_EVERY_MS = 3000;
const POLL_FOR_MS = 3 * 60 * 1000;
const LOCALES: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; network: boolean };

/** Reads the app's { success, data } envelope. Never throws: a dropped connection comes back as `network: true`. */
async function api<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (res.ok && json && typeof json === "object" && (json as { success?: unknown }).success === true) {
      return { ok: true, data: (json as { data: T }).data };
    }
    return { ok: false, status: res.status, network: false };
  } catch {
    return { ok: false, status: 0, network: true };
  }
}

/** The specific reason when the cause is the connection or rate limiting, otherwise the stage's own message. */
function reason(res: { status: number; network: boolean }, fallback: ErrKey): ErrKey {
  if (res.network) return "network";
  if (res.status === 429) return "rateLimit";
  return fallback;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function formatDate(lang: Lang, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALES[lang], { dateStyle: "medium", timeZone: "UTC" }).format(d);
}

/** Only ever open a secure link handed back by the consent API. */
function openApproval(url: string | null): boolean {
  if (!url) return false;
  try {
    if (new URL(url).protocol !== "https:") return false;
  } catch {
    return false;
  }
  const win = window.open(url, "_blank");
  if (!win) return false;
  win.opener = null;
  return true;
}

/** Card plus dialog that fills the applicant form from the bank through the Account Aggregator flow. */
export function ConnectBank({ lang, onFilled }: { lang: Lang; onFilled: (result: AAFetchResult) => void }) {
  const s = connectStrings(lang);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("loading");
  const [mode, setMode] = useState<AAMode | null>(null);
  const [profile, setProfile] = useState<DemoProfile>("salaried");
  const [mobile, setMobile] = useState("");
  const [mobileTouched, setMobileTouched] = useState(false);
  const [consent, setConsent] = useState<{ id: string; redirectUrl: string | null } | null>(null);
  const [result, setResult] = useState<AAFetchResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ key: ErrKey; retry: RetryTarget } | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  /** Bumped to cancel any request or poll still in flight (dialog closed, user went back, new attempt). */
  const run = useRef(0);
  useEffect(() => {
    return () => {
      run.current += 1;
    };
  }, []);

  // A gentle checklist while the data request is in flight. The last step stays "in progress" until the response lands.
  const stepCount = s.fetchingSteps.length;
  useEffect(() => {
    if (step !== "fetching") return;
    const timer = setInterval(() => setProgress((p) => Math.min(p + 1, stepCount - 1)), 900);
    return () => clearInterval(timer);
  }, [step, stepCount]);

  const mobileValid = /^\d{10}$/.test(mobile);

  function fail(key: ErrKey, retry: RetryTarget) {
    setFailure({ key, retry });
    setBusy(false);
    setStep("error");
  }

  async function loadConfig() {
    const r = ++run.current;
    setStep("loading");
    const res = await api<{ mode: AAMode }>("/api/aa/config");
    if (r !== run.current) return;
    if (!res.ok) return fail(reason(res, "config"), "config");
    setMode(res.data.mode);
    setStep("start");
  }

  async function fetchData(id: string) {
    const r = ++run.current;
    setProgress(0);
    setStep("fetching");
    const res = await api<AAFetchResult>(`/api/aa/data/${encodeURIComponent(id)}`);
    if (r !== run.current) return;
    if (!res.ok) return fail(reason(res, "fetch"), "fetch");
    setResult(res.data);
    setStep("done");
  }

  async function pollConsent(id: string, r: number) {
    const deadline = Date.now() + POLL_FOR_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_EVERY_MS);
      if (r !== run.current) return;
      const res = await api<{ status: "PENDING" | "ACTIVE" | "REJECTED" | "EXPIRED" }>(`/api/aa/consent/${encodeURIComponent(id)}`);
      if (r !== run.current) return;
      if (!res.ok) {
        // A dropped connection, rate limit or server hiccup should not end the wait; anything else will not fix itself.
        if (res.network || res.status === 429 || res.status >= 500) continue;
        return fail("consent", "start");
      }
      const status = res.data.status;
      if (status === "ACTIVE") return void fetchData(id);
      if (status === "REJECTED") return fail("rejected", "start");
      if (status === "EXPIRED") return fail("expired", "start");
    }
    fail("timeout", "start");
  }

  async function createConsent() {
    if (!mode) return;
    if (mode === "setu" && !mobileValid) {
      setMobileTouched(true);
      return;
    }
    const r = ++run.current;
    setBusy(true);
    const res = await api<{ consentId: string; redirectUrl: string | null }>(
      "/api/aa/consent",
      mode === "sandbox" ? { demoProfile: profile } : { mobile },
    );
    if (r !== run.current) return;
    if (!res.ok) return fail(reason(res, !res.network && res.status === 400 && mode === "setu" ? "mobile" : "consent"), "start");
    setBusy(false);
    setConsent({ id: res.data.consentId, redirectUrl: res.data.redirectUrl });
    if (mode === "sandbox") {
      setStep("consent");
      return;
    }
    setPopupBlocked(!openApproval(res.data.redirectUrl));
    setStep("waiting");
    void pollConsent(res.data.consentId, r);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    run.current += 1;
    setBusy(false);
    if (!next) {
      // The number is only needed to create one consent; do not keep it around.
      setMobile("");
      return;
    }
    setFailure(null);
    setResult(null);
    setConsent(null);
    setMobileTouched(false);
    setPopupBlocked(false);
    if (mode) setStep("start");
    else void loadConfig();
  }

  function retry() {
    if (!failure) return;
    if (failure.retry === "config") void loadConfig();
    else if (failure.retry === "fetch" && consent) void fetchData(consent.id);
    else setStep("start");
  }

  function back() {
    run.current += 1;
    setStep("start");
  }

  function applyData() {
    if (!result) return;
    onFilled(result);
    handleOpenChange(false);
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:gap-5">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-pastel-periwinkle text-deep-periwinkle">
          <Landmark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-foreground">{s.cardTitle}</h3>
          <p className="mt-0.5 text-[15px] text-pretty text-muted-foreground">{s.cardBody}</p>
        </div>
        <Button type="button" size="lg" className="shrink-0 sm:self-center" onClick={() => handleOpenChange(true)}>
          {s.open}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => step === "waiting" && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{s.dialogTitle}</DialogTitle>
            <DialogDescription>{s.dialogDesc}</DialogDescription>
          </DialogHeader>

          <div aria-live="polite" className="grid gap-4">
            {step === "loading" && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />
                {s.loadingConfig}
              </p>
            )}

            {step === "start" && mode === "sandbox" && (
              <fieldset className="grid gap-3">
                <legend className="mb-1 font-semibold text-foreground">{s.profilesLabel}</legend>
                <RadioGroup value={profile} onValueChange={(v) => setProfile(v as DemoProfile)} aria-label={s.profilesLabel}>
                  {PROFILES.map((p) => (
                    <Label
                      key={p}
                      htmlFor={`aa-profile-${p}`}
                      className={cn(
                        "items-start gap-3 rounded-xl p-3 leading-normal ring-1 ring-foreground/10 transition-colors",
                        profile === p ? "bg-pastel-periwinkle/50 ring-primary/40" : "hover:bg-muted/50",
                      )}
                    >
                      <RadioGroupItem id={`aa-profile-${p}`} value={p} className="mt-0.5" />
                      <span className="grid gap-0.5">
                        <span className="font-semibold text-foreground">{s.profiles[p].title}</span>
                        <span className="font-normal text-muted-foreground">{s.profiles[p].desc}</span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
                <p className="flex items-start gap-2 rounded-xl bg-pastel-butter p-3 text-deep-butter">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>{s.sandboxNote}</span>
                </p>
              </fieldset>
            )}

            {step === "start" && mode === "setu" && (
              <div className="grid gap-2">
                <Label htmlFor="aa-mobile">{s.mobileLabel}</Label>
                <Input
                  id="aa-mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onBlur={() => setMobileTouched(true)}
                  aria-invalid={mobileTouched && !mobileValid}
                  aria-describedby="aa-mobile-hint"
                />
                <p
                  id="aa-mobile-hint"
                  className={cn("text-sm", mobileTouched && !mobileValid ? "text-destructive" : "text-muted-foreground")}
                >
                  {mobileTouched && !mobileValid ? s.mobileInvalid : s.mobileHint}
                </p>
              </div>
            )}

            {step === "consent" && (
              <div className="grid gap-3">
                <h4 className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck aria-hidden className="size-4 text-deep-mint" />
                  {s.consentTitle}
                </h4>
                <p className="text-muted-foreground">{s.consentIntro}</p>
                <dl className="grid gap-px overflow-hidden rounded-xl bg-foreground/10 ring-1 ring-foreground/10">
                  {(["who", "purpose", "data", "duration", "storage"] as const).map((k) => (
                    <div key={k} className="grid gap-0.5 bg-card p-3 sm:grid-cols-[8rem_1fr] sm:gap-3">
                      <dt className="font-semibold text-foreground">{s.consentRows[k].label}</dt>
                      <dd className="text-muted-foreground">{s.consentRows[k].value}</dd>
                    </div>
                  ))}
                </dl>
                {mode === "sandbox" && <p className="text-sm text-muted-foreground">{s.sandboxNote}</p>}
              </div>
            )}

            {step === "waiting" && (
              <div className="grid gap-3">
                <h4 className="flex items-center gap-2 font-semibold text-foreground">
                  <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />
                  {s.waitingTitle}
                </h4>
                <p className="text-muted-foreground">{s.waitingBody}</p>
                {popupBlocked && (
                  <p role="alert" className="rounded-xl bg-pastel-butter p-3 text-deep-butter">
                    {s.errors.popup}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="justify-self-start"
                  onClick={() => setPopupBlocked(!openApproval(consent?.redirectUrl ?? null))}
                >
                  {popupBlocked ? s.waitingOpen : s.waitingReopen}
                </Button>
                <p className="text-sm text-muted-foreground">{s.waitingTimer}</p>
              </div>
            )}

            {step === "fetching" && (
              <div className="grid gap-3">
                <h4 className="font-semibold text-foreground">{s.fetchingTitle}</h4>
                <ol className="grid gap-2">
                  {s.fetchingSteps.map((label, i) => {
                    const done = i < progress;
                    const active = i === progress;
                    return (
                      <li
                        key={label}
                        aria-current={active ? "step" : undefined}
                        className={cn("flex items-center gap-2.5", done || active ? "text-foreground" : "text-muted-foreground")}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-5 shrink-0 place-items-center rounded-full",
                            done ? "bg-success-soft text-success-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {done ? <Check className="size-3" /> : active ? <Loader2 className="size-3 motion-safe:animate-spin" /> : null}
                        </span>
                        {label}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {step === "done" && result && (
              <div className="grid gap-3">
                <h4 className="flex items-center gap-2 font-semibold text-foreground">
                  <Check aria-hidden className="size-4 text-success-foreground" />
                  {s.doneTitle}
                </h4>
                <p className="text-muted-foreground">{s.doneBody}</p>
                <p className="text-sm">
                  <span className="font-semibold text-foreground">{s.periodLabel}: </span>
                  <span className="text-muted-foreground">
                    {tf(s.period, { from: formatDate(lang, result.period.from), to: formatDate(lang, result.period.to) })}
                  </span>
                </p>
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-foreground">{s.accountsLabel}</p>
                  <ul className="grid gap-2">
                    {result.accounts.map((a) => (
                      <li
                        key={`${a.kind}-${a.masked}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 ring-1 ring-foreground/10"
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-foreground">{a.institution}</span>
                          <span className="block text-sm text-muted-foreground">{s.kinds[a.kind]}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{a.masked}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {step === "declined" && (
              <div className="grid gap-1">
                <h4 className="font-semibold text-foreground">{s.declinedTitle}</h4>
                <p className="text-muted-foreground">{s.declinedBody}</p>
              </div>
            )}

            {step === "error" && failure && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-danger-foreground">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{s.errors[failure.key]}</span>
              </p>
            )}
          </div>

          {step !== "loading" && step !== "fetching" && (
            <DialogFooter>
              {step === "start" && (
                <Button type="button" onClick={() => void createConsent()} disabled={busy || !mode}>
                  {busy ? s.working : s.continue}
                </Button>
              )}
              {step === "consent" && consent && (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep("declined")}>
                    {s.decline}
                  </Button>
                  <Button type="button" onClick={() => void fetchData(consent.id)}>
                    {s.approve}
                  </Button>
                </>
              )}
              {step === "waiting" && (
                <Button type="button" variant="outline" onClick={back}>
                  {s.back}
                </Button>
              )}
              {step === "done" && (
                <Button type="button" onClick={applyData}>
                  {s.use}
                </Button>
              )}
              {step === "declined" && (
                <Button type="button" variant="outline" onClick={back}>
                  {s.startAgain}
                </Button>
              )}
              {step === "error" && (
                <Button type="button" onClick={retry}>
                  {s.retry}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
