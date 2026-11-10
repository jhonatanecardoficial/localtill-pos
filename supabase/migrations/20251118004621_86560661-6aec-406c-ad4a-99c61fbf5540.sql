-- Tabela de Turnos Customizados
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Registros de Caixa
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id),
  shift_name TEXT NOT NULL, -- Desnormalizado para facilitar relatórios
  operator_id UUID NOT NULL REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_amount_counted NUMERIC(10,2),
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_cash NUMERIC(10,2) DEFAULT 0,
  total_debit NUMERIC(10,2) DEFAULT 0,
  total_credit NUMERIC(10,2) DEFAULT 0,
  total_pix NUMERIC(10,2) DEFAULT 0,
  total_other NUMERIC(10,2) DEFAULT 0,
  difference NUMERIC(10,2), -- Quebra ou sobra (contado - esperado)
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar coluna cash_register_id na tabela sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES public.cash_registers(id);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cash_registers_operator ON public.cash_registers(operator_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_branch ON public.cash_registers(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_shift ON public.cash_registers(shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON public.cash_registers(status);
CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at ON public.cash_registers(opened_at);
CREATE INDEX IF NOT EXISTS idx_sales_cash_register ON public.sales(cash_register_id);

-- Trigger para updated_at em shifts
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Inserir turnos padrão
INSERT INTO public.shifts (name, description) VALUES
  ('PHD (Primeiro Horário Dia)', 'Turno matutino - 06:00 às 14:00'),
  ('SHD (Segundo Horário Dia)', 'Turno vespertino - 14:00 às 22:00'),
  ('Noturno', 'Turno noturno - 22:00 às 06:00')
ON CONFLICT (name) DO NOTHING;

-- RLS Policies para shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active shifts"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage shifts"
  ON public.shifts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para cash_registers
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cash registers"
  ON public.cash_registers FOR SELECT
  TO authenticated
  USING (operator_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can open their own cash register"
  ON public.cash_registers FOR INSERT
  TO authenticated
  WITH CHECK (operator_id = auth.uid());

CREATE POLICY "Users can update their own open cash register"
  ON public.cash_registers FOR UPDATE
  TO authenticated
  USING (operator_id = auth.uid() AND status = 'OPEN');