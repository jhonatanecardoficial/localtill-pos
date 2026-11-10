import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// =====================================================
// SYSTEM SETTINGS (limites, backup, etc.)
// =====================================================

// GET /api/settings/system
router.get('/system', authMiddleware, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM system_settings ORDER BY key ASC');
        // Converter array para objeto { key: value }
        const settings: Record<string, string> = {};
        rows.forEach((r: any) => { settings[r.key] = r.value; });
        res.json(settings);
    } catch (err) {
        console.error('Error fetching system settings:', err);
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
});

// PUT /api/settings/system
router.put('/system', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const settings = req.body; // { key: value, ... }

        await client.query('BEGIN');
        for (const [key, value] of Object.entries(settings)) {
            await client.query(
                `INSERT INTO system_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                [key, String(value)]
            );
        }
        await client.query('COMMIT');
        res.json({ message: 'Configurações atualizadas' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating system settings:', err);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    } finally {
        client.release();
    }
});

// =====================================================
// LOYALTY SETTINGS
// =====================================================

// GET /api/settings/loyalty
router.get('/loyalty', authMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM loyalty_settings LIMIT 1');
        res.json(rows[0] || null);
    } catch (err) {
        console.error('Error fetching loyalty settings:', err);
        res.status(500).json({ error: 'Erro ao carregar configurações de fidelidade' });
    }
});

// PUT /api/settings/loyalty
router.put('/loyalty', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { points_per_real, reais_per_point, points_expiry_months, is_active } = req.body;

        const { rows: existing } = await pool.query('SELECT id FROM loyalty_settings LIMIT 1');

        let result;
        if (existing.length > 0) {
            result = await pool.query(
                `UPDATE loyalty_settings SET points_per_real = $1, reais_per_point = $2,
         points_expiry_months = $3, is_active = $4 WHERE id = $5 RETURNING *`,
                [points_per_real, reais_per_point, points_expiry_months, is_active, existing[0].id]
            );
        } else {
            result = await pool.query(
                `INSERT INTO loyalty_settings (points_per_real, reais_per_point, points_expiry_months, is_active)
         VALUES ($1, $2, $3, $4) RETURNING *`,
                [points_per_real, reais_per_point, points_expiry_months, is_active]
            );
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating loyalty settings:', err);
        res.status(500).json({ error: 'Erro ao atualizar configurações de fidelidade' });
    }
});

// =====================================================
// DISCOUNT RULES
// =====================================================

// GET /api/settings/discounts
router.get('/discounts', authMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM discount_rules ORDER BY threshold ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching discount rules:', err);
        res.status(500).json({ error: 'Erro ao carregar regras de desconto' });
    }
});

// POST /api/settings/discounts
router.post('/discounts', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { rule_type, threshold, discount_percentage, is_active } = req.body;
        const { rows } = await pool.query(
            'INSERT INTO discount_rules (rule_type, threshold, discount_percentage, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
            [rule_type, threshold, discount_percentage, is_active !== false]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating discount rule:', err);
        res.status(500).json({ error: 'Erro ao criar regra de desconto' });
    }
});

// PUT /api/settings/discounts/:id
router.put('/discounts/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { rule_type, threshold, discount_percentage, is_active } = req.body;
        const { rows } = await pool.query(
            `UPDATE discount_rules SET rule_type = COALESCE($1, rule_type), threshold = COALESCE($2, threshold),
       discount_percentage = COALESCE($3, discount_percentage), is_active = COALESCE($4, is_active)
       WHERE id = $5 RETURNING *`,
            [rule_type, threshold, discount_percentage, is_active, req.params.id]
        );
        if (rows.length === 0) { res.status(404).json({ error: 'Regra não encontrada' }); return; }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating discount rule:', err);
        res.status(500).json({ error: 'Erro ao atualizar regra de desconto' });
    }
});

// DELETE /api/settings/discounts/:id
router.delete('/discounts/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        await pool.query('DELETE FROM discount_rules WHERE id = $1', [req.params.id]);
        res.json({ message: 'Regra removida' });
    } catch (err) {
        console.error('Error deleting discount rule:', err);
        res.status(500).json({ error: 'Erro ao remover regra de desconto' });
    }
});

// =====================================================
// SALES TARGETS
// =====================================================

// GET /api/settings/targets
router.get('/targets', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        let query = `
      SELECT st.*, u.full_name as user_name
      FROM sales_targets st
      LEFT JOIN users u ON st.user_id = u.id
    `;
        const params: any[] = [];
        const conditions: string[] = [];

        if (month) { conditions.push(`st.month = $${params.length + 1}`); params.push(month); }
        if (year) { conditions.push(`st.year = $${params.length + 1}`); params.push(year); }

        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY st.year DESC, st.month DESC';

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching targets:', err);
        res.status(500).json({ error: 'Erro ao carregar metas' });
    }
});

// POST /api/settings/targets
router.post('/targets', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        const { user_id, month, year, target_amount } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO sales_targets (user_id, month, year, target_amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [user_id, month, year, target_amount]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating target:', err);
        res.status(500).json({ error: 'Erro ao criar meta' });
    }
});

// DELETE /api/settings/targets/:id
router.delete('/targets/:id', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        await pool.query('DELETE FROM sales_targets WHERE id = $1', [req.params.id]);
        res.json({ message: 'Meta removida' });
    } catch (err) {
        console.error('Error deleting target:', err);
        res.status(500).json({ error: 'Erro ao remover meta' });
    }
});

// =====================================================
// ORGANIZATION SETTINGS
// =====================================================

// GET /api/settings/organization
router.get('/organization', authMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM organization_settings LIMIT 1');
        res.json(rows[0] || null);
    } catch (err) {
        console.error('Error fetching org settings:', err);
        res.status(500).json({ error: 'Erro ao carregar configurações da organização' });
    }
});

// PUT /api/settings/organization
router.put('/organization', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { currency, locale, timezone, company_name } = req.body;
        const { rows: existing } = await pool.query('SELECT id FROM organization_settings LIMIT 1');

        let result;
        if (existing.length > 0) {
            result = await pool.query(
                `UPDATE organization_settings SET currency = COALESCE($1, currency), locale = COALESCE($2, locale),
         timezone = COALESCE($3, timezone), company_name = $4 WHERE id = $5 RETURNING *`,
                [currency, locale, timezone, company_name, existing[0].id]
            );
        } else {
            result = await pool.query(
                'INSERT INTO organization_settings (currency, locale, timezone, company_name) VALUES ($1, $2, $3, $4) RETURNING *',
                [currency || 'BRL', locale || 'pt-BR', timezone || 'America/Sao_Paulo', company_name]
            );
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating org settings:', err);
        res.status(500).json({ error: 'Erro ao atualizar configurações da organização' });
    }
});

// =====================================================
// USER ACTIVE BRANCH
// =====================================================

// GET /api/settings/active-branch
router.get('/active-branch', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query(
            'SELECT uab.*, b.name as branch_name FROM user_active_branch uab JOIN branches b ON uab.branch_id = b.id WHERE uab.user_id = $1 LIMIT 1',
            [req.user!.userId]
        );
        res.json(rows[0] || null);
    } catch (err) {
        console.error('Error fetching active branch:', err);
        res.status(500).json({ error: 'Erro ao carregar filial ativa' });
    }
});

// PUT /api/settings/active-branch
router.put('/active-branch', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { branch_id } = req.body;
        const { rows: existing } = await pool.query(
            'SELECT id FROM user_active_branch WHERE user_id = $1', [req.user!.userId]
        );

        if (existing.length > 0) {
            await pool.query(
                'UPDATE user_active_branch SET branch_id = $1 WHERE user_id = $2',
                [branch_id, req.user!.userId]
            );
        } else {
            await pool.query(
                'INSERT INTO user_active_branch (user_id, branch_id) VALUES ($1, $2)',
                [req.user!.userId, branch_id]
            );
        }

        res.json({ message: 'Filial ativa atualizada' });
    } catch (err) {
        console.error('Error updating active branch:', err);
        res.status(500).json({ error: 'Erro ao atualizar filial ativa' });
    }
});

export default router;
