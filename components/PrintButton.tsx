"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-orange px-5 py-2.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5"
    >
      {label}
    </button>
  );
}
