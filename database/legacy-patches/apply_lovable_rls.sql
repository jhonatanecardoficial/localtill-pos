-- Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_branch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- BRANCHES
-- ========================================================
DROP POLICY IF EXISTS "Users can view company branches" ON public.branches;
CREATE POLICY "Users can view company branches" ON public.branches FOR SELECT USING (
  (owner_id = auth.uid()) OR 
  (EXISTS (SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.owner_id = branches.owner_id))))
);

DROP POLICY IF EXISTS "Users can create their own branches" ON public.branches;
CREATE POLICY "Users can create their own branches" ON public.branches FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can update their own branches" ON public.branches;
CREATE POLICY "Users can update their own branches" ON public.branches FOR UPDATE USING (
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete their own branches" ON public.branches;
CREATE POLICY "Users can delete their own branches" ON public.branches FOR DELETE USING (
  owner_id = auth.uid()
);

-- ========================================================
-- CASH MOVEMENTS
-- ========================================================
DROP POLICY IF EXISTS "Users can view their cash register movements" ON public.cash_movements;
CREATE POLICY "Users can view their cash register movements" ON public.cash_movements FOR SELECT USING (
  (cash_register_id IN (SELECT cash_registers.id FROM cash_registers WHERE (cash_registers.operator_id = auth.uid()))) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

DROP POLICY IF EXISTS "Users can create cash movements for their register" ON public.cash_movements;
CREATE POLICY "Users can create cash movements for their register" ON public.cash_movements FOR INSERT WITH CHECK (
  cash_register_id IN (SELECT cash_registers.id FROM cash_registers WHERE ((cash_registers.operator_id = auth.uid()) AND (cash_registers.status = 'OPEN'::text)))
);

-- ========================================================
-- CASH REGISTERS
-- ========================================================
DROP POLICY IF EXISTS "Users can view cash registers" ON public.cash_registers;
CREATE POLICY "Users can view cash registers" ON public.cash_registers FOR SELECT TO authenticated USING (
  (operator_id = auth.uid()) OR 
  (EXISTS (SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND ((p.owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = cash_registers.operator_id))) OR (p.branch_id = cash_registers.branch_id)))))
);

DROP POLICY IF EXISTS "Users can open cash register" ON public.cash_registers;
CREATE POLICY "Users can open cash register" ON public.cash_registers FOR INSERT TO authenticated WITH CHECK (
  operator_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can close their own cash register" ON public.cash_registers;
CREATE POLICY "Users can close their own cash register" ON public.cash_registers FOR UPDATE TO authenticated USING (
  operator_id = auth.uid()
);

-- ========================================================
-- CATEGORIES
-- ========================================================
DROP POLICY IF EXISTS "Users can view owner categories" ON public.categories;
CREATE POLICY "Users can view owner categories" ON public.categories FOR SELECT USING (
  (owner_id = auth.uid()) OR 
  (owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = auth.uid())))
);

DROP POLICY IF EXISTS "Owners can manage categories" ON public.categories;
CREATE POLICY "Owners can manage categories" ON public.categories FOR ALL USING (
  owner_id = auth.uid()
);

-- ========================================================
-- CUSTOMERS
-- ========================================================
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Users can view their own customers" ON public.customers FOR SELECT USING (
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can create their own customers" ON public.customers;
CREATE POLICY "Users can create their own customers" ON public.customers FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
CREATE POLICY "Users can update their own customers" ON public.customers FOR UPDATE USING (
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;
CREATE POLICY "Users can delete their own customers" ON public.customers FOR DELETE USING (
  owner_id = auth.uid()
);

-- ========================================================
-- DISCOUNT RULES
-- ========================================================
DROP POLICY IF EXISTS "Authenticated users can view active discount rules" ON public.discount_rules;
CREATE POLICY "Authenticated users can view active discount rules" ON public.discount_rules FOR SELECT USING (
  is_active = true
);

DROP POLICY IF EXISTS "Admins can manage discount rules" ON public.discount_rules;
CREATE POLICY "Admins can manage discount rules" ON public.discount_rules FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- ========================================================
-- INVENTORY
-- ========================================================
DROP POLICY IF EXISTS "Users can view owner branch inventory" ON public.inventory;
CREATE POLICY "Users can view owner branch inventory" ON public.inventory FOR SELECT USING (
  branch_id IN (SELECT b.id FROM branches b WHERE ((b.owner_id = auth.uid()) OR (b.owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = auth.uid())))))
);

