import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/cash-registers - Buscar caixas (abertos ou por filtro)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { status, branch_id } = req.query;
        const branchId = branch_id || req.user!.branchId;

        let query = `
      SELECT cr.*, u.full_name as operator_name, b.name as branch_name
      FROM cash_registers cr
      LEFT JOIN users u ON cr.operator_id = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      WHERE cr.branch_id = $1
    `;
        const params: any[] = [branchId];

        if (status) {
            query += ' AND cr.status = $2';
            params.push(status);
        }

        query += ' ORDER BY cr.opened_at DESC';

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching cash registers:', err);
        res.status(500).json({ error: 'Erro ao carregar caixas' });
    }
});

// GET /api/cash-registers/:id - Buscar caixa específico
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            res.status(400).json({ error: 'ID de caixa inválido' });
            return;
        }
        const { rows } = await pool.query(
            `SELECT cr.*, u.full_name as operator_name, b.name as branch_name
             FROM cash_registers cr
             LEFT JOIN users u ON cr.operator_id = u.id
             LEFT JOIN branches b ON cr.branch_id = b.id
             WHERE cr.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ error: 'Caixa não encontrado' });
            return;
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching cash register:', err);
        res.status(500).json({ error: 'Erro ao carregar caixa' });
    }
});

// POST /api/cash-registers/open - Abrir caixa
router.post('/open', authMiddleware, requireRole('admin', 'manager', 'operator'), async (req: AuthRequest, res: Response) => {
    try {
        const { shift_id, shift_name, opening_amount = 0 } = req.body;

        // Verificar se operador já tem caixa aberto
        const { rows: openRegisters } = await pool.query(
            "SELECT id FROM cash_registers WHERE operator_id = $1 AND status = 'OPEN'",
            [req.user!.userId]
        );

        if (openRegisters.length > 0) {
            res.status(400).json({ error: 'Você já possui um caixa aberto' });
            return;
        }

        const { rows } = await pool.query(
            `INSERT INTO cash_registers (shift_id, shift_name, operator_id, branch_id, opening_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN')
       RETURNING *`,
            [shift_id, shift_name || 'Turno', req.user!.userId, req.user!.branchId, opening_amount]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error opening cash register:', err);
        res.status(500).json({ error: 'Erro ao abrir caixa' });
    }
});

// PUT /api/cash-registers/:id/close - Fechar caixa
router.put('/:id/close', authMiddleware, requireRole('admin', 'manager', 'operator'), async (req: AuthRequest, res: Response) => {
    try {
        const { closing_amount_counted, notes } = req.body;

        const { rows: current } = await pool.query(
            'SELECT * FROM cash_registers WHERE id = $1',
            [req.params.id]
        );

        if (current.length === 0) {
            res.status(404).json({ error: 'Caixa não encontrado' }); return;
        }

        if (current[0].status !== 'OPEN') {
            res.status(400).json({ error: 'Caixa já está fechado' }); return;
        }

        const expectedAmount = current[0].opening_amount + current[0].total_cash;
        const difference = closing_amount_counted !== undefined
            ? closing_amount_counted - expectedAmount
            : null;

        const { rows } = await pool.query(
            `UPDATE cash_registers SET
        status = 'CLOSED',
        closed_at = NOW(),
        closing_amount_counted = $1,
        difference = $2,
        notes = $3
       WHERE id = $4
       RETURNING *`,
            [closing_amount_counted, difference, notes, req.params.id]
        );

        res.json(rows[0]);
    } catch (err) {
        console.error('Error closing cash register:', err);
        res.status(500).json({ error: 'Erro ao fechar caixa' });
    }
});

// POST /api/cash-registers/movements
router.post('/movements', authMiddleware, requireRole('admin', 'manager', 'operator'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { cash_register_id, movement_type, amount, reason } = req.body;

        if (!cash_register_id || !movement_type || amount === undefined || amount === null) {
            res.status(400).json({ error: 'Campos obrigatórios: cash_register_id, movement_type, amount' });
            return;
        }

        const parsedAmount = parseFloat(String(amount));
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            res.status(400).json({ error: 'Valor deve ser um número positivo' });
            return;
        }

        // Verificar se o caixa existe e está aberto
        const { rows: registerRows } = await client.query(
            "SELECT id, status FROM cash_registers WHERE id = $1",
            [cash_register_id]
        );

        if (registerRows.length === 0) {
            res.status(404).json({ error: 'Caixa não encontrado' });
            return;
        }

        if (registerRows[0].status !== 'OPEN') {
            res.status(400).json({ error: 'Não é possível registrar movimentação em um caixa fechado' });
            return;
        }

        await client.query('BEGIN');

        const { rows } = await client.query(
            `INSERT INTO cash_movements (cash_register_id, movement_type, amount, reason, performed_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [cash_register_id, movement_type, parsedAmount, reason, req.user!.userId]
        );

        const isWithdrawal = movement_type === 'withdrawal' || movement_type === 'sangria';
        const isDeposit = movement_type === 'deposit' || movement_type === 'suprimento' || movement_type === 'addition' || movement_type === 'supply';

        if (isWithdrawal) {
            // Sangria: subtrai do saldo atual e registra em total_withdrawals
            await client.query(
                `UPDATE cash_registers 
                 SET current_change = COALESCE(current_change, 0) - $1,
                     total_withdrawals = COALESCE(total_withdrawals, 0) + $1
                 WHERE id = $2`,
                [parsedAmount, cash_register_id]
            );
        } else if (isDeposit) {
            // Suprimento: soma ao saldo atual e registra em total_additions
            await client.query(
                `UPDATE cash_registers 
                 SET current_change = COALESCE(current_change, 0) + $1,
                     total_additions = COALESCE(total_additions, 0) + $1
                 WHERE id = $2`,
                [parsedAmount, cash_register_id]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(rows[0]);
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error creating cash movement:', err);
        res.status(500).json({ error: err?.message || 'Erro ao processar movimentação' });
    } finally {
        client.release();
    }
});

// GET /api/cash-registers/:id/movements
router.get('/:id/movements', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT cm.*, u.full_name as performed_by_name
       FROM cash_movements cm
       LEFT JOIN users u ON cm.performed_by = u.id
       WHERE cm.cash_register_id = $1
       ORDER BY cm.created_at ASC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching movements:', err);
        res.status(500).json({ error: 'Erro ao carregar movimentações' });
    }
});

export default router;
