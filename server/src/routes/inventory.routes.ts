import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/inventory
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.query.branch_id || req.user!.branchId;

        const { rows } = await pool.query(`
      SELECT i.*, p.name as product_name, p.sku, p.barcode, p.sale_price, p.cost_price,
             p.unit, p.image_url,
             c.name as category_name,
             b.name as branch_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.branch_id = $1 AND p.is_active = true
      ORDER BY p.name ASC
    `, [branchId]);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ error: 'Erro ao carregar estoque' });
    }
});

// PUT /api/inventory/:id - Atualizar quantidade
router.put('/:id', authMiddleware, requireRole('admin', 'manager', 'stock_clerk'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { quantity, min_stock, max_stock, movement_type, notes } = req.body;

        const { rows: current } = await client.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
        if (current.length === 0) { res.status(404).json({ error: 'Registro não encontrado' }); return; }

        const diff = quantity - current[0].quantity;

        await client.query('BEGIN');

        await client.query(
            'UPDATE inventory SET quantity = $1, min_stock = COALESCE($2, min_stock), max_stock = COALESCE($3, max_stock) WHERE id = $4',
            [quantity, min_stock, max_stock, req.params.id]
        );

        if (diff !== 0) {
            await client.query(
                `INSERT INTO inventory_movements (product_id, branch_id, user_id, quantity, movement_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [current[0].product_id, current[0].branch_id, req.user!.userId, diff, movement_type || 'adjustment', notes]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Estoque atualizado' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating inventory:', err);
        res.status(500).json({ error: 'Erro ao atualizar estoque' });
    } finally {
        client.release();
    }
});

// POST /api/inventory/movement - Registrar movimentação
router.post('/movement', authMiddleware, requireRole('admin', 'manager', 'stock_clerk'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { product_id, branch_id, quantity, movement_type, notes } = req.body;
        const targetBranch = branch_id || req.user!.branchId;

        // Determine delta for inventory update
        const delta = movement_type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);

        await client.query('BEGIN');

        // Check current stock if moving out
        if (movement_type === 'out') {
            const { rows: current } = await client.query(
                'SELECT quantity FROM inventory WHERE product_id = $1 AND branch_id = $2',
                [product_id, targetBranch]
            );
            const currentQty = current.length > 0 ? current[0].quantity : 0;
            if (currentQty + delta < 0) {
                throw new Error('Estoque insuficiente');
            }
        }

        // Atualizar estoque
        // Se INSERT (novo registro), assume que começou com 0 e soma o delta. 
        // Se delta negativo em registro novo, vai ficar negativo (permitir ou bloquear? Bloquear acima já resolve se não existir)
        await client.query(
            `INSERT INTO inventory (product_id, branch_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = inventory.quantity + $4`,
            [product_id, targetBranch, delta > 0 ? delta : 0, delta] // Se for novo e out, começa com 0 (ou deveria falhar antes)
        );
        // Note: The param $3 is for INSERT quantity. If it's 'out' and new record, it's weird. 
        // But the check above handles "insufficient stock" (0 < required). 
        // If "in", params $3 is delta. If "out" (absent record), current is 0. 0 < needs. Error thrown.

        // Registrar movimentação (sempre positivo)
        await client.query(
            `INSERT INTO inventory_movements (product_id, branch_id, user_id, quantity, movement_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [product_id, targetBranch, req.user!.userId, Math.abs(quantity), movement_type, notes]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Movimentação registrada' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error creating movement:', err);
        const status = err.message === 'Estoque insuficiente' ? 400 : 500;
        res.status(status).json({ error: err.message || 'Erro ao registrar movimentação' });
    } finally {
        client.release();
    }
});

// GET /api/inventory/movements
router.get('/movements', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { product_id, branch_id, limit = '50', start_date, end_date, movement_type } = req.query;
        const branchId = branch_id || req.user!.branchId;

        let query = `
      SELECT im.*, p.name as product_name, p.sku, u.full_name as user_name,
             c.name as customer_name, b.name as branch_name
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      JOIN users u ON im.user_id = u.id
      JOIN branches b ON im.branch_id = b.id
      LEFT JOIN sales s ON im.reference_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE im.branch_id = $1
    `;
        const params: any[] = [branchId];
        let idx = 2;

        if (product_id && product_id !== 'all') {
            query += ` AND im.product_id = $${idx}`;
            params.push(product_id);
            idx++;
        }

        if (movement_type && movement_type !== 'all') {
            if (movement_type === 'in') {
                query += ` AND im.quantity > 0`;
            } else if (movement_type === 'out') {
                query += ` AND im.quantity < 0`;
            } else {
                query += ` AND im.movement_type = $${idx}`;
                params.push(movement_type);
                idx++;
            }
        }

        if (start_date) {
            query += ` AND im.created_at >= $${idx}`;
            params.push(start_date);
            idx++;
        }

        if (end_date) {
            query += ` AND im.created_at <= $${idx}`;
            params.push(end_date);
            idx++;
        }

        query += ` ORDER BY im.created_at DESC LIMIT $${idx}`;
        params.push(parseInt(limit as string));

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching movements:', err);
        res.status(500).json({ error: 'Erro ao carregar movimentações' });
    }
});

