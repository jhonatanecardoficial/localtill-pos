import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/users - Listar usuários
router.get('/', authMiddleware, requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
    try {
        const { rows: users } = await pool.query(`
      SELECT u.id, u.email, u.full_name, u.phone, u.branch_id, u.is_active, u.created_at,
             b.name as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.created_at ASC
    `);

        // Buscar roles de cada usuário
        for (const user of users) {
            const { rows: roles } = await pool.query(
                'SELECT role FROM user_roles WHERE user_id = $1',
                [user.id]
            );
            user.roles = roles.map((r: any) => r.role);
        }

        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Erro ao carregar usuários' });
    }
});

// POST /api/users - Criar usuário
router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { email, password, fullName, branchId, role = 'operator' } = req.body;

        if (!email || !password || !fullName) {
            res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
            return;
        }

        // Verificar limite de usuários
        const { rows: settingsRows } = await client.query(
            "SELECT value FROM system_settings WHERE key = 'max_users'"
        );
        const maxUsers = parseInt(settingsRows[0]?.value || '50');

        const { rows: countRows } = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(countRows[0].count) >= maxUsers) {
            res.status(403).json({ error: `Limite de ${maxUsers} usuários atingido` });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await client.query('BEGIN');

        const { rows: newUser } = await client.query(
            `INSERT INTO users (email, password_hash, full_name, branch_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, branch_id`,
            [email.trim().toLowerCase(), passwordHash, fullName, branchId || null]
        );

        await client.query(
            'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
            [newUser[0].id, role]
        );

        await client.query('COMMIT');

        res.status(201).json({
            ...newUser[0],
            roles: [role],
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            res.status(409).json({ error: 'Email já cadastrado' });
        } else {
            console.error('Error creating user:', err);
            res.status(500).json({ error: 'Erro ao criar usuário' });
        }
    } finally {
        client.release();
    }
});

// PUT /api/users/:id/roles - Atualizar roles
router.put('/:id/roles', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { roles } = req.body;

        if (!Array.isArray(roles)) {
            res.status(400).json({ error: 'Roles deve ser um array' });
            return;
        }

        // Impedir admin de remover sua própria role admin
        if (id === req.user!.userId) {
            const currentRoles = req.user!.roles;
            if (currentRoles.includes('admin') && !roles.includes('admin')) {
                res.status(400).json({ error: 'Você não pode remover sua própria permissão de administrador' });
                return;
            }
        }

        await client.query('BEGIN');

        await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

        for (const role of roles) {
            await client.query(
                'INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [id, role]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Permissões atualizadas', roles });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating roles:', err);
        res.status(500).json({ error: 'Erro ao atualizar permissões' });
    } finally {
        client.release();
    }
});

// PUT /api/users/:id/password - Alterar senha
router.put('/:id/password', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { newPassword, currentPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
            return;
        }

        // Se é admin mudando própria senha, exigir senha atual
        const { rows: targetUser } = await pool.query(
            'SELECT id, password_hash FROM users WHERE id = $1',
            [id]
        );

        if (targetUser.length === 0) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        // Verificar roles do user alvo
        const { rows: targetRoles } = await pool.query(
            'SELECT role FROM user_roles WHERE user_id = $1',
            [id]
        );
        const isTargetAdmin = targetRoles.some((r: any) => r.role === 'admin');

        if (isTargetAdmin && currentPassword) {
            const valid = await bcrypt.compare(currentPassword, targetUser[0].password_hash);
            if (!valid) {
                res.status(401).json({ error: 'Senha atual incorreta' });
                return;
            }
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

// PUT /api/users/:id/branch - Mudar filial
router.put('/:id/branch', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { branchId } = req.body;

        await pool.query('UPDATE users SET branch_id = $1 WHERE id = $2', [branchId, id]);
        res.json({ message: 'Filial alterada com sucesso' });
    } catch (err) {
        console.error('Error changing branch:', err);
        res.status(500).json({ error: 'Erro ao alterar filial' });
    }
});

export default router;
