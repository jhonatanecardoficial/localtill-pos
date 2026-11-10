-- Fix missing foreign key relationships for PostgREST detection

-- 1. Ensure inventory table has correct foreign keys
ALTER TABLE public.inventory
  DROP CONSTRAINT IF EXISTS inventory_product_id_fkey,
  DROP CONSTRAINT IF EXISTS inventory_branch_id_fkey;

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE CASCADE;

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_branch_id_fkey
  FOREIGN KEY (branch_id)
  REFERENCES public.branches(id)
  ON DELETE CASCADE;

-- 2. Ensure inventory_movements table has correct foreign keys
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_product_id_fkey,
  DROP CONSTRAINT IF EXISTS inventory_movements_branch_id_fkey,
  DROP CONSTRAINT IF EXISTS inventory_movements_user_id_fkey;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE CASCADE;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_branch_id_fkey
  FOREIGN KEY (branch_id)
  REFERENCES public.branches(id)
  ON DELETE CASCADE;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 3. Reload schema cache (Supabase usually does this automatically on DDL, but good to be sure)
NOTIFY pgrst, 'reload config';

-- 4. Backfill reference_id for sales-related movements (notes: 'Venda <sale_number>')
UPDATE public.inventory_movements im
SET reference_id = s.id
FROM public.sales s
WHERE im.reference_id IS NULL
  AND im.movement_type = 'out'
  AND im.notes LIKE 'Venda %'
  AND s.sale_number = SUBSTRING(im.notes FROM 'Venda\\s(.+)$');
