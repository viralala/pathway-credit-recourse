"use client";

import { useSyncExternalStore } from "react";
import { CURSOR_STORAGE_KEY, getConsentSnapshot, subscribeConsent } from "@/lib/consent";

/**
 * Shared on/off state for the money cursor, read by <MoneyCursor> and <CursorToggle>.
 *
 * - Default is "on" (for fine pointers; see `supported`).
 * - A choice made this visit lives in memory. It is written to localStorage ("pathway_cursor")
 *   only while functional consent is granted, and read back from there only then.
 * - Granting functional consent later persists the choice already made this visit.
 * - `supported` is false for coarse (touch) primary pointers and when the OS asks for reduced
 *   motion, so the cursor and its toggle disappear there.
 */

export type CursorPref = "on" | "off";

const listeners = new Set<() => void>();
let memory: CursorPref | null = null;

const functionalAllowed = () => getConsentSnapshot()?.functional === true;

function stored(): CursorPref | null {
  if (!functionalAllowed()) return null;
  try {
    const v = localStorage.getItem(CURSOR_STORAGE_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

function persist(pref: CursorPref) {
  if (!functionalAllowed()) return;
  try {
    localStorage.setItem(CURSOR_STORAGE_KEY, pref);
  } catch {
    // Storage unavailable: the in-memory choice still applies for this visit.
  }
}

function getPref(): CursorPref {
  return memory ?? stored() ?? "on";
}

function emit() {
  for (const l of [...listeners]) l();
}

function subscribePref(listener: () => void): () => void {
  listeners.add(listener);
  const offConsent = subscribeConsent(() => {
    if (memory) persist(memory);
    listener();
  });
  const onStorage = (e: StorageEvent) => {
    if (e.key === CURSOR_STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    offConsent();
    window.removeEventListener("storage", onStorage);
  };
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

function getSupported(): boolean {
  return window.matchMedia(FINE_POINTER).matches && !window.matchMedia(REDUCED_MOTION).matches;
}

function subscribeSupported(listener: () => void): () => void {
  const queries = [window.matchMedia(REDUCED_MOTION), window.matchMedia(FINE_POINTER)];
  for (const q of queries) q.addEventListener("change", listener);
  return () => {
    for (const q of queries) q.removeEventListener("change", listener);
  };
}

export function setMoneyCursor(on: boolean): void {
  memory = on ? "on" : "off";
  persist(memory);
  emit();
}

export function toggleMoneyCursor(): void {
  setMoneyCursor(getPref() !== "on");
}

const serverPref = (): CursorPref => "off";
const serverSupported = () => false;

/**
 *   supported  this device can show it (fine pointer, motion allowed). False on the server.
 *   enabled    the visitor's on/off preference.
 *   active     supported && enabled: render the cursor.
 */
export function useMoneyCursor(): { supported: boolean; enabled: boolean; active: boolean } {
  const pref = useSyncExternalStore(subscribePref, getPref, serverPref);
  const supported = useSyncExternalStore(subscribeSupported, getSupported, serverSupported);
  const enabled = pref === "on";
  return { supported, enabled, active: supported && enabled };
}
