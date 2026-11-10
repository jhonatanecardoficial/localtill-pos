-- Script de Diagnóstico
-- Execute isso no SQL Editor para ver como estão os usuários no banco

SELECT 
    au.email,
    au.created_at,
    p.full_name as profile_name,
    ur.role as user_role,
    b.name as branch_owned,
    p.branch_id as profile_branch_id
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
LEFT JOIN public.branches b ON b.owner_id = au.id
ORDER BY au.created_at DESC;
