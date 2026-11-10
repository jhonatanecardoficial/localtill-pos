-- ==============================================================================
-- Add Portugal payment methods to enum: mb_way, multibanco
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'mb_way'
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'mb_way';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'multibanco'
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'multibanco';
  END IF;
END $$;

