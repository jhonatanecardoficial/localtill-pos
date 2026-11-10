-- Tabela para histórico de preços dos produtos
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Políticas para histórico de preços
CREATE POLICY "Authenticated users can view price history"
ON public.price_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert price history"
ON public.price_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = changed_by);

-- Tabela para armazenar a filial ativa de cada usuário
CREATE TABLE IF NOT EXISTS public.user_active_branch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_active_branch ENABLE ROW LEVEL SECURITY;

-- Políticas para filial ativa do usuário
CREATE POLICY "Users can view their own active branch"
ON public.user_active_branch
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own active branch"
ON public.user_active_branch
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active branch"
ON public.user_active_branch
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_active_branch_user_id ON public.user_active_branch(user_id);

-- Trigger para atualizar updated_at em user_active_branch
CREATE TRIGGER update_user_active_branch_updated_at
BEFORE UPDATE ON public.user_active_branch
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();