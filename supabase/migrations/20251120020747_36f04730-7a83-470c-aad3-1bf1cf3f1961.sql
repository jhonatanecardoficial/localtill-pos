-- Ajustar política de SELECT em public.branches para permitir que usuários vejam a filial à qual estão vinculados

-- Remove a política antiga de visualização restrita
DROP POLICY IF EXISTS "Users can view their own branches" ON public.branches;

-- Cria nova política permitindo:
-- 1) Dono da filial (owner_id = auth.uid()) ver suas próprias filiais
-- 2) Qualquer usuário cujo perfil (profiles.id) tenha branch_id igual ao id da filial ver essa filial
CREATE POLICY "Users can view branches they own or are assigned to"
ON public.branches
FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.branch_id = branches.id
  )
);