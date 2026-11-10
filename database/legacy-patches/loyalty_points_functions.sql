-- Funções RPC para gerenciamento atômico de pontos de fidelidade
-- Execute este script no SQL Editor do Supabase Dashboard

-- Função para incrementar pontos (conceder pontos após compra)
CREATE OR REPLACE FUNCTION increment_loyalty_points(
  customer_id UUID,
  points INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET loyalty_points = loyalty_points + points
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para decrementar pontos (usar pontos como desconto)
CREATE OR REPLACE FUNCTION decrement_loyalty_points(
  customer_id UUID,
  points INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET loyalty_points = GREATEST(0, loyalty_points - points)
  WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que as funções sejam acessíveis
GRANT EXECUTE ON FUNCTION increment_loyalty_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_loyalty_points(UUID, INTEGER) TO authenticated;
