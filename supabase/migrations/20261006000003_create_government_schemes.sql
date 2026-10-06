-- ==============================================================================
-- MIGRATION: GOVERNMENT SCHEMES & MATCHING ENGINE TABLES
-- ==============================================================================

-- 1. GOVERNMENT SCHEMES TABLE (Verified Central & State Credit Schemes)
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

-- 2. GOVERNMENT SCHEME MATCHES TABLE (User Assessment Matches)
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
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_gov_schemes_active ON public.government_schemes(active);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_category ON public.government_schemes(category);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_gov_level ON public.government_schemes(government_level);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_state ON public.government_schemes(state);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_priority ON public.government_schemes(priority DESC);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_purposes_gin ON public.government_schemes USING GIN (purposes);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_beneficiaries_gin ON public.government_schemes USING GIN (beneficiary_types);

CREATE INDEX IF NOT EXISTS idx_gov_scheme_matches_user ON public.government_scheme_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_scheme_matches_assessment ON public.government_scheme_matches(assessment_id);
CREATE INDEX IF NOT EXISTS idx_gov_scheme_matches_scheme ON public.government_scheme_matches(scheme_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_scheme_matches ENABLE ROW LEVEL SECURITY;

-- Government schemes are publicly viewable by all authenticated & anonymous users
CREATE POLICY "Public can view active government schemes"
  ON public.government_schemes FOR SELECT
  USING (active = true);

-- Users can view and manage only their own match results
CREATE POLICY "Users can view own scheme matches"
  ON public.government_scheme_matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheme matches"
  ON public.government_scheme_matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheme matches"
  ON public.government_scheme_matches FOR DELETE
  USING (auth.uid() = user_id);
