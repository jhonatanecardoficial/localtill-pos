-- =====================================================
-- ESQUEMA COMPLETO DO BANCO DE DADOS - PDV SYSTEM
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'operator',
    'stock_clerk'
);

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'debit',
    'credit',
    'pix',
    'check',
    'other'
);

CREATE TYPE public.transaction_type AS ENUM (
    'sale',
    'return',
    'adjustment',
    'transfer'
);

-- =====================================================
-- 2. TABELAS PRINCIPAIS
-- =====================================================

-- BRANCHES (FILIAIS)
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    manager_id UUID,
    is_active BOOLEAN DEFAULT true,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PROFILES (PERFIS DE USUÁRIOS)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    branch_id UUID REFERENCES public.branches(id),
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- USER_ROLES (PAPÉIS DOS USUÁRIOS)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- CATEGORIES (CATEGORIAS DE PRODUTOS)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PRODUCTS (PRODUTOS)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT NOT NULL,
    barcode TEXT,
    category_id UUID REFERENCES public.categories(id),
    unit TEXT NOT NULL DEFAULT 'un',
    cost_price NUMERIC DEFAULT 0,
    sale_price NUMERIC NOT NULL,
    tax_rate NUMERIC DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- INVENTORY (ESTOQUE)
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    product_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- INVENTORY_MOVEMENTS (MOVIMENTAÇÕES DE ESTOQUE)
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    product_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    user_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    movement_type TEXT NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CUSTOMERS (CLIENTES)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    document TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    total_purchases NUMERIC DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SHIFTS (TURNOS)
CREATE TABLE public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CASH_REGISTERS (REGISTROS DE CAIXA)
CREATE TABLE public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL,
    shift_name TEXT NOT NULL,
    operator_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_amount NUMERIC NOT NULL DEFAULT 0,
    closing_amount_counted NUMERIC,
    total_sales NUMERIC DEFAULT 0,
    total_cash NUMERIC DEFAULT 0,
    total_debit NUMERIC DEFAULT 0,
    total_credit NUMERIC DEFAULT 0,
    total_pix NUMERIC DEFAULT 0,
    total_other NUMERIC DEFAULT 0,
    difference NUMERIC,
    current_change NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CASH_MOVEMENTS (MOVIMENTAÇÕES DE CAIXA)
CREATE TABLE public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL,
    movement_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    reason TEXT,
    performed_by UUID NOT NULL,
    authorized_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SALES (VENDAS)
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    sale_number TEXT NOT NULL,
    branch_id UUID NOT NULL,
    cashier_id UUID NOT NULL,
    customer_id UUID,
    customer_name TEXT,
    customer_document TEXT,
    cash_register_id UUID,
    payment_method public.payment_method NOT NULL,
    transaction_type public.transaction_type DEFAULT 'sale',
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SALE_ITEMS (ITENS DE VENDA)
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    sale_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PRICE_HISTORY (HISTÓRICO DE PREÇOS)
CREATE TABLE public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    old_price NUMERIC,
    new_price NUMERIC NOT NULL,
    changed_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 3. TABELAS DE CONFIGURAÇÃO
-- =====================================================

-- DISCOUNT_RULES (REGRAS DE DESCONTO)
CREATE TABLE public.discount_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type TEXT NOT NULL,
    threshold NUMERIC NOT NULL,
    discount_percentage NUMERIC NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- LOYALTY_SETTINGS (CONFIGURAÇÕES DE FIDELIDADE)
CREATE TABLE public.loyalty_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    points_per_real NUMERIC NOT NULL DEFAULT 1,
    reais_per_point NUMERIC NOT NULL DEFAULT 0.01,
    points_expiry_months INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SALES_TARGETS (METAS DE VENDAS)
CREATE TABLE public.sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    achieved_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- USER_ACTIVE_BRANCH (FILIAL ATIVA DO USUÁRIO)
CREATE TABLE public.user_active_branch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 4. TABELAS DE LICENCIAMENTO (STRIPE)
-- =====================================================

-- SUBSCRIPTIONS (ASSINATURAS)
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    branches_limit INTEGER NOT NULL DEFAULT 1,
    users_limit INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PURCHASES (COMPRAS)
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    item_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 5. FUNÇÕES DO BANCO DE DADOS
-- =====================================================

-- Função para verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Função para criar perfil de novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, owner_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'owner_id')::uuid, NEW.id)
  );
  RETURN NEW;
END;
$$;

-- Função para atribuir admin ao primeiro usuário
CREATE OR REPLACE FUNCTION public.assign_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'owner_id' IS NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para criar assinatura de novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, branches_limit, users_limit, status)
  VALUES (NEW.id, 1, 4, 'active');
  RETURN NEW;
END;
$$;

-- Função para definir owner_id automaticamente
CREATE OR REPLACE FUNCTION public.set_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Função para definir owner_id de filial
CREATE OR REPLACE FUNCTION public.set_branch_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Função para definir owner_id de cliente
CREATE OR REPLACE FUNCTION public.set_customer_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Função para verificar se usuário tem filiais
CREATE OR REPLACE FUNCTION public.user_has_branches()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.branches
    WHERE owner_id = auth.uid()
  );
END;
$$;

-- =====================================================
-- 6. ÍNDICES IMPORTANTES
-- =====================================================

CREATE INDEX idx_branches_owner_id ON public.branches(owner_id);
CREATE INDEX idx_profiles_owner_id ON public.profiles(owner_id);
CREATE INDEX idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX idx_products_owner_id ON public.products(owner_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_categories_owner_id ON public.categories(owner_id);
CREATE INDEX idx_inventory_product_branch ON public.inventory(product_id, branch_id);
CREATE INDEX idx_sales_branch_id ON public.sales(branch_id);
CREATE INDEX idx_sales_cashier_id ON public.sales(cashier_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);
CREATE INDEX idx_cash_registers_operator_id ON public.cash_registers(operator_id);
CREATE INDEX idx_cash_registers_branch_id ON public.cash_registers(branch_id);
CREATE INDEX idx_shifts_owner_id ON public.shifts(owner_id);

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger para updated_at em branches
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para updated_at em shifts
CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON public.shifts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- RESUMO DA ARQUITETURA
-- =====================================================

/*
ESTRUTURA DO SISTEMA:

1. HIERARQUIA DE USUÁRIOS:
   - OWNER (admin) -> Dono do sistema, acesso total
   - Manager -> Gerente, acesso amplo
   - Stock_clerk -> Controle de estoque
   - Operator -> Operador de caixa

2. ISOLAMENTO DE DADOS:
   - Cada owner_id tem seus próprios dados
   - Usuários internos veem apenas dados de seu owner
   - Filiais são segregadas por owner_id
   - Produtos, categorias, turnos compartilhados entre filiais do mesmo owner

3. LICENCIAMENTO:
   - 1 filial gratuita por owner
   - 4 usuários totais (1 admin + 3 internos) grátis
   - Filiais adicionais: $25/mês
   - Pacotes de 10 usuários: $25/mês

4. FLUXO DE CAIXA:
   - Abertura com turno e valor inicial
   - Vendas vinculadas ao caixa aberto
   - Movimentações de sangria/suprimento
   - Fechamento com conferência e diferença

5. CONTROLE DE ESTOQUE:
   - Por produto e filial
   - Movimentações rastreadas
   - Alertas de estoque mínimo
   - Integração automática com vendas

6. VENDAS E PDV:
   - Vinculadas a filial e operador
   - Múltiplas formas de pagamento
   - Desconto progressivo automático
   - Programa de fidelidade com pontos
*/