DROP POLICY IF EXISTS "Users can create inventory for their branches" ON public.inventory;
CREATE POLICY "Users can create inventory for their branches" ON public.inventory FOR INSERT WITH CHECK (
  branch_id IN (SELECT branches.id FROM branches WHERE (branches.owner_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can update inventory of their branches" ON public.inventory;
CREATE POLICY "Users can update inventory of their branches" ON public.inventory FOR UPDATE USING (
  branch_id IN (SELECT b.id FROM branches b WHERE ((b.owner_id = auth.uid()) OR (b.owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = auth.uid())))))
);

DROP POLICY IF EXISTS "Users can delete inventory of their branches" ON public.inventory;
CREATE POLICY "Users can delete inventory of their branches" ON public.inventory FOR DELETE USING (
  branch_id IN (SELECT branches.id FROM branches WHERE (branches.owner_id = auth.uid()))
);

DROP POLICY IF EXISTS "Admins, managers and stock clerks can manage inventory" ON public.inventory;
CREATE POLICY "Admins, managers and stock clerks can manage inventory" ON public.inventory FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'stock_clerk'::app_role)
);

-- ========================================================
-- INVENTORY MOVEMENTS
-- ========================================================
DROP POLICY IF EXISTS "Users view movements of their branches" ON public.inventory_movements;
CREATE POLICY "Users view movements of their branches" ON public.inventory_movements FOR SELECT USING (
  branch_id IN (SELECT b.id FROM branches b WHERE ((b.owner_id = auth.uid()) OR (b.owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = auth.uid())))))
);

DROP POLICY IF EXISTS "Authenticated users can create movements" ON public.inventory_movements;
CREATE POLICY "Authenticated users can create movements" ON public.inventory_movements FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- ========================================================
-- LOYALTY SETTINGS
-- ========================================================
DROP POLICY IF EXISTS "Authenticated users can view loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Authenticated users can view loyalty settings" ON public.loyalty_settings FOR SELECT USING (
  true
);

DROP POLICY IF EXISTS "Admins can manage loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Admins can manage loyalty settings" ON public.loyalty_settings FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- ========================================================
-- PRICE HISTORY
-- ========================================================
DROP POLICY IF EXISTS "Users view price history of their products" ON public.price_history;
CREATE POLICY "Users view price history of their products" ON public.price_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM products p WHERE ((p.id = price_history.product_id) AND (p.owner_id = auth.uid())))
);

DROP POLICY IF EXISTS "Authenticated users can insert price history" ON public.price_history;
CREATE POLICY "Authenticated users can insert price history" ON public.price_history FOR INSERT WITH CHECK (
  auth.uid() = changed_by
);

-- ========================================================
-- PRODUCTS
-- ========================================================
DROP POLICY IF EXISTS "Users can view owner products" ON public.products;
CREATE POLICY "Users can view owner products" ON public.products FOR SELECT USING (
  (owner_id = auth.uid()) OR 
  (owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = auth.uid())))
);

DROP POLICY IF EXISTS "Authorized users can manage products" ON public.products;
CREATE POLICY "Authorized users can manage products" ON public.products FOR ALL USING (
  (owner_id = auth.uid()) OR 
  ((owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = auth.uid()))) AND 
   (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'stock_clerk'::app_role)))
);

