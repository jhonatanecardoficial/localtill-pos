-- Fase 1: Adicionar campo branch_id na tabela profiles

-- 1.1. Adicionar coluna branch_id (nullable inicialmente)
ALTER TABLE public.profiles 
ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 1.2. Criar índice para performance
CREATE INDEX idx_profiles_branch_id ON public.profiles(branch_id);

-- 1.3. Migração de dados existentes: vincular usuários internos à primeira filial ativa do dono
-- Para cada usuário que NÃO é admin, atribuir à primeira filial ativa do seu dono
UPDATE public.profiles p
SET branch_id = (
  SELECT b.id 
  FROM public.branches b 
  WHERE b.owner_id = p.owner_id 
    AND b.is_active = true 
  ORDER BY b.created_at ASC 
  LIMIT 1
)
WHERE p.id IN (
  SELECT ur.user_id 
  FROM public.user_roles ur 
  WHERE ur.role != 'admin'
)
AND p.owner_id IS NOT NULL;

-- 1.4. Atualizar políticas RLS da tabela profiles
-- Adicionar política para que admins possam atualizar branch_id dos seus usuários
CREATE POLICY "Admins can update user branch assignments"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') 
  AND owner_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND owner_id = auth.uid()
);