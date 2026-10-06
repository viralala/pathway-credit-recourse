import type { LoanType } from "@/lib/types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[] | Record<string, unknown> | unknown[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assessments: {
        Row: {
          id: string;
          user_id: string;
          monthly_income: number;
          utilization: number;
          debt_ratio: number;
          age: number | null;
          open_credit_lines: number;
          late_30: number;
          late_60: number;
          late_90: number;
          dependents: number | null;
          real_estate_loans: number | null;
          applicant_name: string | null;
          loan_type: LoanType;
          loan_amount: number;
          collateral_value: number | null;
          ltv: number | null;
          recent_hard_inquiries: number;
          predicted_score: number;
          pd: number;
          decision: "approved" | "declined";
          reasons: Json;
          model_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          monthly_income: number;
          utilization: number;
          debt_ratio: number;
          age?: number | null;
          open_credit_lines: number;
          late_30: number;
          late_60: number;
          late_90: number;
          dependents?: number | null;
          real_estate_loans?: number | null;
          applicant_name?: string | null;
          loan_type?: LoanType;
          loan_amount?: number;
          collateral_value?: number | null;
          ltv?: number | null;
          recent_hard_inquiries?: number;
          predicted_score: number;
          pd: number;
          decision: "approved" | "declined";
          reasons?: Json;
          model_version?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          monthly_income?: number;
          utilization?: number;
          debt_ratio?: number;
          age?: number | null;
          open_credit_lines?: number;
          late_30?: number;
          late_60?: number;
          late_90?: number;
          dependents?: number | null;
          real_estate_loans?: number | null;
          applicant_name?: string | null;
          loan_type?: LoanType;
          loan_amount?: number;
          collateral_value?: number | null;
          ltv?: number | null;
          recent_hard_inquiries?: number;
          predicted_score?: number;
          pd?: number;
          decision?: "approved" | "declined";
          reasons?: Json;
          model_version?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      recourse_plans: {
        Row: {
          id: string;
          assessment_id: string;
          user_id: string;
          target_score: number;
          projected_score: number;
          status: "approved" | "plan" | "infeasible";
          actions: Json;
          estimated_months: number;
          effort_score: number;
          flips_decision: boolean;
          target_features: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          user_id: string;
          target_score: number;
          projected_score: number;
          status?: "approved" | "plan" | "infeasible";
          actions?: Json;
          estimated_months: number;
          effort_score: number;
          flips_decision?: boolean;
          target_features?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          user_id?: string;
          target_score?: number;
          projected_score?: number;
          status?: "approved" | "plan" | "infeasible";
          actions?: Json;
          estimated_months?: number;
          effort_score?: number;
          flips_decision?: boolean;
          target_features?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recourse_plans_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recourse_plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      simulations: {
        Row: {
          id: string;
          assessment_id: string;
          user_id: string;
          likely_month: number | null;
          best_month: number | null;
          worst_month: number | null;
          simulation_count: number;
          approval_within_horizon: number | null;
          simulation_result: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          user_id: string;
          likely_month?: number | null;
          best_month?: number | null;
          worst_month?: number | null;
          simulation_count?: number;
          approval_within_horizon?: number | null;
          simulation_result?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          user_id?: string;
          likely_month?: number | null;
          best_month?: number | null;
          worst_month?: number | null;
          simulation_count?: number;
          approval_within_horizon?: number | null;
          simulation_result?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "simulations_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "simulations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      pricing_results: {
        Row: {
          id: string;
          assessment_id: string;
          user_id: string;
          loan_amount: number;
          loan_term_months: number;
          current_apr: number;
          projected_apr: number;
          current_emi: number;
          projected_emi: number;
          current_interest: number;
          projected_interest: number;
          estimated_savings: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          user_id: string;
          loan_amount: number;
          loan_term_months: number;
          current_apr: number;
          projected_apr: number;
          current_emi: number;
          projected_emi: number;
          current_interest: number;
          projected_interest: number;
          estimated_savings: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          user_id?: string;
          loan_amount?: number;
          loan_term_months?: number;
          current_apr?: number;
          projected_apr?: number;
          current_emi?: number;
          projected_emi?: number;
          current_interest?: number;
          projected_interest?: number;
          estimated_savings?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pricing_results_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pricing_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      outcomes: {
        Row: {
          id: string;
          assessment_id: string;
          user_id: string;
          actual_outcome: string;
          actual_score: number | null;
          outcome_date: string;
          verified: boolean;
          verified_at: string | null;
          verified_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          user_id: string;
          actual_outcome: string;
          actual_score?: number | null;
          outcome_date?: string;
          verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          user_id?: string;
          actual_outcome?: string;
          actual_score?: number | null;
          outcome_date?: string;
          verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outcomes_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outcomes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_plans: {
        Row: {
          id: string;
          user_id: string;
          applicant: Json;
          name: string | null;
          target_score: number;
          lang: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          applicant: Json;
          name?: string | null;
          target_score?: number;
          lang?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          applicant?: Json;
          name?: string | null;
          target_score?: number;
          lang?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_checkins: {
        Row: {
          id: string;
          plan_id: string;
          user_id: string;
          month: number;
          score: number;
          applicant: Json;
          completed: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          user_id?: string;
          month?: number;
          score?: number;
          applicant?: Json;
          completed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          user_id?: string;
          month?: number;
          score?: number;
          applicant?: Json;
          completed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      aa_consents: {
        Row: {
          id: string;
          user_id: string;
          consent_id: string;
          status: "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED" | "EXPIRED" | "FAILED";
          purpose: string;
          redirect_url: string | null;
          fiu_id: string | null;
          session_id: string | null;
          normalized_data: Json | null;
          requested_at: string;
          approved_at: string | null;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consent_id: string;
          status?: "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED" | "EXPIRED" | "FAILED";
          purpose?: string;
          redirect_url?: string | null;
          fiu_id?: string | null;
          session_id?: string | null;
          normalized_data?: Json | null;
          requested_at?: string;
          approved_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          consent_id?: string;
          status?: "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED" | "EXPIRED" | "FAILED";
          purpose?: string;
          redirect_url?: string | null;
          fiu_id?: string | null;
          session_id?: string | null;
          normalized_data?: Json | null;
          requested_at?: string;
          approved_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aa_consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      government_schemes: {
        Row: {
          id: string;
          name: string;
          slug: string;
          short_description: string;
          description: string;
          government_level: "central" | "state";
          ministry: string | null;
          state: string | null;
          category: string;
          purposes: Json;
          beneficiary_types: Json;
          benefits: Json;
          eligibility_rules: Json;
          required_documents: Json;
          application_url: string | null;
          official_source_url: string;
          source_type: "official_gazette" | "ministry_portal" | "open_data" | "myScheme_reference";
          source_name: string;
          version: string;
          effective_from: string | null;
          effective_until: string | null;
          last_verified_at: string;
          active: boolean;
          priority: number;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          short_description: string;
          description: string;
          government_level: "central" | "state";
          ministry?: string | null;
          state?: string | null;
          category: string;
          purposes?: Json;
          beneficiary_types?: Json;
          benefits?: Json;
          eligibility_rules: Json;
          required_documents?: Json;
          application_url?: string | null;
          official_source_url: string;
          source_type?: "official_gazette" | "ministry_portal" | "open_data" | "myScheme_reference";
          source_name: string;
          version?: string;
          effective_from?: string | null;
          effective_until?: string | null;
          last_verified_at?: string;
          active?: boolean;
          priority?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          short_description?: string;
          description?: string;
          government_level?: "central" | "state";
          ministry?: string | null;
          state?: string | null;
          category?: string;
          purposes?: Json;
          beneficiary_types?: Json;
          benefits?: Json;
          eligibility_rules?: Json;
          required_documents?: Json;
          application_url?: string | null;
          official_source_url?: string;
          source_type?: "official_gazette" | "ministry_portal" | "open_data" | "myScheme_reference";
          source_name?: string;
          version?: string;
          effective_from?: string | null;
          effective_until?: string | null;
          last_verified_at?: string;
          active?: boolean;
          priority?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      government_scheme_matches: {
        Row: {
          id: string;
          user_id: string;
          assessment_id: string | null;
          scheme_id: string;
          match_status: "likely_match" | "potential_match" | "insufficient_information" | "not_matching" | "expired" | "inactive";
          match_strength: number;
          matched_criteria: Json;
          unmet_criteria: Json;
          missing_information: Json;
          scheme_version: string;
          matched_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assessment_id?: string | null;
          scheme_id: string;
          match_status: "likely_match" | "potential_match" | "insufficient_information" | "not_matching" | "expired" | "inactive";
          match_strength: number;
          matched_criteria?: Json;
          unmet_criteria?: Json;
          missing_information?: Json;
          scheme_version?: string;
          matched_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assessment_id?: string | null;
          scheme_id?: string;
          match_status?: "likely_match" | "potential_match" | "insufficient_information" | "not_matching" | "expired" | "inactive";
          match_strength?: number;
          matched_criteria?: Json;
          unmet_criteria?: Json;
          missing_information?: Json;
          scheme_version?: string;
          matched_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "government_scheme_matches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "government_scheme_matches_scheme_id_fkey";
            columns: ["scheme_id"];
            isOneToOne: false;
            referencedRelation: "government_schemes";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      submit_partner_enquiry: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      delete_my_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type AssessmentRow = Database["public"]["Tables"]["assessments"]["Row"];
export type RecoursePlanRow = Database["public"]["Tables"]["recourse_plans"]["Row"];
export type SimulationRow = Database["public"]["Tables"]["simulations"]["Row"];
export type PricingResultRow = Database["public"]["Tables"]["pricing_results"]["Row"];
export type OutcomeRow = Database["public"]["Tables"]["outcomes"]["Row"];
export type SavedPlanRow = Database["public"]["Tables"]["saved_plans"]["Row"];
export type CheckinRow = Database["public"]["Tables"]["plan_checkins"]["Row"];
export type AAConsentRow = Database["public"]["Tables"]["aa_consents"]["Row"];
export type GovernmentSchemeRow = Database["public"]["Tables"]["government_schemes"]["Row"];
export type GovernmentSchemeMatchRow = Database["public"]["Tables"]["government_scheme_matches"]["Row"];
