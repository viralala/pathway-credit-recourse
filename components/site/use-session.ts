"use client";

import { useSyncExternalStore } from "react";
import { ACCOUNTS_ENABLED } from "@/lib/supabase/config";

/**
 * Who is signed in, for static pages. Asks /api/session once per page load and shares the answer
 * with every component, without a provider. When accounts are switched off for this deployment
 * (no Supabase variables at build time) it never asks and reports `enabled: false`.
 */
export interface SessionState {
  /** False until the answer is known, so nothing account-related flashes in and out. */
  ready: boolean;
  enabled: boolean;
  signedIn: boolean;
  name: string | null;
}

const OFF: SessionState = { ready: true, enabled: false, signedIn: false, name: null };
const LOADING: SessionState = { ready: false, enabled: true, signedIn: false, name: null };

let state: SessionState = ACCOUNTS_ENABLED ? LOADING : OFF;
let started = false;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  for (const l of [...listeners]) l();
}

function load() {
  if (started || !ACCOUNTS_ENABLED) return;
  started = true;
  fetch("/api/session", { cache: "no-store", credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { enabled?: unknown; signedIn?: unknown; name?: unknown } | null) =>
      set({
        ready: true,
        enabled: j?.enabled === true,
        signedIn: j?.signedIn === true,
        name: typeof j?.name === "string" ? j.name : null,
      }),
    )
    .catch(() => set({ ready: true, enabled: true, signedIn: false, name: null }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot = () => (ACCOUNTS_ENABLED ? LOADING : OFF);

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state, serverSnapshot);
}
