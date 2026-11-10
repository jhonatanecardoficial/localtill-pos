import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/categories
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM categories ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Erro ao carregar categorias' });
    }
});

// POST /api/categories
router.post('/', authMiddleware, requireRole('admin', 'manager', 'stock_clerk'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, parent_id } = req.body;
        if (!name) { res.status(400).json({ error: 'Nome é obrigatório' }); return; }

        const { rows } = await pool.query(
            'INSERT INTO categories (name, description, parent_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description, parent_id || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, requireRole('admin', 'manager', 'stock_clerk'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, parent_id } = req.body;
        const { rows } = await pool.query(
            'UPDATE categories SET name = COALESCE($1, name), description = $2, parent_id = $3 WHERE id = $4 RETURNING *',
            [name, description, parent_id, req.params.id]
        );
        if (rows.length === 0) { res.status(404).json({ error: 'Categoria não encontrada' }); return; }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        // Verificar se há produtos vinculados
        const { rows: products } = await pool.query('SELECT COUNT(*) FROM products WHERE category_id = $1', [req.params.id]);
        if (parseInt(products[0].count) > 0) {
            res.status(400).json({ error: 'Categoria possui produtos vinculados' });
            return;
        }
        await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ message: 'Categoria removida' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: 'Erro ao remover categoria' });
    }
});

export default router;
