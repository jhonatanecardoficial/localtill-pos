-- Forçar TODAS as assinaturas para o limite correto de 1 filial
UPDATE public.subscriptions
SET branches_limit = 1,
    users_limit = 4,
    updated_at = NOW();

-- Garantir que não existam assinaturas duplicadas ou inconsistentes
DELETE FROM public.subscriptions 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM public.subscriptions 
    ORDER BY user_id, created_at DESC
);

-- Verificar resultado
SELECT email, branches_limit, users_limit 
FROM auth.users u
JOIN public.subscriptions s ON s.user_id = u.id;
