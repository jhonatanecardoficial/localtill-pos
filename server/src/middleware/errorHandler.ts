import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
    console.error('❌ Erro:', err);

    if (err.code === '23505') {
        // Unique constraint violation
        res.status(409).json({ error: 'Registro já existe (duplicado)' });
        return;
    }

    if (err.code === '23503') {
        // Foreign key violation
        res.status(400).json({ error: 'Referência inválida - registro relacionado não encontrado' });
        return;
    }

    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
    });
}
