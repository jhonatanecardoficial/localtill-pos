-- ==============================================================================
-- SECURITY FIXES MIGRATION
-- Data: 10/12/2025
-- Descrição: Correção de vulnerabilidades IDOR, Trojan Source e RLS.
-- ==============================================================================

-- 0. SCHEMA UPDATES (Missing Columns)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loyalty_settings' AND column_name = 'owner_id') THEN
        ALTER TABLE public.loyalty_settings ADD COLUMN owner_id UUID REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discount_rules' AND column_name = 'owner_id') THEN
        ALTER TABLE public.discount_rules ADD COLUMN owner_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 1. CORREÇÃO DA VIEW (SECURITY DEFINER -> SECURITY INVOKER)
DROP VIEW IF EXISTS public.inventory_movements_report_view;

CREATE VIEW public.inventory_movements_report_view AS
SELECT 
    im.id,
    im.created_at,
    im.movement_type,
    im.quantity,
    im.notes,
    im.product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    im.branch_id,
    b.name AS branch_name,
    im.user_id,
    pr.full_name AS profile_name,
    c.name AS customer_name
FROM inventory_movements im
     LEFT JOIN products p ON im.product_id = p.id
     LEFT JOIN branches b ON im.branch_id = b.id
     LEFT JOIN profiles pr ON im.user_id = pr.id
     LEFT JOIN sales s ON im.reference_id = s.id AND im.movement_type = 'out'::text
     LEFT JOIN customers c ON s.customer_id = c.id;

-- 2. CORREÇÃO DAS FUNÇÕES RPC (IDOR & SEARCH PATH)

-- 2.1 increment_loyalty_points
CREATE OR REPLACE FUNCTION public.increment_loyalty_points(customer_id UUID, points INTEGER)
RETURNS VOID AS $$
DECLARE
  current_user_owner UUID;
BEGIN
  -- Obter owner_id do usuário atual
  SELECT COALESCE(owner_id, id) INTO current_user_owner
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar acesso
  IF NOT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = customer_id 
    AND owner_id = current_user_owner
  ) THEN
    -- Fallback: Se o usuário for admin global (opcional) ou lógica de branch
    -- Se não encontrar, erro.
    RAISE EXCEPTION 'Access Denied: You do not have permission to update this customer.';
  END IF;

  UPDATE customers
  SET loyalty_points = COALESCE(loyalty_points, 0) + points
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.2 decrement_loyalty_points
CREATE OR REPLACE FUNCTION public.decrement_loyalty_points(customer_id UUID, points INTEGER)
RETURNS VOID AS $$
DECLARE
  current_user_owner UUID;
BEGIN
  SELECT COALESCE(owner_id, id) INTO current_user_owner
  FROM profiles
  WHERE id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = customer_id 
    AND owner_id = current_user_owner
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to update this customer.';
  END IF;

  UPDATE customers
  SET loyalty_points = GREATEST(0, COALESCE(loyalty_points, 0) - points)
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.3 update_customer_stats
CREATE OR REPLACE FUNCTION public.update_customer_stats(c_id UUID, amount NUMERIC)
RETURNS VOID AS $$
DECLARE
  current_user_owner UUID;
BEGIN
  SELECT COALESCE(owner_id, id) INTO current_user_owner
  FROM profiles
  WHERE id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = c_id 
    AND owner_id = current_user_owner
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to update this customer.';
  END IF;

  UPDATE customers
  SET 
    total_purchases = COALESCE(total_purchases, 0) + amount,
    updated_at = NOW()
  WHERE id = c_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. CORREÇÃO DE POLICIES (DATA LEAKAGE)

-- 3.1 Loyalty Settings
DROP POLICY IF EXISTS "Authenticated users can view loyalty settings" ON public.loyalty_settings;
DROP POLICY IF EXISTS "Users view own loyalty settings" ON public.loyalty_settings;

CREATE POLICY "Users view own loyalty settings" ON public.loyalty_settings FOR SELECT USING (
  owner_id = auth.uid() OR 
  owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
);

-- Policy para INSERT/UPDATE (para permitir uso)
DROP POLICY IF EXISTS "Users manage own loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Users manage own loyalty settings" ON public.loyalty_settings FOR ALL USING (
  owner_id = auth.uid() OR 
  owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
);


-- 3.2 Discount Rules
DROP POLICY IF EXISTS "Authenticated users can view active discount rules" ON public.discount_rules;
DROP POLICY IF EXISTS "Users view own discount rules" ON public.discount_rules;

CREATE POLICY "Users view own discount rules" ON public.discount_rules FOR SELECT USING (
  (owner_id = auth.uid() OR owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "Users manage own discount rules" ON public.discount_rules;
CREATE POLICY "Users manage own discount rules" ON public.discount_rules FOR ALL USING (
  (owner_id = auth.uid() OR owner_id = (SELECT owner_id FROM profiles WHERE id = auth.uid()))
);
