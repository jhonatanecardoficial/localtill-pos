-- Add owner_id column to branches to track who owns each branch
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Update existing branches to set owner_id based on the first admin user
-- This is a one-time operation for existing data
DO $$
DECLARE
  first_admin_id UUID;
BEGIN
  -- Get the first admin user
  SELECT user_id INTO first_admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Update all branches without owner_id
  IF first_admin_id IS NOT NULL THEN
    UPDATE public.branches
    SET owner_id = first_admin_id
    WHERE owner_id IS NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_branches_owner_id ON public.branches(owner_id);

-- Update RLS policies for branches
DROP POLICY IF EXISTS "Users can view their own branches" ON public.branches;
DROP POLICY IF EXISTS "Authenticated users can view branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;

CREATE POLICY "Users can view their own branches"
  ON public.branches FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own branches"
  ON public.branches FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own branches"
  ON public.branches FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own branches"
  ON public.branches FOR DELETE
  USING (owner_id = auth.uid());

-- Update RLS policies for products to be accessible only within user's context
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

-- Products are shared across all branches of the same owner
-- We use a function to check if user has access to any branch
CREATE OR REPLACE FUNCTION public.user_has_branches()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.branches
    WHERE owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view products if they have branches"
  ON public.products FOR SELECT
  USING (user_has_branches());

CREATE POLICY "Users can create products if they have branches"
  ON public.products FOR INSERT
  WITH CHECK (user_has_branches());

CREATE POLICY "Users can update products if they have branches"
  ON public.products FOR UPDATE
  USING (user_has_branches());

CREATE POLICY "Users can delete products if they have branches"
  ON public.products FOR DELETE
  USING (user_has_branches());

-- Update RLS policies for inventory to be filtered by user's branches
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can create inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can delete inventory" ON public.inventory;

CREATE POLICY "Users can view inventory of their branches"
  ON public.inventory FOR SELECT
  USING (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inventory for their branches"
  ON public.inventory FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update inventory of their branches"
  ON public.inventory FOR UPDATE
  USING (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete inventory of their branches"
  ON public.inventory FOR DELETE
  USING (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

-- Update RLS policies for sales to be filtered by user's branches
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;

CREATE POLICY "Users can view sales of their branches"
  ON public.sales FOR SELECT
  USING (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sales for their branches"
  ON public.sales FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sales of their branches"
  ON public.sales FOR UPDATE
  USING (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

-- Add owner_id to customers for user isolation
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Update existing customers
DO $$
DECLARE
  first_admin_id UUID;
BEGIN
  SELECT user_id INTO first_admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF first_admin_id IS NOT NULL THEN
    UPDATE public.customers
    SET owner_id = first_admin_id
    WHERE owner_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON public.customers(owner_id);

-- Update RLS policies for customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

CREATE POLICY "Users can view their own customers"
  ON public.customers FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own customers"
  ON public.customers FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own customers"
  ON public.customers FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own customers"
  ON public.customers FOR DELETE
  USING (owner_id = auth.uid());

-- Update RLS policies for cash_registers
DROP POLICY IF EXISTS "Users can view their own cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can create their own cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can update their own cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Managers can view all cash registers" ON public.cash_registers;

CREATE POLICY "Users can view cash registers of their branches"
  ON public.cash_registers FOR SELECT
  USING (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cash registers for their branches"
  ON public.cash_registers FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cash registers of their branches"
  ON public.cash_registers FOR UPDATE
  USING (
    branch_id IN (
      SELECT id FROM public.branches WHERE owner_id = auth.uid()
    )
  );

-- Create trigger to automatically set owner_id on branch creation
CREATE OR REPLACE FUNCTION public.set_branch_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_branch_owner_trigger ON public.branches;
CREATE TRIGGER set_branch_owner_trigger
  BEFORE INSERT ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_branch_owner();

-- Create trigger to automatically set owner_id on customer creation
CREATE OR REPLACE FUNCTION public.set_customer_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_customer_owner_trigger ON public.customers;
CREATE TRIGGER set_customer_owner_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_owner();