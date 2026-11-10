-- Add new total columns to cash_registers table
ALTER TABLE public.cash_registers 
ADD COLUMN IF NOT EXISTS total_mb_way numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_multibanco numeric(10,2) DEFAULT 0;

-- Update the comments to reflect the new columns
COMMENT ON COLUMN public.cash_registers.total_mb_way IS 'Total sales paid with MB Way';
COMMENT ON COLUMN public.cash_registers.total_multibanco IS 'Total sales paid with Multibanco';
