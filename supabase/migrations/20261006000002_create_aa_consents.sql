-- ==============================================================================
-- CREATE AA_CONSENTS TABLE (SETU ACCOUNT AGGREGATOR CONSENT TRACKING)
-- ==============================================================================

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

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_aa_consents_user_id ON public.aa_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_aa_consents_consent_id ON public.aa_consents(consent_id);
CREATE INDEX IF NOT EXISTS idx_aa_consents_status ON public.aa_consents(status);

-- Enable Row Level Security
ALTER TABLE public.aa_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own consents" ON public.aa_consents;
CREATE POLICY "Users can view own consents"
  ON public.aa_consents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own consents" ON public.aa_consents;
CREATE POLICY "Users can insert own consents"
  ON public.aa_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own consents" ON public.aa_consents;
CREATE POLICY "Users can update own consents"
  ON public.aa_consents FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own consents" ON public.aa_consents;
CREATE POLICY "Users can delete own consents"
  ON public.aa_consents FOR DELETE
  USING (auth.uid() = user_id);
