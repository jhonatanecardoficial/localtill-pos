-- Adicionar índice único para SKU
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products(sku);

-- Atualizar registros existentes sem unidade para ter o valor padrão
UPDATE public.products SET unit = 'un' WHERE unit IS NULL OR unit = '';

-- Tornar o campo unit obrigatório
ALTER TABLE public.products ALTER COLUMN unit SET NOT NULL;