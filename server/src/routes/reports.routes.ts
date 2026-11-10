import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/reports/sales-summary
router.get('/sales-summary', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const branchId = branch_id || req.user!.branchId;

    const { rows } = await pool.query(`
      SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(discount), 0) as total_discounts,
        COALESCE(AVG(total), 0) as avg_ticket,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'debit' THEN total ELSE 0 END), 0) as debit_total,
        COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total ELSE 0 END), 0) as credit_total,
        COALESCE(SUM(CASE WHEN payment_method = 'pix' THEN total ELSE 0 END), 0) as pix_total
      FROM sales
      WHERE branch_id = $1
        AND created_at >= COALESCE($2, '1970-01-01')::timestamptz
        AND created_at <= COALESCE($3, NOW())::timestamptz
    `, [branchId, start_date, end_date]);

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching sales summary:', err);
    res.status(500).json({ error: 'Erro ao carregar resumo de vendas' });
  }
});

// GET /api/reports/top-products
router.get('/top-products', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, branch_id, limit = '10' } = req.query;
    const branchId = branch_id || req.user!.branchId;

    const { rows } = await pool.query(`
      SELECT p.name, p.sku, SUM(si.quantity) as total_quantity, SUM(si.total) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.branch_id = $1
        AND s.created_at >= COALESCE($2, '1970-01-01')::timestamptz
        AND s.created_at <= COALESCE($3, NOW())::timestamptz
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_revenue DESC
      LIMIT $4
    `, [branchId, start_date, end_date, parseInt(limit as string)]);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching top products:', err);
    res.status(500).json({ error: 'Erro ao carregar produtos mais vendidos' });
  }
});

// GET /api/reports/daily-sales
router.get('/daily-sales', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const branchId = branch_id || req.user!.branchId;

    const { rows } = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as sales_count,
        COALESCE(SUM(total), 0) as total_revenue
      FROM sales
      WHERE branch_id = $1
        AND created_at >= COALESCE($2, NOW() - INTERVAL '30 days')::timestamptz
        AND created_at <= COALESCE($3, NOW())::timestamptz
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [branchId, start_date, end_date]);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching daily sales:', err);
    res.status(500).json({ error: 'Erro ao carregar vendas diárias' });
  }
});

// GET /api/reports/operator-performance
router.get('/operator-performance', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const branchId = branch_id || req.user!.branchId;

    const { rows } = await pool.query(`
      SELECT u.id, u.full_name,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.total), 0) as total_revenue,
        COALESCE(AVG(s.total), 0) as avg_ticket
      FROM users u
      LEFT JOIN sales s ON s.cashier_id = u.id
        AND s.branch_id = $1
        AND s.created_at >= COALESCE($2, '1970-01-01')::timestamptz
        AND s.created_at <= COALESCE($3, NOW())::timestamptz
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE ur.role IN ('operator', 'manager', 'admin')
      GROUP BY u.id, u.full_name
      ORDER BY total_revenue DESC
    `, [branchId, start_date, end_date]);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching operator performance:', err);
    res.status(500).json({ error: 'Erro ao carregar performance de operadores' });
  }
});

// GET /api/reports/cash-registers
router.get('/cash-registers', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, operator_id, shift_id, status, branch_id } = req.query;
    const branchId = branch_id || req.user!.branchId;

    let query = `
      SELECT 
        cr.*, 
        u.full_name as operator_name,
        b.name as branch_name,
        s.name as shift_name_real, -- in case shift name changed or just rely on stored name
        (
            SELECT COALESCE(SUM(total), 0)
            FROM sales 
            WHERE cash_register_id = cr.id AND (payment_method::text = 'mb_way' OR (payment_method = 'other' AND notes ILIKE '%mb_way%'))
        ) as total_mb_way,
        (
            SELECT COALESCE(SUM(total), 0)
            FROM sales 
            WHERE cash_register_id = cr.id AND (payment_method::text = 'multibanco' OR (payment_method = 'other' AND notes ILIKE '%multibanco%'))
        ) as total_multibanco,
        (
            SELECT COALESCE(SUM(amount), 0)
            FROM cash_movements
            WHERE cash_register_id = cr.id AND (movement_type = 'addition' OR movement_type = 'deposit' OR movement_type = 'suprimento')
        ) as total_additions,
        (
            SELECT COALESCE(SUM(amount), 0)
            FROM cash_movements
            WHERE cash_register_id = cr.id AND (movement_type = 'withdrawal' OR movement_type = 'sangria')
        ) as total_withdrawals
      FROM cash_registers cr
      LEFT JOIN users u ON cr.operator_id = u.id
      LEFT JOIN branches b ON cr.branch_id = b.id
      LEFT JOIN shifts s ON cr.shift_id = s.id
      WHERE cr.branch_id = $1
    `;
    const params: any[] = [branchId];
    let idx = 2;

    if (start_date) {
      query += ` AND cr.opened_at >= $${idx}`;
      params.push(start_date);
      idx++;
    }

    if (end_date) {
      query += ` AND cr.opened_at <= $${idx}`;
      params.push(end_date);
      idx++;
    }

    if (operator_id && operator_id !== 'all') {
      query += ` AND cr.operator_id = $${idx}`;
      params.push(operator_id);
      idx++;
    }

    if (shift_id && shift_id !== 'all') {
      query += ` AND cr.shift_id = $${idx}`;
      params.push(shift_id);
      idx++;
    }

    if (status && status !== 'all') {
      query += ` AND cr.status = $${idx}`;
      params.push(status);
      idx++;
    }

    query += ' ORDER BY cr.opened_at DESC';

    const { rows } = await pool.query(query, params);

    // Format response to match partial frontend expectations (profiles object)
    const formatted = rows.map(row => ({
      ...row,
      profiles: { full_name: row.operator_name },
      shift_name: row.shift_name || row.shift_name_real // prioritizing stored name
    }));

    res.json(formatted);
  } catch (err: any) {
    console.error('Error fetching cash register reports:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: `Erro ao carregar relatório de caixas: ${err.message}` });
  }
});

