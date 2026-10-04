"use client";

import { Cookie, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OPEN_CONSENT_EVENT, readConsent, useConsent, writeConsent } from "@/lib/consent";
import { shell } from "@/lib/strings/shell";
import { withLang } from "./nav";
import { useLang } from "./use-lang";

const bannerButton = "h-auto min-h-10 rounded-xl px-3 py-2 text-center leading-snug whitespace-normal";

/** Move focus to the page's main landmark (used when the control that had focus disappears). */
function focusMain() {
  document.getElementById("main")?.focus({ preventScroll: true });
}

/**
 * Cookie banner + settings dialog.
 *   - Banner (bottom, non-blocking) until a decision exists, with three equally weighted buttons.
 *   - Dialog opens from "Customize" or from anywhere via openConsentSettings() (footer link).
 *   - Renders nothing on the server or before hydration (no mismatch, no flash for returning visitors).
 * Uses useSearchParams via useLang: mount inside <Suspense>.
 */
export function CookieConsent() {
  const lang = useLang();
  const s = shell(lang).consent;
  const { ready, consent } = useConsent();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const banner = useRef<HTMLElement>(null);
  const clearTimer = useRef<number | undefined>(undefined);
  const ids = useId();
  const bodyId = `${ids}-body`;
  const necessaryId = `${ids}-necessary`;
  const necessaryDesc = `${ids}-necessary-desc`;
  const functionalId = `${ids}-functional`;
  const functionalDesc = `${ids}-functional-desc`;

  const openSettings = () => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFunctional(readConsent()?.functional ?? false);
    setOpen(true);
  };
  const onOpenRequest = useEffectEvent(openSettings);

  useEffect(() => {
    const handler = () => onOpenRequest();
    window.addEventListener(OPEN_CONSENT_EVENT, handler);
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, handler);
      window.clearTimeout(clearTimer.current);
    };
  }, []);

  const decide = (allowFunctional: boolean, fromBanner: boolean) => {
    writeConsent(allowFunctional);
    setOpen(false);
    setAnnouncement(s.saved);
    window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setAnnouncement(""), 5000);
    // The banner is about to unmount with the button that had focus: hand focus to the page.
    if (fromBanner) focusMain();
  };

  const showBanner = ready && consent === null;

  return (
    <>
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      <AnimatePresence>
        {showBanner && (
          <motion.section
            key="cookie-banner"
            ref={banner}
            lang={lang}
            aria-label={s.regionLabel}
            aria-describedby={bodyId}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="no-print fixed right-4 bottom-4 left-4 z-40 rounded-2xl border border-border bg-card/95 p-4 text-card-foreground shadow-[0_12px_32px_-18px_rgb(42_40_56/0.28)] backdrop-blur max-sm:pointer-fine:left-18 sm:right-6 sm:bottom-6 sm:left-auto sm:w-full sm:max-w-lg sm:p-5 print:hidden"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-pastel-butter text-deep-butter"
              >
                <Cookie className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold text-foreground">
                  {s.title}
                </h2>
                <p id={bodyId} className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {s.body}{" "}
                  <Link
                    href={withLang("/privacy#cookies", lang)}
                    hrefLang="en"
                    className="rounded-sm font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {s.learnMore}
                  </Link>
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              {/* Same variant and size for all three: declining is exactly as easy as accepting. */}
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => decide(true, true)}
                className={bannerButton}
              >
                {s.acceptAll}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => decide(false, true)}
                className={bannerButton}
              >
                {s.necessaryOnly}
              </Button>
              <Button type="button" variant="secondary" size="lg" onClick={openSettings} className={bannerButton}>
                {s.customize}
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          lang={lang}
          showCloseButton={false}
          className="gap-5 sm:max-w-lg"
          onCloseAutoFocus={(e) => {
            // Return focus to whatever opened the dialog, unless it is gone or is the banner that
            // is leaving now that a decision exists; then hand focus to the page instead.
            const o = opener.current;
            const leaving = !!o && !!banner.current?.contains(o) && readConsent() !== null;
            if (!o || !o.isConnected || leaving) {
              e.preventDefault();
              focusMain();
            }
          }}
        >
          <DialogHeader className="pr-10">
            <DialogTitle className="text-lg leading-snug font-bold">{s.dialogTitle}</DialogTitle>
            <DialogDescription className="leading-relaxed">{s.dialogBody}</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 rounded-full"
              aria-label={s.close}
            >
              <X aria-hidden="true" />
            </Button>
          </DialogClose>

          <ul className="space-y-3">
            <li className="flex items-start justify-between gap-4 rounded-xl bg-muted/60 p-4 ring-1 ring-foreground/5">
              <div className="min-w-0">
                <Label htmlFor={necessaryId} className="text-sm font-bold">
                  {s.necessaryTitle}
                </Label>
                <p id={necessaryDesc} className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {s.necessaryBody}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                <Switch id={necessaryId} checked disabled aria-describedby={necessaryDesc} />
                <span className="text-[11px] font-semibold text-success-foreground">{s.alwaysOn}</span>
              </div>
            </li>
            <li className="flex items-start justify-between gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="min-w-0">
                <Label htmlFor={functionalId} className="text-sm font-bold">
                  {s.functionalTitle}
                </Label>
                <p id={functionalDesc} className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {s.functionalBody}
                </p>
              </div>
              <div className="shrink-0 pt-0.5">
                <Switch
                  id={functionalId}
                  checked={functional}
                  onCheckedChange={setFunctional}
                  aria-describedby={functionalDesc}
                />
              </div>
            </li>
          </ul>

          <p className="flex items-start gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-[13px] leading-relaxed text-success-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {s.noTracking}
          </p>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" size="lg" onClick={() => decide(false, false)}>
                {s.necessaryOnly}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => decide(true, false)}>
                {s.acceptAll}
              </Button>
            </div>
            <Button type="button" size="lg" onClick={() => decide(functional, false)}>
              {s.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
