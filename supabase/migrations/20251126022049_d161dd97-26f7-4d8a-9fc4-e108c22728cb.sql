-- =====================================================
-- REMOVER POLÍTICAS ANTIGAS
-- =====================================================

-- Branches
DROP POLICY IF EXISTS "Users can create their own branches" ON public.branches;
DROP POLICY IF EXISTS "Users can delete their own branches" ON public.branches;
DROP POLICY IF EXISTS "Users can update their own branches" ON public.branches;
DROP POLICY IF EXISTS "Users can view company branches" ON public.branches;

-- Cash movements
DROP POLICY IF EXISTS "Users can create cash movements for their register" ON public.cash_movements;
DROP POLICY IF EXISTS "Users can view their cash register movements" ON public.cash_movements;

-- Cash registers
DROP POLICY IF EXISTS "Company users can open cash register" ON public.cash_registers;
DROP POLICY IF EXISTS "Company users can update cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Company users can view cash registers" ON public.cash_registers;

-- Categories
DROP POLICY IF EXISTS "Owners can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view owner categories" ON public.categories;

-- Customers
DROP POLICY IF EXISTS "Users can create their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;

-- Discount rules
DROP POLICY IF EXISTS "Admins can manage discount rules" ON public.discount_rules;
DROP POLICY IF EXISTS "Authenticated users can view active discount rules" ON public.discount_rules;

-- Inventory
DROP POLICY IF EXISTS "Admins, managers and stock clerks can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can create inventory for their branches" ON public.inventory;
DROP POLICY IF EXISTS "Users can delete inventory of their branches" ON public.inventory;
DROP POLICY IF EXISTS "Users can update inventory of their branches" ON public.inventory;
DROP POLICY IF EXISTS "Users can view owner branch inventory" ON public.inventory;

-- Inventory movements
DROP POLICY IF EXISTS "Authenticated users can create movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Users view movements of their branches" ON public.inventory_movements;

-- Loyalty settings
DROP POLICY IF EXISTS "Admins can manage loyalty settings" ON public.loyalty_settings;
DROP POLICY IF EXISTS "Authenticated users can view loyalty settings" ON public.loyalty_settings;

-- Price history
DROP POLICY IF EXISTS "Authenticated users can insert price history" ON public.price_history;
DROP POLICY IF EXISTS "Users view price history of their products" ON public.price_history;

-- Products
DROP POLICY IF EXISTS "Authorized users can manage products" ON public.products;
DROP POLICY IF EXISTS "Users can view owner products" ON public.products;

-- Profiles
DROP POLICY IF EXISTS "Admins can update user branch assignments" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners can view their users profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Purchases
DROP POLICY IF EXISTS "Service role can manage purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;

-- Sale items
DROP POLICY IF EXISTS "Operators can create sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users view sale items of their branches" ON public.sale_items;

-- Sales
DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales of their branches" ON public.sales;
DROP POLICY IF EXISTS "Users can view sales of their branches" ON public.sales;

-- Sales targets
DROP POLICY IF EXISTS "Admins can manage targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can view all targets" ON public.sales_targets;

-- Shifts
DROP POLICY IF EXISTS "Admins and managers can manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can view owner active shifts" ON public.shifts;

-- Subscriptions
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

-- User active branch
DROP POLICY IF EXISTS "Users can insert their own active branch" ON public.user_active_branch;
DROP POLICY IF EXISTS "Users can update their own active branch" ON public.user_active_branch;
DROP POLICY IF EXISTS "Users can view their own active branch" ON public.user_active_branch;

-- User roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;

-- =====================================================
-- APLICAR NOVAS POLÍTICAS SIMPLIFICADAS
-- =====================================================

-- Profiles
CREATE POLICY "Users can view profiles" ON public.profiles
FOR SELECT USING (auth.uid() = id OR id IN (SELECT id FROM profiles WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Branches
CREATE POLICY "Users can manage branches" ON public.branches
FOR ALL USING (auth.uid() = owner_id);

-- Categories
CREATE POLICY "Users can manage categories" ON public.categories
FOR ALL USING (auth.uid() = owner_id);

-- Products
CREATE POLICY "Users can manage products" ON public.products
FOR ALL USING (auth.uid() = owner_id);

-- Customers
CREATE POLICY "Users can manage customers" ON public.customers
FOR ALL USING (auth.uid() = owner_id);

-- Sales
CREATE POLICY "Users can manage sales" ON public.sales
FOR ALL USING (
  branch_id IN (SELECT id FROM branches WHERE owner_id = auth.uid())
);

-- Sale items
CREATE POLICY "Users can manage sale_items" ON public.sale_items
FOR ALL USING (
  sale_id IN (SELECT id FROM sales WHERE branch_id IN (SELECT id FROM branches WHERE owner_id = auth.uid()))
);

-- Inventory
CREATE POLICY "Users can manage inventory" ON public.inventory
FOR ALL USING (
  branch_id IN (SELECT id FROM branches WHERE owner_id = auth.uid())
);

-- Inventory movements
CREATE POLICY "Users can manage inventory_movements" ON public.inventory_movements
FOR ALL USING (
  branch_id IN (SELECT id FROM branches WHERE owner_id = auth.uid())
);

-- Cash registers
CREATE POLICY "Users can manage cash_registers" ON public.cash_registers
FOR ALL USING (
  branch_id IN (SELECT id FROM branches WHERE owner_id = auth.uid())
);

-- Cash movements
CREATE POLICY "Users can manage cash_movements" ON public.cash_movements
FOR ALL USING (
  cash_register_id IN (SELECT id FROM cash_registers WHERE branch_id IN (SELECT id FROM branches WHERE owner_id = auth.uid()))
);

-- Shifts
CREATE POLICY "Users can manage shifts" ON public.shifts
FOR ALL USING (auth.uid() = owner_id);

-- Price history
CREATE POLICY "Users can manage price_history" ON public.price_history
FOR ALL USING (
  product_id IN (SELECT id FROM products WHERE owner_id = auth.uid())
);

-- User roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- User active branch
CREATE POLICY "Users can manage own active branch" ON public.user_active_branch
FOR ALL USING (auth.uid() = user_id);

-- Discount rules
CREATE POLICY "Admins can manage discount_rules" ON public.discount_rules
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active discount_rules" ON public.discount_rules
FOR SELECT USING (is_active = true);

-- Loyalty settings
CREATE POLICY "Admins can manage loyalty_settings" ON public.loyalty_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view loyalty_settings" ON public.loyalty_settings
FOR SELECT USING (true);

-- Sales targets
CREATE POLICY "Admins can manage sales_targets" ON public.sales_targets
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view sales_targets" ON public.sales_targets
FOR SELECT USING (true);

-- Subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
FOR ALL USING (true);

-- Purchases
CREATE POLICY "Users can view own purchases" ON public.purchases
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage purchases" ON public.purchases
FOR ALL USING (true);