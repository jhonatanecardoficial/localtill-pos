-- Remove triggers that run on user creation that may cause conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;