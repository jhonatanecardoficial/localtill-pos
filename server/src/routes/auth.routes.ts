import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { generateToken, generateRefreshToken, authMiddleware, AuthRequest, verifyToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios' });
            return;
        }

        // Buscar usuário
        const { rows: users } = await pool.query(
            'SELECT id, email, password_hash, full_name, branch_id, is_active FROM users WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const user = users[0];

        if (!user.is_active) {
            res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });
            return;
        }

        // Verificar senha
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        // Buscar roles
        const { rows: roles } = await pool.query(
            'SELECT role FROM user_roles WHERE user_id = $1',
            [user.id]
        );

        const payload = {
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
            roles: roles.map((r: any) => r.role),
            branchId: user.branch_id,
        };

        const token = generateToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                branch_id: user.branch_id,
                roles: payload.roles,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Erro interno ao fazer login' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: 'Refresh token obrigatório' });
            return;
        }

        const decoded = verifyToken(refreshToken);

        // Re-fetch roles (may have changed)
        const { rows: roles } = await pool.query(
            'SELECT role FROM user_roles WHERE user_id = $1',
            [decoded.userId]
        );

        const payload = {
            ...decoded,
            roles: roles.map((r: any) => r.role),
        };

        const newToken = generateToken(payload);
        res.json({ token: newToken });
    } catch (err) {
        res.status(401).json({ error: 'Refresh token inválido' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, email, full_name, phone, branch_id, is_active FROM users WHERE id = $1',
            [req.user!.userId]
        );

        if (rows.length === 0) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        const { rows: roles } = await pool.query(
            'SELECT role FROM user_roles WHERE user_id = $1',
            [req.user!.userId]
        );

        // Buscar nome da filial
        let branchName = null;
        if (rows[0].branch_id) {
            const { rows: branch } = await pool.query(
                'SELECT name FROM branches WHERE id = $1',
                [rows[0].branch_id]
            );
            if (branch.length > 0) branchName = branch[0].name;
        }

        res.json({
            ...rows[0],
            roles: roles.map((r: any) => r.role),
            branch_name: branchName,
        });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
});

// POST /api/auth/verify-admin
router.post('/verify-admin', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios' });
            return;
        }

        const { rows: users } = await pool.query(
            'SELECT id, password_hash, is_active FROM users WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        if (users.length === 0 || !users[0].is_active) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const { rows: roles } = await pool.query(
            'SELECT role FROM user_roles WHERE user_id = $1 AND role = $2',
            [user.id, 'admin']
        );

        if (roles.length === 0) {
            res.status(403).json({ error: 'Usuário não é administrador' });
            return;
        }

        res.json({ success: true, message: 'Autenticado com sucesso' });
    } catch (err) {
        console.error('Error verifying admin:', err);
        res.status(500).json({ error: 'Erro ao verificar credenciais' });
    }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (_req: AuthRequest, res: Response) => {
    // JWT é stateless, logout é feito no cliente removendo o token
    res.json({ message: 'Logout realizado com sucesso' });
});

export default router;
