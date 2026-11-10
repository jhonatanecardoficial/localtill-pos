-- Drop the old trigger that assigns admin to all users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;

-- Update the assign_first_user_admin function to only assign admin to owners
CREATE OR REPLACE FUNCTION public.assign_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only assign admin role if the user is an owner (no owner_id in metadata)
  -- This means they signed up through the main signup flow, not created by another admin
  IF NEW.raw_user_meta_data->>'owner_id' IS NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_first_user_admin();

-- Clean up duplicate admin roles for non-owner users
-- Delete admin roles for users who have an owner_id (they are not owners)
DELETE FROM public.user_roles
WHERE role = 'admin'
AND user_id IN (
  SELECT id FROM public.profiles WHERE owner_id != id
);