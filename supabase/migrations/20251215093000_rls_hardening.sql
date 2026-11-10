-- ==============================================================================
-- RLS HARDENING
-- Data: 2025-12-15
-- Descrição: Políticas mais restritivas para sales e cash_registers.
-- ==============================================================================

-- SALES
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Remover políticas conflitantes
DROP POLICY IF EXISTS "Users can view branch sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Operators can create sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales of their branches" ON public.sales;

-- SELECT: operador vê próprias vendas; admins/managers veem todas
CREATE POLICY "Scoped select sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  cashier_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- INSERT: apenas se o cashier_id for o próprio usuário
CREATE POLICY "Scoped insert sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (cashier_id = auth.uid());

-- UPDATE: apenas admins/managers
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
CREATE POLICY "Admins update sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- CASH REGISTERS
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

-- Remover políticas conflitantes
DROP POLICY IF EXISTS "Users can view cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Company users can view cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can open cash register" ON public.cash_registers;
DROP POLICY IF EXISTS "Company users can open cash register" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can close their own cash register" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can update cash registers of their branches" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can update their own open cash register" ON public.cash_registers;

-- SELECT: operador vê seus caixas; admins/managers veem todos
CREATE POLICY "Scoped select cash_registers"
ON public.cash_registers
FOR SELECT
TO authenticated
USING (
  operator_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- INSERT: operador abre o próprio caixa
CREATE POLICY "Scoped insert cash_registers"
ON public.cash_registers
FOR INSERT
TO authenticated
WITH CHECK (operator_id = auth.uid());

-- UPDATE: operador atualiza próprio caixa aberto; admins/managers qualquer
CREATE POLICY "Scoped update cash_registers"
ON public.cash_registers
FOR UPDATE
TO authenticated
USING (
  (operator_id = auth.uid() AND status = 'OPEN')
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  (operator_id = auth.uid() AND status = 'OPEN')
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

