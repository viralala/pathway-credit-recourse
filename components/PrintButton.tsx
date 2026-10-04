"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrintButton({ label, className }: { label: string; className?: string }) {
  return (
    <Button type="button" size="lg" onClick={() => window.print()} className={cn("h-10 rounded-xl px-4", className)}>
      <Printer aria-hidden />
      {label}
    </Button>
  );
}
