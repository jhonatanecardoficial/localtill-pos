import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/products - Listar produtos
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { category_id, search, active_only } = req.query;

        let query = `
      SELECT p.*, c.name as category_name,
             COALESCE(i.quantity, 0) as stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = $1
    `;
        const params: any[] = [req.user!.branchId];
        let paramIndex = 2;

        const conditions: string[] = [];

        if (active_only === 'true') {
            conditions.push('p.is_active = true');
        }

        if (category_id) {
            conditions.push(`p.category_id = $${paramIndex}`);
            params.push(category_id);
            paramIndex++;
        }

        if (search) {
            conditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY p.name ASC';

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Erro ao carregar produtos' });
    }
});

// GET /api/products/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query(
            `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
            [req.params.id]
        );

        if (rows.length === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Erro ao carregar produto' });
    }
});

// POST /api/products
router.post('/', authMiddleware, requireRole('admin', 'manager', 'stock_clerk'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { name, description, sku, barcode, category_id, unit, cost_price, sale_price, tax_rate, image_url, initial_stock } = req.body;

        if (!name || !sku || sale_price === undefined) {
            res.status(400).json({ error: 'Nome, SKU e preço de venda são obrigatórios' });
            return;
        }

        await client.query('BEGIN');

        const { rows } = await client.query(
            `INSERT INTO products (name, description, sku, barcode, category_id, unit, cost_price, sale_price, tax_rate, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
            [name, description, sku, barcode, category_id || null, unit || 'un', cost_price || 0, sale_price, tax_rate || 0, image_url]
        );

        // Criar estoque inicial se houver branch
        if (req.user!.branchId) {
            await client.query(
                `INSERT INTO inventory (product_id, branch_id, quantity)
         VALUES ($1, $2, $3)`,
                [rows[0].id, req.user!.branchId, initial_stock || 0]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(rows[0]);
    } catch (err: any) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            res.status(409).json({ error: 'SKU já cadastrado' });
        } else {
            console.error('Error creating product:', err);
            res.status(500).json({ error: 'Erro ao criar produto' });
        }
    } finally {
        client.release();
    }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, requireRole('admin', 'manager', 'stock_clerk'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, sku, barcode, category_id, unit, cost_price, sale_price, tax_rate, image_url, is_active } = req.body;

        // Registrar alteração de preço
        if (sale_price !== undefined) {
            const { rows: current } = await pool.query('SELECT sale_price FROM products WHERE id = $1', [id]);
            if (current.length > 0 && current[0].sale_price !== sale_price) {
                await pool.query(
                    'INSERT INTO price_history (product_id, old_price, new_price, changed_by) VALUES ($1, $2, $3, $4)',
                    [id, current[0].sale_price, sale_price, req.user!.userId]
                );
            }
        }

        const { rows } = await pool.query(
            `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        sku = COALESCE($3, sku),
        barcode = COALESCE($4, barcode),
        category_id = $5,
        unit = COALESCE($6, unit),
        cost_price = COALESCE($7, cost_price),
        sale_price = COALESCE($8, sale_price),
        tax_rate = COALESCE($9, tax_rate),
        image_url = $10,
        is_active = COALESCE($11, is_active)
       WHERE id = $12
       RETURNING *`,
            [name, description, sku, barcode, category_id, unit, cost_price, sale_price, tax_rate, image_url, is_active, id]
        );

        if (rows.length === 0) {
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        await pool.query('UPDATE products SET is_active = false WHERE id = $1', [req.params.id]);
        res.json({ message: 'Produto desativado' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Erro ao desativar produto' });
    }
});

// POST /api/products/bulk-import-images - Import images from 'imagens' folder matching by SKU
router.post('/bulk-import-images', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        const imagensDir = path.join(process.cwd(), 'imagens');
        const uploadsDir = path.join(process.cwd(), 'uploads');

        // Verify source folder exists
        if (!fs.existsSync(imagensDir)) {
            res.status(404).json({
                error: 'Pasta "imagens" não encontrada',
                detail: `Esperado em: ${imagensDir}. Crie a pasta e coloque as imagens com o nome do SKU (ex: SKU001.jpg).`
            });
            return;
        }

        // Ensure uploads folder exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
        const files = fs.readdirSync(imagensDir).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return allowedExtensions.includes(ext);
        });

        if (files.length === 0) {
            res.status(400).json({
                error: 'Nenhuma imagem encontrada na pasta "imagens"',
                detail: 'Coloque imagens (.jpg, .png, .webp) com o nome do SKU do produto.'
            });
            return;
        }

        // Fetch all products for SKU matching
        const { rows: products } = await pool.query('SELECT id, sku FROM products WHERE is_active = true');
        const skuMap = new Map<string, string>();
        products.forEach((p: any) => {
            skuMap.set(p.sku.toLowerCase().trim(), p.id);
        });

        const results = {
            total: files.length,
            matched: 0,
            notMatched: [] as string[],
            updated: [] as string[],
            errors: [] as string[],
        };

        for (const filename of files) {
            const ext = path.extname(filename);
            const skuFromFile = path.basename(filename, ext).trim();
            const productId = skuMap.get(skuFromFile.toLowerCase());

            if (!productId) {
                results.notMatched.push(skuFromFile);
                continue;
            }

            try {
                // Copy image to uploads with UUID name
                const newFilename = `${uuidv4()}${ext.toLowerCase()}`;
                const sourcePath = path.join(imagensDir, filename);
                const destPath = path.join(uploadsDir, newFilename);
                fs.copyFileSync(sourcePath, destPath);

                // Update product image_url
                const imageUrl = `/uploads/${newFilename}`;
                await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [imageUrl, productId]);

                results.matched++;
                results.updated.push(skuFromFile);
            } catch (err: any) {
                results.errors.push(`${skuFromFile}: ${err.message}`);
            }
        }

        res.json({
            message: `Importação concluída: ${results.matched}/${results.total} imagens vinculadas.`,
            ...results,
        });
    } catch (err) {
        console.error('Error bulk importing images:', err);
        res.status(500).json({ error: 'Erro ao importar imagens em massa' });
    }
});

export default router;
