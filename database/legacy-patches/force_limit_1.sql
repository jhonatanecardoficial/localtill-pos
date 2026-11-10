-- =====================================================
-- SOLUÇÃO EMERGENCIAL: Forçar branches_limit = 1
-- =====================================================

-- Atualizar TODAS as subscriptions para ter limite de 1 filial
UPDATE public.subscriptions
SET branches_limit = 1,
    updated_at = NOW()
WHERE branches_limit != 1;

-- Verificar o resultado
SELECT 
    u.email,
    s.branches_limit,
    s.users_limit,
    s.status
FROM auth.users u
JOIN public.subscriptions s ON s.user_id = u.id
ORDER BY u.created_at DESC;
