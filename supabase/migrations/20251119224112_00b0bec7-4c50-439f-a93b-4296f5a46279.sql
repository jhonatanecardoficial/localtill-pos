-- Add owner_id to tenant-scoped tables
alter table public.categories add column if not exists owner_id uuid;
alter table public.products add column if not exists owner_id uuid;
alter table public.shifts add column if not exists owner_id uuid;

-- Generic function to automatically set owner_id to the current user
create or replace function public.set_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

-- Attach triggers to keep owner_id consistent on insert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_categories_owner') THEN
    CREATE TRIGGER set_categories_owner
      BEFORE INSERT ON public.categories
      FOR EACH ROW
      EXECUTE FUNCTION public.set_owner();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_products_owner') THEN
    CREATE TRIGGER set_products_owner
      BEFORE INSERT ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.set_owner();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_shifts_owner') THEN
    CREATE TRIGGER set_shifts_owner
      BEFORE INSERT ON public.shifts
      FOR EACH ROW
      EXECUTE FUNCTION public.set_owner();
  END IF;
END;
$$;

-- RLS: categories must be tenant-scoped
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;

CREATE POLICY "Owners manage own categories"
ON public.categories
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- RLS: products must be tenant-scoped
DROP POLICY IF EXISTS "Users can create products if they have branches" ON public.products;
DROP POLICY IF EXISTS "Users can delete products if they have branches" ON public.products;
DROP POLICY IF EXISTS "Users can update products if they have branches" ON public.products;
DROP POLICY IF EXISTS "Users can view products if they have branches" ON public.products;

CREATE POLICY "Owners manage own products"
ON public.products
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- RLS: shifts must be tenant-scoped
DROP POLICY IF EXISTS "Admins can manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated users can view active shifts" ON public.shifts;

CREATE POLICY "Owners manage own shifts"
ON public.shifts
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners view active shifts"
ON public.shifts
FOR SELECT
USING (owner_id = auth.uid() AND is_active = true);

-- RLS: inventory_movements should only be visible within the owner's branches
DROP POLICY IF EXISTS "Authenticated users can view movements" ON public.inventory_movements;

CREATE POLICY "Users view movements of their branches"
ON public.inventory_movements
FOR SELECT
USING (
  branch_id IN (
    SELECT id FROM public.branches
    WHERE owner_id = auth.uid()
  )
);

-- RLS: price_history should only be visible for the owner's products
DROP POLICY IF EXISTS "Authenticated users can view price history" ON public.price_history;

CREATE POLICY "Users view price history of their products"
ON public.price_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id
      AND p.owner_id = auth.uid()
  )
);

-- RLS: sale_items should only be visible for sales of the owner's branches
DROP POLICY IF EXISTS "Authenticated users can view sale items" ON public.sale_items;

CREATE POLICY "Users view sale items of their branches"
ON public.sale_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.sales s
    JOIN public.branches b ON s.branch_id = b.id
    WHERE s.id = sale_id
      AND b.owner_id = auth.uid()
  )
);

-- Ensure all subscription owners have the admin role so they can manage users
INSERT INTO public.user_roles (user_id, role)
SELECT s.user_id, 'admin'::app_role
FROM public.subscriptions s
LEFT JOIN public.user_roles ur
  ON ur.user_id = s.user_id
 AND ur.role = 'admin'::app_role
WHERE ur.id IS NULL;

-- Attach triggers on auth.users so new owners are fully initialized (profile, subscription, admin role)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_handle_new_user') THEN
    CREATE TRIGGER on_auth_user_created_handle_new_user
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.handle_new_user();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_subscription') THEN
    CREATE TRIGGER on_auth_user_created_subscription
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.handle_new_user_subscription();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_assign_admin') THEN
    CREATE TRIGGER on_auth_user_created_assign_admin
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.assign_first_user_admin();
  END IF;
END;
$$;
