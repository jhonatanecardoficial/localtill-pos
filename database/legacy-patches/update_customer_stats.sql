-- Funções RPC para atualizar estatísticas do cliente e pontos
-- Execute este script no SQL Editor do Supabase Dashboard para corrigir o problema

-- 1. Função para atualizar total de compras (NOVA)
CREATE OR REPLACE FUNCTION update_customer_stats(
  c_id UUID,
  amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET 
    total_purchases = COALESCE(total_purchases, 0) + amount,
    updated_at = NOW()
  WHERE id = c_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir que as funções de pontos existam (caso não tenham sido criadas)
CREATE OR REPLACE FUNCTION increment_loyalty_points(
  customer_id UUID,
  points INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET loyalty_points = COALESCE(loyalty_points, 0) + points
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_loyalty_points(
  customer_id UUID,
  points INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET loyalty_points = GREATEST(0, COALESCE(loyalty_points, 0) - points)
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Permissões
GRANT EXECUTE ON FUNCTION update_customer_stats(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_loyalty_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_loyalty_points(UUID, INTEGER) TO authenticated;
