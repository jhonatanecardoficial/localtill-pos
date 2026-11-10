-- Ver a assinatura atual do usuário
SELECT 
    u.email,
    s.branches_limit,
    s.users_limit,
    s.status,
    s.created_at,
    s.updated_at
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE u.email = 'teste2@email.com'  -- ou o email que você usou
ORDER BY u.created_at DESC;