-- ========================================================
-- PROFILES
-- ========================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Owners can view their users profiles" ON public.profiles;
CREATE POLICY "Owners can view their users profiles" ON public.profiles FOR SELECT USING (
  auth.uid() = owner_id
);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (
  auth.uid() = id
);

DROP POLICY IF EXISTS "Admins can update user branch assignments" ON public.profiles;
CREATE POLICY "Admins can update user branch assignments" ON public.profiles FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) AND (owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (
  auth.uid() = id
);

-- ========================================================
-- PURCHASES
-- ========================================================
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
CREATE POLICY "Users can view their own purchases" ON public.purchases FOR SELECT USING (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Service role can manage purchases" ON public.purchases;
CREATE POLICY "Service role can manage purchases" ON public.purchases FOR ALL USING (
  true
);

-- ========================================================
-- SALE ITEMS
-- ========================================================
DROP POLICY IF EXISTS "Users view sale items of their branches" ON public.sale_items;
CREATE POLICY "Users view sale items of their branches" ON public.sale_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM (sales s JOIN branches b ON ((s.branch_id = b.id))) WHERE ((s.id = sale_items.sale_id) AND (b.owner_id = auth.uid())))
);

DROP POLICY IF EXISTS "Operators can create sale items" ON public.sale_items;
CREATE POLICY "Operators can create sale items" ON public.sale_items FOR INSERT WITH CHECK (
  true
);

-- ========================================================
-- SALES
-- ========================================================
DROP POLICY IF EXISTS "Users can view branch sales" ON public.sales;
CREATE POLICY "Users can view branch sales" ON public.sales FOR SELECT TO authenticated USING (
  (cashier_id = auth.uid()) OR 
  (EXISTS (SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND ((p.owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = sales.cashier_id))) OR (p.branch_id = sales.branch_id)))))
);

DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
CREATE POLICY "Users can create sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (
  cashier_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
CREATE POLICY "Admins can update sales" ON public.sales FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- ========================================================
-- SALES TARGETS
-- ========================================================
DROP POLICY IF EXISTS "Users can view all targets" ON public.sales_targets;
CREATE POLICY "Users can view all targets" ON public.sales_targets FOR SELECT USING (
  true
);

DROP POLICY IF EXISTS "Admins can manage targets" ON public.sales_targets;
CREATE POLICY "Admins can manage targets" ON public.sales_targets FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- ========================================================
-- SHIFTS
-- ========================================================
DROP POLICY IF EXISTS "Users can view owner active shifts" ON public.shifts;
CREATE POLICY "Users can view owner active shifts" ON public.shifts FOR SELECT USING (
  (is_active = true) AND 
  ((owner_id = auth.uid()) OR (owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = auth.uid()))))
);

DROP POLICY IF EXISTS "Admins and managers can manage shifts" ON public.shifts;
CREATE POLICY "Admins and managers can manage shifts" ON public.shifts FOR ALL USING (
  (owner_id = auth.uid()) OR 
  ((owner_id = (SELECT profiles.owner_id FROM profiles WHERE (profiles.id = auth.uid()))) AND 
   (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
);

-- ========================================================
-- SUBSCRIPTIONS
-- ========================================================
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions FOR ALL USING (
  true
);

-- ========================================================
-- USER ACTIVE BRANCH
-- ========================================================
DROP POLICY IF EXISTS "Users can view their own active branch" ON public.user_active_branch;
CREATE POLICY "Users can view their own active branch" ON public.user_active_branch FOR SELECT USING (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can insert their own active branch" ON public.user_active_branch;
CREATE POLICY "Users can insert their own active branch" ON public.user_active_branch FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update their own active branch" ON public.user_active_branch;
CREATE POLICY "Users can update their own active branch" ON public.user_active_branch FOR UPDATE USING (
  auth.uid() = user_id
);

-- ========================================================
-- USER ROLES
-- ========================================================
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (
  true
);

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role)
);