// GET /api/reports/low-stock
router.get('/low-stock', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.query.branch_id || req.user!.branchId;

    const { rows } = await pool.query(`
      SELECT i.*, p.name as product_name, p.sku, c.name as category_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE i.branch_id = $1 AND i.quantity <= i.min_stock AND p.is_active = true
      ORDER BY i.quantity ASC
    `, [branchId]);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching low stock:', err);
    res.status(500).json({ error: 'Erro ao carregar estoque baixo' });
  }
});

// GET /api/reports/profitability
router.get('/profitability', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const branchId = branch_id || req.user!.branchId;

    const params: any[] = [branchId];
    let idx = 2;

    let dateFilter = '';
    if (start_date) {
      dateFilter += ` AND s.created_at >= $${idx}`;
      params.push(start_date);
      idx++;
    }
    if (end_date) {
      dateFilter += ` AND s.created_at <= $${idx}`;
      params.push(end_date);
      idx++;
    }

    const { rows } = await pool.query(`
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.cost_price,
        p.sale_price,
        SUM(si.quantity) as total_sold,
        SUM(si.total) as total_revenue,
        SUM(si.quantity * COALESCE(p.cost_price, 0)) as total_cost,
        SUM(si.total) - SUM(si.quantity * COALESCE(p.cost_price, 0)) as profit,
        CASE
          WHEN SUM(si.total) > 0
          THEN ((SUM(si.total) - SUM(si.quantity * COALESCE(p.cost_price, 0))) / SUM(si.total)) * 100
          ELSE 0
        END as profit_margin
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.branch_id = $1 ${dateFilter}
      GROUP BY p.id, p.name, p.sku, p.cost_price, p.sale_price
      ORDER BY profit DESC
    `, params);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching profitability report:', err);
    res.status(500).json({ error: 'Erro ao carregar relatório de lucratividade' });
  }
});

// GET /api/reports/sales-list — Vendas individuais com itens (para deletar)
router.get('/sales-list', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, branch_id, limit = '200' } = req.query;
    const branchId = branch_id || req.user!.branchId;

    const params: any[] = [branchId];
    let idx = 2;
    let dateFilter = '';

    if (start_date) { dateFilter += ` AND s.created_at >= $${idx}`; params.push(start_date); idx++; }
    if (end_date) { dateFilter += ` AND s.created_at <= $${idx}`; params.push(end_date); idx++; }

    params.push(parseInt(limit as string));

    const { rows } = await pool.query(`
      SELECT s.*, u.full_name as cashier_name,
        COALESCE(
          json_agg(json_build_object(
            'id', si.id, 'product_id', si.product_id,
            'quantity', si.quantity, 'unit_price', si.unit_price,
            'discount', si.discount, 'total', si.total,
            'product_name', p.name, 'sku', p.sku
          )) FILTER (WHERE si.id IS NOT NULL), '[]'
        ) as items
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE s.branch_id = $1 ${dateFilter}
      GROUP BY s.id, u.full_name
      ORDER BY s.created_at DESC
      LIMIT $${idx}
    `, params);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching sales list:', err);
    res.status(500).json({ error: 'Erro ao carregar lista de vendas' });
  }
});

// GET /api/reports/deleted-sales — Auditoria de vendas deletadas
router.get('/deleted-sales', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { branch_id, limit = '200', start_date, end_date } = req.query;
    const branchId = branch_id || req.user!.branchId;

    const params: any[] = [branchId];
    let idx = 2;
    let dateFilter = '';

    if (start_date) { dateFilter += ` AND deleted_at >= $${idx}`; params.push(start_date); idx++; }
    if (end_date) { dateFilter += ` AND deleted_at <= $${idx}`; params.push(end_date); idx++; }

    params.push(parseInt(limit as string));

    const { rows } = await pool.query(
      `SELECT * FROM deleted_sales_audit WHERE branch_id = $1 ${dateFilter}
       ORDER BY deleted_at DESC LIMIT $${idx}`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Error fetching deleted sales audit:', err);
    res.status(500).json({ error: 'Erro ao carregar auditoria' });
  }
});

export default router;

