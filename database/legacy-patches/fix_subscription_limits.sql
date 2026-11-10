-- Corrigir todas as assinaturas para ter limite de 1 filial
UPDATE public.subscriptions
SET branches_limit = 1
WHERE branches_limit != 1;
