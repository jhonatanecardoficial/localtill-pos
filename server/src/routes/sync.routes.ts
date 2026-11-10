import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/sync/sales - Receber vendas offline em batch
router.post('/sales', authMiddleware, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { sales } = req.body;

        if (!Array.isArray(sales) || sales.length === 0) {
            res.status(400).json({ error: 'Array de vendas obrigatório' });
            return;
        }

        const results: { client_id: string; server_id: string; status: string }[] = [];

        await client.query('BEGIN');

        for (const sale of sales) {
            // Verificar duplicação por client_id
            if (sale.client_id) {
                const { rows: existing } = await client.query(
                    'SELECT id FROM sales WHERE client_id = $1',
                    [sale.client_id]
                );

                if (existing.length > 0) {
                    results.push({ client_id: sale.client_id, server_id: existing[0].id, status: 'duplicate' });
                    continue;
                }
            }

            // Gerar número da venda
            const { rows: countRows } = await client.query('SELECT COUNT(*) FROM sales');
            const saleNumber = `V${String(parseInt(countRows[0].count) + 1).padStart(6, '0')}`;

            // Inserir venda
            const { rows: saleRows } = await client.query(
                `INSERT INTO sales (sale_number, branch_id, cashier_id, customer_id, customer_name, customer_document,
          cash_register_id, payment_method, transaction_type, subtotal, discount, tax, total, notes, client_id, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
         RETURNING id`,
                [saleNumber, sale.branch_id || req.user!.branchId, sale.cashier_id || req.user!.userId,
                    sale.customer_id, sale.customer_name, sale.customer_document,
                    sale.cash_register_id, sale.payment_method, sale.transaction_type || 'sale',
                    sale.subtotal || 0, sale.discount || 0, sale.tax || 0, sale.total, sale.notes, sale.client_id]
            );

            const saleId = saleRows[0].id;

            // Inserir itens
            if (Array.isArray(sale.items)) {
                for (const item of sale.items) {
                    await client.query(
                        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total)
             VALUES ($1, $2, $3, $4, $5, $6)`,
                        [saleId, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.total]
                    );

                    // Atualizar estoque
                    await client.query(
                        'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2 AND branch_id = $3',
                        [item.quantity, item.product_id, sale.branch_id || req.user!.branchId]
                    );
                }
            }

            results.push({ client_id: sale.client_id, server_id: saleId, status: 'synced' });
        }

        await client.query('COMMIT');
        res.json({ synced: results.filter(r => r.status === 'synced').length, duplicates: results.filter(r => r.status === 'duplicate').length, results });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error syncing sales:', err);
        res.status(500).json({ error: 'Erro ao sincronizar vendas' });
    } finally {
        client.release();
    }
});

// GET /api/sync/data - Buscar dados atualizados para cache do cliente
router.get('/data', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { since } = req.query; // ISO timestamp
        const branchId = req.user!.branchId;

        const sinceDate = since ? new Date(since as string) : new Date(0);

        // Buscar dados modificados desde o último sync
        const [products, categories, customers, settings] = await Promise.all([
            pool.query(
                `SELECT p.*, c.name as category_name, COALESCE(i.quantity, 0) as stock
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = $1
         WHERE p.updated_at > $2 OR p.created_at > $2`,
                [branchId, sinceDate]
            ),
            pool.query('SELECT * FROM categories WHERE updated_at > $1 OR created_at > $1', [sinceDate]),
            pool.query('SELECT * FROM customers WHERE updated_at > $1 OR created_at > $1', [sinceDate]),
            pool.query('SELECT * FROM loyalty_settings WHERE is_active = true LIMIT 1'),
        ]);

        const { rows: discounts } = await pool.query('SELECT * FROM discount_rules WHERE is_active = true');

        res.json({
            products: products.rows,
            categories: categories.rows,
            customers: customers.rows,
            loyaltySettings: settings.rows[0] || null,
            discountRules: discounts,
            syncedAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Error fetching sync data:', err);
        res.status(500).json({ error: 'Erro ao buscar dados de sincronização' });
    }
});

export default router;
