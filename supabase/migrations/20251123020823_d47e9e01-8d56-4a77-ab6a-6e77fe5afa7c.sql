-- Simplify RLS policy for inserting sales to avoid blocking valid operators

DROP POLICY IF EXISTS "Company users can create sales" ON public.sales;

CREATE POLICY "Users can create their own sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  cashier_id = auth.uid()
);