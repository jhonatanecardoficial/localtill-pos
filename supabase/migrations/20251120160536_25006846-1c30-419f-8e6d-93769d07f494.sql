-- Create function to validate if a branch matches the user's active branch
CREATE OR REPLACE FUNCTION public.user_branch_matches_active(_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_active_branch
    WHERE user_id = auth.uid()
      AND branch_id = _branch_id
  );
$$;

-- Replace INSERT policy for cash_registers to use the new function
DROP POLICY IF EXISTS "Users can open cash register in active branch" ON public.cash_registers;

CREATE POLICY "Users can open cash register in active branch"
ON public.cash_registers
FOR INSERT
WITH CHECK (
  operator_id = auth.uid()
  AND public.user_branch_matches_active(branch_id)
);