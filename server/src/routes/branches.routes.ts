import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/branches
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query(`
      SELECT b.*, u.full_name as manager_name
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      ORDER BY b.code ASC
    `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching branches:', err);
        res.status(500).json({ error: 'Erro ao carregar filiais' });
    }
});

// POST /api/branches
router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        // Verificar limite
        const { rows: settings } = await pool.query("SELECT value FROM system_settings WHERE key = 'max_branches'");
        const maxBranches = parseInt(settings[0]?.value || '10');
        const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM branches');
        if (parseInt(countRows[0].count) >= maxBranches) {
            res.status(403).json({ error: `Limite de ${maxBranches} filiais atingido` });
            return;
        }

        const { name, code, address, phone, manager_id } = req.body;
        if (!name || !code) { res.status(400).json({ error: 'Nome e código são obrigatórios' }); return; }

        const { rows } = await pool.query(
            'INSERT INTO branches (name, code, address, phone, manager_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, code, address, phone, manager_id || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating branch:', err);
        res.status(500).json({ error: 'Erro ao criar filial' });
    }
});

// PUT /api/branches/:id
router.put('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, code, address, phone, manager_id, is_active } = req.body;
        const { rows } = await pool.query(
            `UPDATE branches SET name = COALESCE($1, name), code = COALESCE($2, code), address = $3,
       phone = $4, manager_id = $5, is_active = COALESCE($6, is_active)
       WHERE id = $7 RETURNING *`,
            [name, code, address, phone, manager_id, is_active, req.params.id]
        );
        if (rows.length === 0) { res.status(404).json({ error: 'Filial não encontrada' }); return; }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating branch:', err);
        res.status(500).json({ error: 'Erro ao atualizar filial' });
    }
});

export default router;
