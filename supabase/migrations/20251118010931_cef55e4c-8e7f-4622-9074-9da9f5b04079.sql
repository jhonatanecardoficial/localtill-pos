-- Adicionar campo para controlar o troco disponível no caixa
ALTER TABLE public.cash_registers
ADD COLUMN current_change NUMERIC DEFAULT 0;

-- Criar tabela para registrar movimentações de troco (sangria/suprimento)
CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('addition', 'withdrawal')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT,
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  authorized_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cash_movements
CREATE POLICY "Users can view their cash register movements"
  ON public.cash_movements
  FOR SELECT
  USING (
    cash_register_id IN (
      SELECT id FROM public.cash_registers WHERE operator_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Users can create cash movements for their register"
  ON public.cash_movements
  FOR INSERT
  WITH CHECK (
    cash_register_id IN (
      SELECT id FROM public.cash_registers WHERE operator_id = auth.uid() AND status = 'OPEN'
    )
  );

-- Índices para performance
CREATE INDEX idx_cash_movements_register ON public.cash_movements(cash_register_id);
CREATE INDEX idx_cash_movements_created_at ON public.cash_movements(created_at);