import type { Lang } from "@/lib/i18n";
import type { Applicant } from "@/lib/types";

/** Rows as the app reads them (see supabase/migrations). */
export interface SavedPlanRow {
  id: string;
  name: string;
  applicant: Applicant;
  lang: Lang;
  created_at: string;
  updated_at: string;
}

export interface CheckinRow {
  id: string;
  plan_id: string;
  applicant: Applicant;
  score: number;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  created_at: string;
}
