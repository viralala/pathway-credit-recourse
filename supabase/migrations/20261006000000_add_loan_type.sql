-- ==============================================================================
-- ADD LOAN_TYPE, LOAN_AMOUNT, COLLATERAL_VALUE, LTV TO ASSESSMENTS TABLE
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessments'
      AND column_name = 'loan_type'
  ) THEN
    ALTER TABLE public.assessments
    ADD COLUMN loan_type TEXT NOT NULL DEFAULT 'unsecured' CHECK (loan_type IN ('secured', 'unsecured'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessments'
      AND column_name = 'loan_amount'
  ) THEN
    ALTER TABLE public.assessments
    ADD COLUMN loan_amount NUMERIC NOT NULL DEFAULT 500000 CHECK (loan_amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessments'
      AND column_name = 'collateral_value'
  ) THEN
    ALTER TABLE public.assessments
    ADD COLUMN collateral_value NUMERIC CHECK (collateral_value IS NULL OR collateral_value > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessments'
      AND column_name = 'ltv'
  ) THEN
    ALTER TABLE public.assessments
    ADD COLUMN ltv NUMERIC CHECK (ltv IS NULL OR ltv >= 0);
  END IF;
END $$;
