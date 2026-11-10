import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/customers
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { search, limit = '100' } = req.query;
        let query = 'SELECT * FROM customers';
        const params: any[] = [];

        if (search) {
            query += ' WHERE name ILIKE $1 OR document ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1';
            params.push(`%${search}%`);
        }

        query += ` ORDER BY name ASC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit as string));

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Erro ao carregar clientes' });
    }
});

// GET /api/customers/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
        if (rows.length === 0) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching customer:', err);
        res.status(500).json({ error: 'Erro ao carregar cliente' });
    }
});

// POST /api/customers
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, phone, document, address, city, state, zip_code } = req.body;
        if (!name) { res.status(400).json({ error: 'Nome é obrigatório' }); return; }

        const { rows } = await pool.query(
            `INSERT INTO customers (name, email, phone, document, address, city, state, zip_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, email, phone, document, address, city, state, zip_code]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// PUT /api/customers/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, phone, document, address, city, state, zip_code } = req.body;
        const { rows } = await pool.query(
            `UPDATE customers SET name = COALESCE($1, name), email = $2, phone = $3, document = $4,
       address = $5, city = $6, state = $7, zip_code = $8 WHERE id = $9 RETURNING *`,
            [name, email, phone, document, address, city, state, zip_code, req.params.id]
        );
        if (rows.length === 0) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating customer:', err);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

export default router;
