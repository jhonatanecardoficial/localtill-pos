-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT UNIQUE, -- CPF/CNPJ
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_purchases NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sales_targets table for vendor goals
CREATE TABLE IF NOT EXISTS public.sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  achieved_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Add customer reference to sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- Customer policies
CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create customers"
ON public.customers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
ON public.customers FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete customers"
ON public.customers FOR DELETE
USING (true);

-- Sales targets policies
CREATE POLICY "Users can view all targets"
ON public.sales_targets FOR SELECT
USING (true);

CREATE POLICY "Admins can manage targets"
ON public.sales_targets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER sales_targets_updated_at
BEFORE UPDATE ON public.sales_targets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for inventory (for low stock alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;