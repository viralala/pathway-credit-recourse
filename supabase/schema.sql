-- ==============================================================================
-- PATHWAY CREDIT RECOURSE - COMPLETE DATABASE SCHEMA (FOR SUPABASE SQL EDITOR)
-- ==============================================================================

-- 1. PROFILES TABLE (Mirrors Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ASSESSMENTS TABLE (Persists Model Inferences & Input Features)
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Model input features (from lib/types.ts & lib/model.ts)
  monthly_income NUMERIC NOT NULL CHECK (monthly_income >= 0),
  utilization NUMERIC NOT NULL CHECK (utilization >= 0),
  debt_ratio NUMERIC NOT NULL CHECK (debt_ratio >= 0),
  age NUMERIC CHECK (age >= 18), -- no longer a model input; kept nullable for old rows
  open_credit_lines NUMERIC NOT NULL CHECK (open_credit_lines >= 0),
  late_30 NUMERIC NOT NULL CHECK (late_30 >= 0),
  late_60 NUMERIC NOT NULL CHECK (late_60 >= 0),
  late_90 NUMERIC NOT NULL CHECK (late_90 >= 0),
  dependents NUMERIC CHECK (dependents >= 0), -- no longer a model input; kept nullable for old rows
  real_estate_loans NUMERIC CHECK (real_estate_loans >= 0), -- no longer a model input; kept nullable for old rows

  -- Optional applicant context
  applicant_name TEXT,
  loan_type TEXT NOT NULL DEFAULT 'unsecured' CHECK (loan_type IN ('secured', 'unsecured')),
  loan_amount NUMERIC NOT NULL DEFAULT 500000 CHECK (loan_amount > 0),
  collateral_value NUMERIC CHECK (collateral_value IS NULL OR collateral_value > 0),
  ltv NUMERIC CHECK (ltv IS NULL OR ltv >= 0),
  recent_hard_inquiries INTEGER NOT NULL DEFAULT 0 CHECK (recent_hard_inquiries >= 0),

  -- Server-side calculated outputs (Never trusted from client)
  predicted_score NUMERIC NOT NULL,
  pd NUMERIC NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'declined')),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version TEXT NOT NULL DEFAULT 'v1',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RECOURSE PLANS TABLE (Persists Action Plans)
CREATE TABLE IF NOT EXISTS public.recourse_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  target_score NUMERIC NOT NULL,
  projected_score NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'plan' CHECK (status IN ('approved', 'plan', 'infeasible')),
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_months INTEGER NOT NULL CHECK (estimated_months >= 0),
  effort_score NUMERIC NOT NULL CHECK (effort_score >= 0),
  flips_decision BOOLEAN NOT NULL DEFAULT false,
  target_features JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SIMULATIONS TABLE (Persists Monte Carlo & Timeline Projections)
CREATE TABLE IF NOT EXISTS public.simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  likely_month INTEGER,
  best_month INTEGER,
  worst_month INTEGER,
  simulation_count INTEGER NOT NULL DEFAULT 500,
  approval_within_horizon NUMERIC,
  simulation_result JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PRICING RESULTS TABLE (Persists Risk-based Pricing & Savings)
CREATE TABLE IF NOT EXISTS public.pricing_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  loan_amount NUMERIC NOT NULL,
  loan_term_months INTEGER NOT NULL,
  current_apr NUMERIC NOT NULL,
  projected_apr NUMERIC NOT NULL,
  current_emi NUMERIC NOT NULL,
  projected_emi NUMERIC NOT NULL,
  current_interest NUMERIC NOT NULL,
  projected_interest NUMERIC NOT NULL,
  estimated_savings NUMERIC NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. OUTCOMES TABLE (For Ground-Truth Verified Continuous Learning)
CREATE TABLE IF NOT EXISTS public.outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  actual_outcome TEXT NOT NULL,
  actual_score NUMERIC,
  outcome_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. AA CONSENTS TABLE (Setu Account Aggregator Consent Tracking)
CREATE TABLE IF NOT EXISTS public.aa_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED', 'FAILED')),
  purpose TEXT NOT NULL DEFAULT 'Credit assessment and loan recourse planning',
  redirect_url TEXT,
  fiu_id TEXT,
  session_id TEXT,
  normalized_data JSONB,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. GOVERNMENT SCHEMES TABLE (Verified Central & State Credit Schemes)
