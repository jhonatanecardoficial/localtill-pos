-- =====================================================
-- ESQUEMA COMPLETO DO BANCO DE DADOS - PDV SYSTEM
-- (SEM CRIAÇÃO AUTOMÁTICA DE FILIAIS)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- ... (resto das tabelas iguais ao arquivo original)
-- CATEGORIES, PRODUCTS, INVENTORY, etc.

-- =====================================================
-- Função para criar perfil de novo usuário (SEM CRIAR FILIAL)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Somente criar o perfil, SEM criar filial
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

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_first_user_admin();

DROP TRIGGER IF EXISTS on_auth_user_subscription_created ON auth.users;
CREATE TRIGGER on_auth_user_subscription_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- =====================================================
-- 8. PERMISSÕES (CORREÇÃO CRÍTICA)
-- =====================================================

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON TABLE public.profiles TO supabase_auth_admin;
GRANT INSERT ON TABLE public.user_roles TO supabase_auth_admin;
GRANT INSERT ON TABLE public.subscriptions TO supabase_auth_admin;

-- =====================================================
-- 9. SEM DADOS INICIAIS
-- (Usuários devem criar suas próprias filiais manualmente)
-- =====================================================
