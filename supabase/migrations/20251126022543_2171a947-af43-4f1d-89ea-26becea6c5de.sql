-- =====================================================
-- REVERTER PARA AS POLÍTICAS RLS ORIGINAIS
-- (restaura exatamente o estado listado em <supabase-tables>)
-- =====================================================

-- 1) REMOVER POLÍTICAS SIMPLIFICADAS QUE ACABAMOS DE CRIAR

-- Profiles
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Branches
DROP POLICY IF EXISTS "Users can manage branches" ON public.branches;

-- Categories
DROP POLICY IF EXISTS "Users can manage categories" ON public.categories;

-- Products
DROP POLICY IF EXISTS "Users can manage products" ON public.products;

-- Customers
DROP POLICY IF EXISTS "Users can manage customers" ON public.customers;

-- Sales
DROP POLICY IF EXISTS "Users can manage sales" ON public.sales;

-- Sale items
DROP POLICY IF EXISTS "Users can manage sale_items" ON public.sale_items;

-- Inventory
DROP POLICY IF EXISTS "Users can manage inventory" ON public.inventory;

-- Inventory movements
DROP POLICY IF EXISTS "Users can manage inventory_movements" ON public.inventory_movements;

-- Cash registers
DROP POLICY IF EXISTS "Users can manage cash_registers" ON public.cash_registers;

-- Cash movements
DROP POLICY IF EXISTS "Users can manage cash_movements" ON public.cash_movements;

-- Shifts
DROP POLICY IF EXISTS "Users can manage shifts" ON public.shifts;

-- Price history
DROP POLICY IF EXISTS "Users can manage price_history" ON public.price_history;

-- User roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- User active branch
DROP POLICY IF EXISTS "Users can manage own active branch" ON public.user_active_branch;

-- Discount rules
DROP POLICY IF EXISTS "Admins can manage discount_rules" ON public.discount_rules;
DROP POLICY IF EXISTS "Everyone can view active discount_rules" ON public.discount_rules;

-- Loyalty settings
DROP POLICY IF EXISTS "Admins can manage loyalty_settings" ON public.loyalty_settings;
DROP POLICY IF EXISTS "Everyone can view loyalty_settings" ON public.loyalty_settings;

-- Sales targets
DROP POLICY IF EXISTS "Admins can manage sales_targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can view sales_targets" ON public.sales_targets;

-- Subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Service role can manage purchases" ON public.purchases;


-- 2) RECRIAR AS POLÍTICAS ORIGINAIS (CONFORME <supabase-tables>)

-- BRANCHES
CREATE POLICY "Users can create their own branches" ON public.branches
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own branches" ON public.branches
FOR DELETE
USING (owner_id = auth.uid());

CREATE POLICY "Users can update their own branches" ON public.branches
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can view company branches" ON public.branches
FOR SELECT
USING (
  (owner_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.owner_id = branches.owner_id
    )
  )
);

-- CASH_MOVEMENTS
CREATE POLICY "Users can create cash movements for their register" ON public.cash_movements
FOR INSERT
WITH CHECK (
  cash_register_id IN (
    SELECT cash_registers.id
    FROM public.cash_registers
    WHERE cash_registers.operator_id = auth.uid()
      AND cash_registers.status = 'OPEN'::text
  )
);

CREATE POLICY "Users can view their cash register movements" ON public.cash_movements
FOR SELECT
USING (
  cash_register_id IN (
    SELECT cash_registers.id
    FROM public.cash_registers
    WHERE cash_registers.operator_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'manager'::public.app_role)
);

-- CASH_REGISTERS
CREATE POLICY "Company users can open cash register" ON public.cash_registers
FOR INSERT
WITH CHECK (
  operator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = cash_registers.branch_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.owner_id = b.owner_id
        )
      )
  )
);

CREATE POLICY "Company users can update cash registers" ON public.cash_registers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = cash_registers.branch_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.owner_id = b.owner_id
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = cash_registers.branch_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.owner_id = b.owner_id
        )
      )
  )
);

CREATE POLICY "Company users can view cash registers" ON public.cash_registers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = cash_registers.branch_id
      AND (
        b.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.owner_id = b.owner_id
        )
      )
  )
);

