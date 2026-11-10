-- Migration to fix database triggers and permissions for user creation
-- Created manually to force update on Lovable/Supabase

-- 1. Recriar handle_new_user com search_path vazio e permissões corretas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- 2. Recriar handle_new_user_subscription com search_path vazio
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, branches_limit, users_limit, status)
  VALUES (NEW.id, 1, 4, 'active');
  RETURN NEW;
END;
$$;

-- 3. Conceder permissões essenciais ao supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON TABLE public.profiles TO supabase_auth_admin;
GRANT INSERT ON TABLE public.user_roles TO supabase_auth_admin;
GRANT INSERT ON TABLE public.subscriptions TO supabase_auth_admin;

-- 4. Recriar os triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_subscription_created ON auth.users;
CREATE TRIGGER on_auth_user_subscription_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
