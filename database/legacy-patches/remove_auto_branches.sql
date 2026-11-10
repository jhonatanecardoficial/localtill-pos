-- =====================================================
-- REMOVER LÓGICA DE CRIAÇÃO AUTOMÁTICA DE FILIAIS
-- =====================================================

-- 1. Deletar a filial "Filial Principal" criada sem owner_id
DELETE FROM public.branches 
WHERE name = 'Filial Principal' AND code = 'FIL001' AND owner_id IS NULL;

-- 2. OPCIONAL: Deletar filiais "Matriz" criadas automaticamente
-- (CUIDADO: Só execute se você quiser forçar os usuários a criarem manualmente)
-- DELETE FROM public.branches WHERE name = 'Matriz' AND code = 'MTZ001';

-- 3. Atualizar perfis que estavam vinculados a filiais auto-criadas
-- (Remove o branch_id para forçar o usuário a escolher/criar uma filial)
UPDATE public.profiles
SET branch_id = NULL
WHERE branch_id IN (
  SELECT id FROM public.branches 
  WHERE name = 'Matriz' AND code = 'MTZ001'
);

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Após executar este script, os usuários existentes precisarão:
-- 1. Ir em Configurações > Filiais
-- 2. Criar sua primeira filial manualmente
-- 3. O sistema permite criar até o limite da assinatura (branches_limit)
