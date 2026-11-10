-- 1. Criar o trigger que faltava para dar Admin automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_first_user_admin();

-- 2. Corrigir o seu usuário atual (dar permissão de Admin)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'jhonatanecard@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Criar uma filial padrão para você (se não tiver)
DO $$
DECLARE
  v_user_id UUID;
  v_branch_id UUID;
BEGIN
  -- Pegar ID do usuário
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jhonatanecard@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Verificar se já tem filial
    SELECT id INTO v_branch_id FROM public.branches WHERE owner_id = v_user_id LIMIT 1;
    
    -- Se não tiver, criar
    IF v_branch_id IS NULL THEN
      INSERT INTO public.branches (name, code, address, is_active, owner_id)
      VALUES ('Matriz', 'MTZ001', 'Endereço Principal', true, v_user_id)
      RETURNING id INTO v_branch_id;
    END IF;
    
    -- Vincular filial ao perfil
    UPDATE public.profiles
    SET branch_id = v_branch_id
    WHERE id = v_user_id;
  END IF;
END $$;
