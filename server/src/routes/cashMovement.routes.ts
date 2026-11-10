import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/cash-movements - Listar histórico de movimentações de troco
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { cash_register_id, limit = '100' } = req.query;
        const isAdmin = req.user!.roles?.includes('admin') || req.user!.roles?.includes('owner');

        let query = `
            SELECT cm.*, 
                   u.full_name as performed_by_name,
                   cr.shift_name,
                   op.full_name as operator_name,
                   b.name as branch_name
            FROM cash_movements cm
            LEFT JOIN users u ON cm.performed_by = u.id
            LEFT JOIN cash_registers cr ON cm.cash_register_id = cr.id
            LEFT JOIN users op ON cr.operator_id = op.id
            LEFT JOIN branches b ON cr.branch_id = b.id
        `;
        const params: any[] = [];
        if (cash_register_id) {
            query += ` WHERE cm.cash_register_id = $1`;
            params.push(cash_register_id);
        } else if (req.user!.branchId && !isAdmin) {
            query += ` WHERE cr.branch_id = $1`;
            params.push(req.user!.branchId);
        }
        query += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit as string) || 100);

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching cash movements:', err);
        res.status(500).json({ error: 'Erro ao buscar movimentações de troco' });
    }
});

// POST /api/cash-movements
router.post('/', authMiddleware, requireRole('admin', 'manager', 'operator'), async (req: AuthRequest, res: Response) => {
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

export default router;
