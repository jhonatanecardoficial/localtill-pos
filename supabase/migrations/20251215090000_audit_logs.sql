-- ==============================================================================
-- AUDIT LOGS: tabela e triggers genéricas
-- Data: 2025-12-15
-- Descrição: Cria a tabela de auditoria e aplica triggers em tabelas críticas.
-- ==============================================================================

-- 1) Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Função genérica de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user uuid;
  v_record_id uuid;
BEGIN
  -- Tenta obter usuário atual; em triggers executadas por service role pode não haver auth.uid()
  BEGIN
    v_user := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user := NULL;
  END;

  -- Tenta inferir a PK 'id' se existir
  IF TG_OP = 'INSERT' THEN
    BEGIN v_record_id := NEW.id; EXCEPTION WHEN OTHERS THEN v_record_id := NULL; END;
    INSERT INTO public.audit_logs(table_name, record_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', NULL, to_jsonb(NEW), v_user);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    BEGIN v_record_id := NEW.id; EXCEPTION WHEN OTHERS THEN v_record_id := NULL; END;
    INSERT INTO public.audit_logs(table_name, record_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    BEGIN v_record_id := OLD.id; EXCEPTION WHEN OTHERS THEN v_record_id := NULL; END;
    INSERT INTO public.audit_logs(table_name, record_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), NULL, v_user);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3) Aplicar triggers nas tabelas críticas
DO $$
BEGIN
  -- sales
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_sales_trigger'
  ) THEN
    CREATE TRIGGER audit_sales_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
  END IF;

  -- sale_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_sale_items_trigger'
  ) THEN
    CREATE TRIGGER audit_sale_items_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
  END IF;

  -- cash_registers
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_cash_registers_trigger'
  ) THEN
    CREATE TRIGGER audit_cash_registers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.cash_registers
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
  END IF;

  -- inventory
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_inventory_trigger'
  ) THEN
    CREATE TRIGGER audit_inventory_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
  END IF;

  -- products (útil para preço/atributos)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_products_trigger'
  ) THEN
    CREATE TRIGGER audit_products_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
  END IF;
END
$$;

