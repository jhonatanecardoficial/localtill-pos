-- Trigger function to update customer total_purchases
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
        -- Optimization: Avoid double update if customer_id didn't change
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

-- Create Trigger
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON public.sales;
CREATE TRIGGER update_customer_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

-- Backfill existing data
WITH customer_totals AS (
    SELECT customer_id, SUM(total) as total
    FROM public.sales
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
)
UPDATE public.customers c
SET total_purchases = ct.total
FROM customer_totals ct
WHERE c.id = ct.customer_id;
