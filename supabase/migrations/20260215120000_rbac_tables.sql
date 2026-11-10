-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role app_role NOT NULL,
  permission_slug TEXT REFERENCES public.permissions(slug) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_slug)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for permissions/role_permissions (Read-only for authenticated)
CREATE POLICY "Authenticated users can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);


-- Insert default permissions
INSERT INTO public.permissions (slug, description) VALUES
('dashboard.view', 'Visualizar Dashboard'),
('products.view', 'Visualizar Produtos'),
('products.create', 'Criar Produtos'),
('products.edit', 'Editar Produtos'),
('products.delete', 'Excluir Produtos'),
('categories.view', 'Visualizar Categorias'),
('categories.manage', 'Gerenciar Categorias'),
('inventory.view', 'Visualizar Estoque'),
('inventory.manage', 'Gerenciar Estoque'),
('sales.view', 'Visualizar Vendas'),
('sales.create', 'Realizar Vendas'),
('customers.view', 'Visualizar Clientes'),
('customers.manage', 'Gerenciar Clientes'),
('reports.view', 'Visualizar Relatórios'),
('settings.edit', 'Editar Configurações'),
('users.manage', 'Gerenciar Usuários')
ON CONFLICT (slug) DO NOTHING;

-- Assign permissions to roles
-- Admin: Everything
INSERT INTO public.role_permissions (role, permission_slug)
SELECT 'admin', slug FROM public.permissions
ON CONFLICT DO NOTHING;

-- Manager: Almost everything (except maybe some dangerous settings if we wanted, but for now match admin mostly)
INSERT INTO public.role_permissions (role, permission_slug)
SELECT 'manager', slug FROM public.permissions 
WHERE slug != 'settings.edit' -- Example restriction
ON CONFLICT DO NOTHING;
-- Add back specific settings if needed, or just give all for now based on current app logic
INSERT INTO public.role_permissions (role, permission_slug) VALUES ('manager', 'users.manage') ON CONFLICT DO NOTHING;


-- Stock Clerk (Estoquista)
INSERT INTO public.role_permissions (role, permission_slug) VALUES
('dashboard.view', 'dashboard.view'),
('products.view', 'products.view'),
('products.create', 'products.create'),
('products.edit', 'products.edit'),
('categories.view', 'categories.view'),
('inventory.view', 'inventory.view'),
('inventory.manage', 'inventory.manage')
ON CONFLICT DO NOTHING;

-- Operator (Caixa)
INSERT INTO public.role_permissions (role, permission_slug) VALUES
('dashboard.view', 'dashboard.view'),
('sales.view', 'sales.view'),
('sales.create', 'sales.create'),
('customers.view', 'customers.view'),
('customers.manage', 'customers.manage')
ON CONFLICT DO NOTHING;

-- RLS Updates for Products/Categories to include stock_clerk
-- (Re-applying policies to be sure)

DROP POLICY IF EXISTS "Admins and managers can manage products" ON public.products;
CREATE POLICY "Admins, managers and stock clerks can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'stock_clerk')
  );

DROP POLICY IF EXISTS "Admins and managers can manage categories" ON public.categories;
CREATE POLICY "Admins, managers and stock clerks can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'stock_clerk')
  );
