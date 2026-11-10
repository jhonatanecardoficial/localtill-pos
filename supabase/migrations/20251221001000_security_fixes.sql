-- Security Fixes Migration
-- Addresses Supabase Advisor recommendations

-- ==================================================
-- 1. Fix SECURITY DEFINER View
-- ==================================================
-- Drop and recreate the view as SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.inventory_movements_report_view;

CREATE VIEW public.inventory_movements_report_view 
WITH (security_invoker = true)
AS
SELECT 
    im.id,
    im.product_id,
    im.branch_id,
    im.quantity,
    im.movement_type,
    im.reference_id,
    im.notes,
    im.created_at,
    im.user_id as created_by,
    p.name as product_name,
    p.sku as product_sku,
    b.name as branch_name,
    pr.full_name as created_by_name
FROM public.inventory_movements im
LEFT JOIN public.products p ON im.product_id = p.id
LEFT JOIN public.branches b ON im.branch_id = b.id
LEFT JOIN public.profiles pr ON im.user_id = pr.id;

-- Grant access to authenticated users
GRANT SELECT ON public.inventory_movements_report_view TO authenticated;

-- ==================================================
-- 2. Enable RLS on audit_logs table
-- ==================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
-- Only admins and managers can view audit logs
DROP POLICY IF EXISTS "Admins and managers can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins and managers can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
        )
    );

-- System can insert audit logs (via SECURITY DEFINER trigger)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- ==================================================
-- 3. Fix mutable search_path in functions
-- ==================================================

-- 3.1 Fix audit_trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        INSERT INTO public.audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data, auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_data, auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- 3.2 Fix update_customer_stats function
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update for NEW record (INSERT or UPDATE)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET 
            total_purchases = (
                SELECT COALESCE(SUM(total), 0)
                FROM public.sales
                WHERE customer_id = NEW.customer_id
            ),
            updated_at = NOW()
        WHERE id = NEW.customer_id;
    END IF;

    -- Update for OLD record (UPDATE or DELETE) if customer changed or was removed
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.customer_id IS NOT NULL THEN
        IF (TG_OP = 'DELETE') OR (NEW.customer_id IS DISTINCT FROM OLD.customer_id) THEN
            UPDATE public.customers
            SET 
                total_purchases = (
                    SELECT COALESCE(SUM(total), 0)
                    FROM public.sales
                    WHERE customer_id = OLD.customer_id
                ),
                updated_at = NOW()
            WHERE id = OLD.customer_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

-- ==================================================
-- 4. Backfill customer total_purchases
-- ==================================================
-- Re-run backfill to ensure all totals are correct
UPDATE public.customers c
SET total_purchases = COALESCE(
    (SELECT SUM(total) FROM public.sales WHERE customer_id = c.id),
    0
);

-- ==================================================
-- 5. Ensure trigger exists for customer stats
-- ==================================================
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON public.sales;
CREATE TRIGGER update_customer_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();