-- CATEGORIES
CREATE POLICY "Owners can manage categories" ON public.categories
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view owner categories" ON public.categories
FOR SELECT
USING (
  owner_id = auth.uid()
  OR owner_id = (
    SELECT profiles.owner_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

-- CUSTOMERS
CREATE POLICY "Users can create their own customers" ON public.customers
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own customers" ON public.customers
FOR DELETE
USING (owner_id = auth.uid());

CREATE POLICY "Users can update their own customers" ON public.customers
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can view their own customers" ON public.customers
FOR SELECT
USING (owner_id = auth.uid());

-- DISCOUNT_RULES
CREATE POLICY "Admins can manage discount rules" ON public.discount_rules
FOR ALL
USING (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated users can view active discount rules" ON public.discount_rules
FOR SELECT
USING (is_active = true);

-- INVENTORY
CREATE POLICY "Admins, managers and stock clerks can manage inventory" ON public.inventory
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'manager'::public.app_role)
  OR has_role(auth.uid(), 'stock_clerk'::public.app_role)
);

CREATE POLICY "Users can create inventory for their branches" ON public.inventory
FOR INSERT
WITH CHECK (
  branch_id IN (
    SELECT branches.id
    FROM public.branches
    WHERE branches.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete inventory of their branches" ON public.inventory
FOR DELETE
USING (
  branch_id IN (
    SELECT branches.id
    FROM public.branches
    WHERE branches.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update inventory of their branches" ON public.inventory
FOR UPDATE
USING (
  branch_id IN (
    SELECT b.id
    FROM public.branches b
    WHERE b.owner_id = auth.uid()
       OR b.owner_id = (
         SELECT profiles.owner_id
         FROM public.profiles
         WHERE profiles.id = auth.uid()
       )
  )
);

CREATE POLICY "Users can view owner branch inventory" ON public.inventory
FOR SELECT
USING (
  branch_id IN (
    SELECT b.id
    FROM public.branches b
    WHERE b.owner_id = auth.uid()
       OR b.owner_id = (
         SELECT profiles.owner_id
         FROM public.profiles
         WHERE profiles.id = auth.uid()
       )
  )
);

-- INVENTORY_MOVEMENTS
CREATE POLICY "Authenticated users can create movements" ON public.inventory_movements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view movements of their branches" ON public.inventory_movements
FOR SELECT
USING (
  branch_id IN (
    SELECT b.id
    FROM public.branches b
    WHERE b.owner_id = auth.uid()
       OR b.owner_id = (
         SELECT profiles.owner_id
         FROM public.profiles
         WHERE profiles.id = auth.uid()
       )
  )
);

-- LOYALTY_SETTINGS
CREATE POLICY "Admins can manage loyalty settings" ON public.loyalty_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated users can view loyalty settings" ON public.loyalty_settings
FOR SELECT
USING (true);

-- PRICE_HISTORY
CREATE POLICY "Authenticated users can insert price history" ON public.price_history
FOR INSERT
WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "Users view price history of their products" ON public.price_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = price_history.product_id
      AND p.owner_id = auth.uid()
  )
);

-- PRODUCTS
CREATE POLICY "Authorized users can manage products" ON public.products
FOR ALL
USING (
  owner_id = auth.uid()
  OR (
    owner_id = (
      SELECT profiles.owner_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::public.app_role)
      OR has_role(auth.uid(), 'manager'::public.app_role)
      OR has_role(auth.uid(), 'stock_clerk'::public.app_role)
    )
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR (
    owner_id = (
      SELECT profiles.owner_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::public.app_role)
      OR has_role(auth.uid(), 'manager'::public.app_role)
      OR has_role(auth.uid(), 'stock_clerk'::public.app_role)
    )
  )
);

CREATE POLICY "Users can view owner products" ON public.products
FOR SELECT
USING (
  owner_id = auth.uid()
  OR owner_id = (
    SELECT profiles.owner_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

-- PROFILES
CREATE POLICY "Admins can update user branch assignments" ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  AND owner_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::public.app_role)
  AND owner_id = auth.uid()
);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Owners can view their users profiles" ON public.profiles
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- PURCHASES
CREATE POLICY "Service role can manage purchases" ON public.purchases
FOR ALL
USING (true);

CREATE POLICY "Users can view their own purchases" ON public.purchases
FOR SELECT
USING (auth.uid() = user_id);

-- SALE_ITEMS
CREATE POLICY "Operators can create sale items" ON public.sale_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users view sale items of their branches" ON public.sale_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.sales s
    JOIN public.branches b ON s.branch_id = b.id
    WHERE s.id = sale_items.sale_id
      AND b.owner_id = auth.uid()
  )
);

-- SALES
CREATE POLICY "Users can create their own sales" ON public.sales
FOR INSERT
WITH CHECK (
  cashier_id = auth.uid()
  AND branch_id IN (
    SELECT b.id
    FROM public.branches b
    WHERE b.owner_id = auth.uid()
       OR b.owner_id = (
         SELECT profiles.owner_id
         FROM public.profiles
         WHERE profiles.id = auth.uid()
       )
  )
);

CREATE POLICY "Users can update sales of their branches" ON public.sales
FOR UPDATE
USING (
  branch_id IN (
    SELECT branches.id
    FROM public.branches
    WHERE branches.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view sales of their branches" ON public.sales
FOR SELECT
USING (
  branch_id IN (
    SELECT branches.id
    FROM public.branches
    WHERE branches.owner_id = auth.uid()
  )
);

-- SALES_TARGETS
CREATE POLICY "Admins can manage targets" ON public.sales_targets
FOR ALL
USING (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view all targets" ON public.sales_targets
FOR SELECT
USING (true);

-- SHIFTS
CREATE POLICY "Admins and managers can manage shifts" ON public.shifts
FOR ALL
USING (
  owner_id = auth.uid()
  OR (
    owner_id = (
      SELECT profiles.owner_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::public.app_role)
      OR has_role(auth.uid(), 'manager'::public.app_role)
    )
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR (
    owner_id = (
      SELECT profiles.owner_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::public.app_role)
      OR has_role(auth.uid(), 'manager'::public.app_role)
    )
  )
);

CREATE POLICY "Users can view owner active shifts" ON public.shifts
FOR SELECT
USING (
  is_active = true
  AND (
    owner_id = auth.uid()
    OR owner_id = (
      SELECT profiles.owner_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  )
);

-- SUBSCRIPTIONS
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
FOR ALL
USING (true);

CREATE POLICY "Users can view their own subscription" ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- USER_ACTIVE_BRANCH
CREATE POLICY "Users can insert their own active branch" ON public.user_active_branch
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active branch" ON public.user_active_branch
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own active branch" ON public.user_active_branch
FOR SELECT
USING (auth.uid() = user_id);

-- USER_ROLES
CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Anyone can view roles" ON public.user_roles
FOR SELECT
USING (true);
