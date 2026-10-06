-- ==============================================================================
-- ADD RECENT_HARD_INQUIRIES TO ASSESSMENTS TABLE
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessments'
      AND column_name = 'recent_hard_inquiries'
  ) THEN
    ALTER TABLE public.assessments
    ADD COLUMN recent_hard_inquiries INTEGER NOT NULL DEFAULT 0 CHECK (recent_hard_inquiries >= 0);
  END IF;
END $$;
