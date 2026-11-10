import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pdv-local-secret-key-change-in-production';
const JWT_EXPIRES_IN = '8h';
const JWT_REFRESH_EXPIRES_IN = '24h';

export interface JwtPayload {
    userId: string;
    email: string;
    fullName: string;
    roles: string[];
    branchId: string | null;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export function generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticação não fornecido' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido ou expirado' });
        return;
    }
}

export function requireRole(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }

        const hasRole = req.user.roles.some(role => roles.includes(role));
        if (!hasRole) {
            res.status(403).json({ error: 'Sem permissão para esta ação' });
            return;
        }

        next();
    };
}
