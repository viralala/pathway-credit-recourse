"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { submitEnquiry, type EnquiryState } from "@/app/partners/actions";
import { withLang } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Lang } from "@/lib/i18n";
import { ENQUIRY_KINDS, ENQUIRY_LIMITS, type EnquiryField } from "@/lib/security/accountInput";
import { accountStrings } from "@/lib/strings/account";
import { cn } from "@/lib/utils";

const FIELD = "h-11 rounded-lg bg-background";

export function EnquiryForm({ lang }: { lang: Lang }) {
  const s = accountStrings(lang).partners;
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, { status: "idle" });
  const id = useId();
  const errors = state.status === "invalid" ? state.errors : {};
  const err = (f: EnquiryField) =>
    errors[f] ? (
      <p id={`${id}-${f}-error`} className="text-sm text-destructive">
        {s.errors[f]}
      </p>
    ) : null;
  const described = (f: EnquiryField) => (errors[f] ? `${id}-${f}-error` : undefined);

  if (state.status === "sent") {
    return (
      <p role="status" className="rounded-xl bg-success-soft px-4 py-4 text-success-foreground">
        {s.sent}
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-5" noValidate>
      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-name`}>{s.name}</Label>
          <Input id={`${id}-name`} name="name" autoComplete="name" maxLength={ENQUIRY_LIMITS.name} required aria-invalid={!!errors.name} aria-describedby={described("name")} className={FIELD} />
          {err("name")}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-org`}>{s.organisation}</Label>
          <Input id={`${id}-org`} name="organisation" autoComplete="organization" maxLength={ENQUIRY_LIMITS.organisation} required aria-invalid={!!errors.organisation} aria-describedby={described("organisation")} className={FIELD} />
          {err("organisation")}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-email`}>{s.email}</Label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={ENQUIRY_LIMITS.email} required aria-invalid={!!errors.email} aria-describedby={described("email")} className={FIELD} />
        {err("email")}
      </div>

      <fieldset className="grid gap-2" aria-describedby={described("kind")}>
        <legend className="mb-1 text-sm font-medium">{s.kind}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ENQUIRY_KINDS.map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm has-checked:border-primary has-checked:bg-secondary">
              <input type="radio" name="kind" value={k} required className="size-4 accent-[var(--primary)]" />
              {s.kinds[k]}
            </label>
          ))}
        </div>
        {err("kind")}
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-message`}>
          {s.message} <span className="font-normal text-muted-foreground">({s.optional})</span>
        </Label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={4}
          maxLength={ENQUIRY_LIMITS.message}
          aria-invalid={!!errors.message}
          aria-describedby={described("message")}
          className={cn(
            "w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
          )}
        />
        {err("message")}
      </div>

      {state.status === "error" ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-foreground">
          {s.errors[state.code]}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" className="h-11 px-6 font-bold" disabled={pending} aria-busy={pending}>
          {pending ? s.sending : s.send}
        </Button>
        <p className="text-xs text-muted-foreground">
          <Link href={withLang("/privacy", lang)} className="underline underline-offset-4">
            {s.privacy}
          </Link>
        </p>
      </div>
    </form>
  );
}
