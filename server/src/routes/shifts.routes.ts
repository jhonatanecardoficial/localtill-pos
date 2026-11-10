import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/shifts
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM shifts ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching shifts:', err);
        res.status(500).json({ error: 'Erro ao carregar turnos' });
    }
});

// POST /api/shifts
router.post('/', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, description } = req.body;
        if (!name) { res.status(400).json({ error: 'Nome é obrigatório' }); return; }

        const { rows } = await pool.query(
            'INSERT INTO shifts (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating shift:', err);
        res.status(500).json({ error: 'Erro ao criar turno' });
    }
});

// PUT /api/shifts/:id
router.put('/:id', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, is_active } = req.body;
        const { rows } = await pool.query(
            'UPDATE shifts SET name = COALESCE($1, name), description = $2, is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *',
            [name, description, is_active, req.params.id]
        );
        if (rows.length === 0) { res.status(404).json({ error: 'Turno não encontrado' }); return; }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating shift:', err);
        res.status(500).json({ error: 'Erro ao atualizar turno' });
    }
});

// DELETE /api/shifts/:id
router.delete('/:id', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query('DELETE FROM shifts WHERE id = $1 RETURNING id', [req.params.id]);
        if (rows.length === 0) { res.status(404).json({ error: 'Turno não encontrado' }); return; }
        res.json({ message: 'Turno excluído com sucesso' });
    } catch (err) {
        console.error('Error deleting shift:', err);
        res.status(500).json({ error: 'Erro ao excluir turno' });
    }
});

export default router;
