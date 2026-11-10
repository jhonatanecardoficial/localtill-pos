-- Create discount_rules table for progressive discount system
CREATE TABLE public.discount_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('quantity', 'value')),
  threshold NUMERIC NOT NULL,
  discount_percentage NUMERIC NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loyalty_settings table for loyalty program configuration
CREATE TABLE public.loyalty_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  points_per_real NUMERIC NOT NULL DEFAULT 1,
  reais_per_point NUMERIC NOT NULL DEFAULT 0.01,
  points_expiry_months INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default loyalty settings
INSERT INTO public.loyalty_settings (points_per_real, reais_per_point, is_active)
VALUES (10, 0.01, true);

-- Enable RLS
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_rules
CREATE POLICY "Admins can manage discount rules"
ON public.discount_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active discount rules"
ON public.discount_rules
FOR SELECT
USING (is_active = true);

-- RLS Policies for loyalty_settings
CREATE POLICY "Admins can manage loyalty settings"
ON public.loyalty_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view loyalty settings"
ON public.loyalty_settings
FOR SELECT
USING (true);