CREATE TABLE IF NOT EXISTS public.government_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  government_level TEXT NOT NULL CHECK (government_level IN ('central', 'state')),
  ministry TEXT,
  state TEXT,
  category TEXT NOT NULL CHECK (category IN ('business', 'msme', 'artisan', 'agriculture', 'education', 'housing', 'women_entrepreneur', 'general')),
  purposes JSONB NOT NULL DEFAULT '[]'::jsonb,
  beneficiary_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  eligibility_rules JSONB NOT NULL DEFAULT '{"combinator": "AND", "rules": []}'::jsonb,
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  application_url TEXT,
  official_source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'ministry_portal' CHECK (source_type IN ('official_gazette', 'ministry_portal', 'open_data', 'myScheme_reference')),
  source_name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '2026.1',
  effective_from DATE,
  effective_until DATE,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. GOVERNMENT SCHEME MATCHES TABLE (User Assessment Matches)
CREATE TABLE IF NOT EXISTS public.government_scheme_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  scheme_id UUID NOT NULL REFERENCES public.government_schemes(id) ON DELETE CASCADE,
  match_status TEXT NOT NULL CHECK (match_status IN ('likely_match', 'potential_match', 'insufficient_information', 'not_matching', 'expired', 'inactive')),
  match_strength NUMERIC NOT NULL CHECK (match_strength >= 0 AND match_strength <= 100),
  matched_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  unmet_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_information JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheme_version TEXT NOT NULL DEFAULT '2026.1',
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON public.assessments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recourse_plans_assessment_id ON public.recourse_plans(assessment_id);
CREATE INDEX IF NOT EXISTS idx_recourse_plans_user_id ON public.recourse_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_simulations_assessment_id ON public.simulations(assessment_id);
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON public.simulations(user_id);

CREATE INDEX IF NOT EXISTS idx_pricing_results_assessment_id ON public.pricing_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_pricing_results_user_id ON public.pricing_results(user_id);

CREATE INDEX IF NOT EXISTS idx_outcomes_assessment_id ON public.outcomes(assessment_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_user_id ON public.outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_verified ON public.outcomes(verified) WHERE verified = true;

CREATE INDEX IF NOT EXISTS idx_aa_consents_user_id ON public.aa_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_aa_consents_consent_id ON public.aa_consents(consent_id);
CREATE INDEX IF NOT EXISTS idx_aa_consents_status ON public.aa_consents(status);

CREATE INDEX IF NOT EXISTS idx_gov_schemes_active ON public.government_schemes(active);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_category ON public.government_schemes(category);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_gov_level ON public.government_schemes(government_level);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_state ON public.government_schemes(state);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_priority ON public.government_schemes(priority DESC);

CREATE INDEX IF NOT EXISTS idx_gov_scheme_matches_user ON public.government_scheme_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_scheme_matches_assessment ON public.government_scheme_matches(assessment_id);
CREATE INDEX IF NOT EXISTS idx_gov_scheme_matches_scheme ON public.government_scheme_matches(scheme_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recourse_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aa_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_scheme_matches ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Assessments policies
CREATE POLICY "Users can view own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assessments"
  ON public.assessments FOR DELETE
  USING (auth.uid() = user_id);

-- Recourse Plans policies
CREATE POLICY "Users can view own recourse plans"
  ON public.recourse_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recourse plans"
  ON public.recourse_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recourse plans"
  ON public.recourse_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Simulations policies
CREATE POLICY "Users can view own simulations"
  ON public.simulations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations"
  ON public.simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations"
  ON public.simulations FOR DELETE
  USING (auth.uid() = user_id);

-- Pricing Results policies
CREATE POLICY "Users can view own pricing results"
  ON public.pricing_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pricing results"
  ON public.pricing_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pricing results"
  ON public.pricing_results FOR DELETE
  USING (auth.uid() = user_id);

-- Outcomes policies
CREATE POLICY "Users can view own outcomes"
  ON public.outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outcomes"
  ON public.outcomes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND verified = false);

CREATE POLICY "Users can delete own outcomes"
  ON public.outcomes FOR DELETE
  USING (auth.uid() = user_id);

-- AA Consents policies
CREATE POLICY "Users can view own consents"
  ON public.aa_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON public.aa_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON public.aa_consents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consents"
  ON public.aa_consents FOR DELETE
  USING (auth.uid() = user_id);

-- Government Schemes policies
CREATE POLICY "Public can view active government schemes"
  ON public.government_schemes FOR SELECT
  USING (active = true);

-- Government Scheme Matches policies
CREATE POLICY "Users can view own scheme matches"
  ON public.government_scheme_matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheme matches"
  ON public.government_scheme_matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheme matches"
  ON public.government_scheme_matches FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Applicant'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
