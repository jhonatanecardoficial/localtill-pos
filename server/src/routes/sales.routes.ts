import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/sales
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { branch_id, start_date, end_date, cashier_id, limit = '100', transaction_type } = req.query;
        const branchId = branch_id || req.user!.branchId;

        let query = `
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.branch_id = $1
    `;
        const params: any[] = [branchId];
        let idx = 2;

        if (start_date) {
            query += ` AND s.created_at >= $${idx}`;
            params.push(start_date);
            idx++;
        }
        if (end_date) {
            query += ` AND s.created_at <= $${idx}`;
            params.push(end_date);
            idx++;
        }
        if (cashier_id) {
            query += ` AND s.cashier_id = $${idx}`;
            params.push(cashier_id);
            idx++;
        }

        if (transaction_type) {
            query += ` AND s.transaction_type = $${idx}`;
            params.push(transaction_type);
            idx++;
        }

        query += ` ORDER BY s.created_at DESC LIMIT $${idx}`;
        params.push(parseInt(limit as string));

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching sales:', err);
        res.status(500).json({ error: 'Erro ao carregar vendas' });
    }
});

// GET /api/sales/targets - Metas de vendas por mês/ano
router.get('/targets', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const params: any[] = [];
        let query = 'SELECT * FROM sales_targets WHERE 1=1';
        let idx = 1;

        if (month) {
            query += ` AND month = $${idx}`;
            params.push(parseInt(month as string));
            idx++;
        }
        if (year) {
            query += ` AND year = $${idx}`;
            params.push(parseInt(year as string));
            idx++;
        }

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching sales targets:', err);
        res.status(500).json({ error: 'Erro ao carregar metas de vendas' });
    }
});

// GET /api/sales/:id - Venda com itens
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { rows: sales } = await pool.query(
            `SELECT s.*, u.full_name as cashier_name
       FROM sales s LEFT JOIN users u ON s.cashier_id = u.id
       WHERE s.id = $1`,
            [req.params.id]
        );

        if (sales.length === 0) {
            res.status(404).json({ error: 'Venda não encontrada' });
            return;
        }

        const { rows: items } = await pool.query(
            `SELECT si.*, p.name as product_name, p.sku
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
            [req.params.id]
        );

        res.json({ ...sales[0], items });
    } catch (err) {
        console.error('Error fetching sale:', err);
        res.status(500).json({ error: 'Erro ao carregar venda' });
    }
});

// POST /api/sales - Registrar venda
router.post('/', authMiddleware, requireRole('admin', 'manager', 'operator'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            sale_number, customer_id, customer_name, customer_document,
            cash_register_id, payment_method, transaction_type,
            subtotal, discount, tax, total, notes, items,
            client_id, // ID temporário do cliente offline
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Itens da venda são obrigatórios' });
            return;
        }

        await client.query('BEGIN');

        // Gerar número da venda se não fornecido
        let saleNumber = sale_number;
        if (!saleNumber) {
            const { rows: countRows } = await client.query('SELECT COUNT(*) FROM sales');
            saleNumber = `V${String(parseInt(countRows[0].count) + 1).padStart(6, '0')}`;
        }

        // Sanitize payment method for DB ENUM
        let dbPaymentMethod = payment_method;
        if (payment_method === 'mb_way' || payment_method === 'multibanco') {
            dbPaymentMethod = 'other';
        }

        // Inserir venda
        const { rows: saleRows } = await client.query(
            `INSERT INTO sales (sale_number, branch_id, cashier_id, customer_id, customer_name, customer_document,
        cash_register_id, payment_method, transaction_type, subtotal, discount, tax, total, notes, client_id, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
       RETURNING *`,
            [saleNumber, req.user!.branchId, req.user!.userId, customer_id, customer_name, customer_document,
                cash_register_id, dbPaymentMethod, transaction_type || 'sale', subtotal || 0, discount || 0,
                tax || 0, total, notes, client_id]
        );

        const saleId = saleRows[0].id;

        // Inserir itens e atualizar estoque
        for (const item of items) {
            await client.query(
                `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [saleId, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.total]
            );

            // Reduzir estoque
            await client.query(
                `UPDATE inventory SET quantity = quantity - $1
         WHERE product_id = $2 AND branch_id = $3`,
                [item.quantity, item.product_id, req.user!.branchId]
            );

            // Registrar movimentação de estoque
            await client.query(
                `INSERT INTO inventory_movements (product_id, branch_id, user_id, quantity, movement_type, reference_id, notes)
         VALUES ($1, $2, $3, $4, 'sale', $5, $6)`,
                [item.product_id, req.user!.branchId, req.user!.userId, -item.quantity, saleId, `Venda ${saleNumber} - ${payment_method}`]
            );
        }

        // Atualizar totais do caixa
        if (cash_register_id) {
            const paymentMap: Record<string, string> = {
                cash: 'total_cash',
                debit: 'total_debit',
                credit: 'total_credit',
                pix: 'total_pix',
                check: 'total_other', // Assuming check goes to other or check column exists? schema says total_other
                other: 'total_other',
            };
            const paymentField = paymentMap[payment_method] || 'total_other';

            await client.query(
                `UPDATE cash_registers SET
          total_sales = total_sales + $1,
          ${paymentField} = ${paymentField} + $1
         WHERE id = $2`,
                [total, cash_register_id]
            );

            // Atualizar troco se pagamento em dinheiro
            if (payment_method === 'cash') {
                await client.query(
                    `UPDATE cash_registers SET current_change = current_change + $1 WHERE id = $2`,
                    [total, cash_register_id]
                );
            }
        }

        // Atualizar pontos de fidelidade se houver cliente
        if (customer_id) {
            const { rows: loyalty } = await client.query(
                'SELECT * FROM loyalty_settings WHERE is_active = true LIMIT 1'
            );

            if (loyalty.length > 0) {
                const points = Math.floor(total * loyalty[0].points_per_real);
                if (points > 0) {
                    await client.query(
                        'UPDATE customers SET loyalty_points = loyalty_points + $1, total_purchases = total_purchases + $2 WHERE id = $3',
                        [points, total, customer_id]
                    );
                }
            }
        }

        await client.query('COMMIT');

        // Retornar venda completa
        const { rows: completeSale } = await pool.query(
            `SELECT s.*, u.full_name as cashier_name
       FROM sales s LEFT JOIN users u ON s.cashier_id = u.id
       WHERE s.id = $1`,
            [saleId]
        );

        res.status(201).json(completeSale[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating sale:', err);
        res.status(500).json({ error: 'Erro ao registrar venda' });
    } finally {
        client.release();
    }
});

