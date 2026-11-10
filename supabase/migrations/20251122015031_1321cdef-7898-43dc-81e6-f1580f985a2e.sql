-- Solução definitiva: Corrigir visibilidade de filiais e abertura de caixa

-- PARTE 1: Corrigir a visibilidade das Filiais (branches)
-- Problema: Operadores só conseguiam ver a filial atribuída no perfil,
-- mas precisam ver TODAS as filiais do mesmo dono para abrir caixa em qualquer uma

DROP POLICY IF EXISTS "Users can view branches they own or are assigned to" ON public.branches;

CREATE POLICY "Users can view company branches" 
ON public.branches
FOR SELECT TO authenticated
USING (
    -- Caso 1: O próprio dono
    owner_id = auth.uid()
    OR
    -- Caso 2: Funcionário vendo filiais do seu dono (Owner)
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.owner_id = branches.owner_id
    )
);

-- PARTE 2: Simplificar política de INSERT em cash_registers
-- Agora que as filiais estão visíveis, podemos usar uma política inline robusta

DROP POLICY IF EXISTS "insert_cash_register_policy" ON public.cash_registers;
DROP POLICY IF EXISTS "Users can open cash register in company branches" ON public.cash_registers;

CREATE POLICY "Users can open cash register" 
ON public.cash_registers
FOR INSERT TO authenticated
WITH CHECK (
    -- O operador deve ser o usuário logado
    operator_id = auth.uid()
    AND
    (
        -- Verifica se a filial pertence ao mesmo dono do usuário (via profile)
        EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.branches b ON b.id = branch_id
            WHERE p.id = auth.uid()
              AND p.owner_id = b.owner_id
        )
        OR
        -- Fallback: O próprio usuário é o dono da filial (caso o admin abra o caixa)
        EXISTS (
             SELECT 1
             FROM public.branches b
             WHERE b.id = branch_id
               AND b.owner_id = auth.uid()
        )
    )
);