// GET /api/inventory/movements/deleted - Auditoria de movimentações deletadas
router.get('/movements/deleted', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        const { branch_id, limit = '100', start_date, end_date } = req.query;
        const branchId = branch_id || req.user!.branchId;

        let query = `SELECT * FROM deleted_movements_audit WHERE branch_id = $1`;
        const params: any[] = [branchId];
        let idx = 2;

        if (start_date) { query += ` AND deleted_at >= $${idx}`; params.push(start_date); idx++; }
        if (end_date) { query += ` AND deleted_at <= $${idx}`; params.push(end_date); idx++; }

        query += ` ORDER BY deleted_at DESC LIMIT $${idx}`;
        params.push(parseInt(limit as string));

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching deleted movements audit:', err);
        res.status(500).json({ error: 'Erro ao carregar auditoria' });
    }
});

// DELETE /api/inventory/movements/:id - Deletar movimentação com auditoria (admin/manager)
router.delete('/movements/:id', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Buscar movimentação com dados do produto e branch
        const { rows: movements } = await client.query(
            `SELECT im.*, p.name as product_name, p.sku, b.name as branch_name, u.full_name as user_name
             FROM inventory_movements im
             JOIN products p ON im.product_id = p.id
             JOIN branches b ON im.branch_id = b.id
             JOIN users u ON im.user_id = u.id
             WHERE im.id = $1`,
            [id]
        );

        if (movements.length === 0) {
            res.status(404).json({ error: 'Movimentação não encontrada' });
            return;
        }

        const mov = movements[0];

        // Buscar nome do usuário que está deletando
        const { rows: deleter } = await client.query(
            'SELECT full_name FROM users WHERE id = $1',
            [req.user!.userId]
        );

        await client.query('BEGIN');

        // 1. Salvar no audit log
        await client.query(
            `INSERT INTO deleted_movements_audit
             (movement_id, product_id, product_name, product_sku, branch_id, branch_name,
              quantity, movement_type, reference_id, notes, user_id, user_name,
              original_created_at, deleted_by, deleted_by_name, reason)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [
                mov.id, mov.product_id, mov.product_name, mov.sku, mov.branch_id, mov.branch_name,
                mov.quantity, mov.movement_type, mov.reference_id, mov.notes, mov.user_id, mov.user_name,
                mov.created_at, req.user!.userId, deleter[0]?.full_name || req.user!.email, reason || null
            ]
        );

        // 2. Reverter estoque (inverter a movimentação)
        // quantity positivo = entrada (in), negativo = saída (out)
        const reversal = -mov.quantity;
        await client.query(
            `UPDATE inventory SET quantity = GREATEST(0, quantity + $1)
             WHERE product_id = $2 AND branch_id = $3`,
            [reversal, mov.product_id, mov.branch_id]
        );

        // 3. Deletar a movimentação
        await client.query('DELETE FROM inventory_movements WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ message: 'Movimentação deletada com sucesso' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error deleting movement:', err);
        res.status(500).json({ error: err?.message || 'Erro ao deletar movimentação' });
    } finally {
        client.release();
    }
});

export default router;

