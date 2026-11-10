-- =====================================================
-- MIGRATION: Tabelas de Auditoria para Deleções
-- Criado em: 2026-03-11
-- =====================================================

-- Tabela de auditoria para vendas deletadas
CREATE TABLE IF NOT EXISTS deleted_sales_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL,
    sale_number TEXT,
    branch_id UUID,
    total NUMERIC,
    subtotal NUMERIC,
    discount NUMERIC,
    payment_method TEXT,
    cashier_id UUID,
    cashier_name TEXT,
    customer_name TEXT,
    customer_document TEXT,
    cash_register_id UUID,
    sale_items JSONB,
    deleted_by UUID NOT NULL,
    deleted_by_name TEXT,
    reason TEXT,
    original_created_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deleted_sales_audit_branch_id ON deleted_sales_audit(branch_id);
CREATE INDEX IF NOT EXISTS idx_deleted_sales_audit_deleted_at ON deleted_sales_audit(deleted_at);

-- Tabela de auditoria para movimentações de estoque deletadas
CREATE TABLE IF NOT EXISTS deleted_movements_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_id UUID NOT NULL,
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    branch_id UUID,
    branch_name TEXT,
    quantity INTEGER,
    movement_type TEXT,
    reference_id UUID,
    notes TEXT,
    user_id UUID,
    user_name TEXT,
    original_created_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID NOT NULL,
    deleted_by_name TEXT,
    reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deleted_movements_audit_branch_id ON deleted_movements_audit(branch_id);
CREATE INDEX IF NOT EXISTS idx_deleted_movements_audit_deleted_at ON deleted_movements_audit(deleted_at);