// DELETE /api/sales/:id — Deletar venda com auditoria (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Buscar venda e seus itens
        const { rows: sales } = await client.query(
            `SELECT s.*, u.full_name as cashier_name
             FROM sales s LEFT JOIN users u ON s.cashier_id = u.id
             WHERE s.id = $1`,
            [id]
        );

        if (sales.length === 0) {
            res.status(404).json({ error: 'Venda não encontrada' });
            return;
        }

        const sale = sales[0];

        const { rows: items } = await client.query(
            `SELECT si.*, p.name as product_name, p.sku
             FROM sale_items si LEFT JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = $1`,
            [id]
        );

        // Buscar nome do usuário que está deletando
        const { rows: deleter } = await client.query(
            'SELECT full_name FROM users WHERE id = $1',
            [req.user!.userId]
        );

        await client.query('BEGIN');

        // 1. Salvar snapshot de auditoria
        await client.query(
            `INSERT INTO deleted_sales_audit 
             (sale_id, sale_number, branch_id, total, subtotal, discount, payment_method,
              cashier_id, cashier_name, customer_name, customer_document, cash_register_id,
              sale_items, deleted_by, deleted_by_name, reason, original_created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17)`,
            [
                sale.id, sale.sale_number, sale.branch_id, sale.total, sale.subtotal,
                sale.discount, sale.payment_method, sale.cashier_id, sale.cashier_name,
                sale.customer_name, sale.customer_document, sale.cash_register_id,
                JSON.stringify(items),
                req.user!.userId, deleter[0]?.full_name || req.user!.email,
                reason || null, sale.created_at
            ]
        );

        // 2. Reverter estoque (devolver os itens)
        for (const item of items) {
            await client.query(
                `UPDATE inventory SET quantity = quantity + $1
                 WHERE product_id = $2 AND branch_id = $3`,
                [item.quantity, item.product_id, sale.branch_id]
            );

            // Registrar movimentação de reversão
            await client.query(
                `INSERT INTO inventory_movements (product_id, branch_id, user_id, quantity, movement_type, reference_id, notes)
                 VALUES ($1, $2, $3, $4, 'return', $5, $6)`,
                [item.product_id, sale.branch_id, req.user!.userId, item.quantity, sale.id,
                    `Estorno - Venda ${sale.sale_number} deletada`]
            );
        }

        // 3. Subtrair dos totais do caixa
        if (sale.cash_register_id) {
            const paymentMap: Record<string, string> = {
                cash: 'total_cash', debit: 'total_debit', credit: 'total_credit',
                pix: 'total_pix', check: 'total_other', other: 'total_other',
            };
            const paymentField = paymentMap[sale.payment_method] || 'total_other';

            await client.query(
                `UPDATE cash_registers SET
                 total_sales = GREATEST(0, total_sales - $1),
                 ${paymentField} = GREATEST(0, ${paymentField} - $1)
                 WHERE id = $2`,
                [sale.total, sale.cash_register_id]
            );

            if (sale.payment_method === 'cash') {
                await client.query(
                    `UPDATE cash_registers SET current_change = GREATEST(0, current_change - $1) WHERE id = $2`,
                    [sale.total, sale.cash_register_id]
                );
            }
        }

        // 4. Remover a venda (sale_items são removidos em cascade)
        await client.query('DELETE FROM sales WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ message: 'Venda deletada com sucesso', audit_id: id });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error deleting sale:', err);
        res.status(500).json({ error: err?.message || 'Erro ao deletar venda' });
    } finally {
        client.release();
    }
});

export default router;

