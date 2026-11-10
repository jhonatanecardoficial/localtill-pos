import { Router, Response, Request } from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import multer from 'multer';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { performBackup, getBackupConfig } from '../config/backup';
import pool from '../config/database';

const router = Router();

const BACKUP_DIR = process.env.BACKUP_PATH || path.join(process.cwd(), 'backups');

// Upload de arquivo temporário para restauração
const upload = multer({
    dest: path.join(BACKUP_DIR, 'tmp'),
    fileFilter: (_req, file, cb) => {
        if (file.originalname.endsWith('.sql')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos .sql são aceitos'));
        }
    },
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

// GET /api/backup/list — Listar backups disponíveis
router.get('/list', authMiddleware, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            res.json({ backups: [], history: [] });
            return;
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
            .map(filename => {
                const filepath = path.join(BACKUP_DIR, filename);
                const stats = fs.statSync(filepath);
                return {
                    filename,
                    size_bytes: stats.size,
                    created_at: stats.mtime.toISOString(),
                };
            })
            .sort((a, b) => b.created_at.localeCompare(a.created_at));

        // Buscar histórico do banco
        const { rows: history } = await pool.query(
            'SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 50'
        );

        res.json({ backups: files, history });
    } catch (err: any) {
        console.error('Error listing backups:', err);
        res.status(500).json({ error: err?.message || 'Erro ao listar backups' });
    }
});

// POST /api/backup/create — Disparar backup manual
router.post('/create', authMiddleware, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
    try {
        const result = await performBackup();
        res.json({
            message: 'Backup criado com sucesso',
            filename: result.filename,
            size_bytes: result.size,
        });
    } catch (err: any) {
        console.error('Error creating backup:', err);
        res.status(500).json({ error: err?.message || 'Erro ao criar backup. Verifique se pg_dump está instalado e configurado.' });
    }
});

// GET /api/backup/download/:filename — Download de arquivo de backup
router.get('/download/:filename', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
    const { filename } = req.params;

    // Sanitizar nome do arquivo para evitar path traversal
    const safeFilename = path.basename(filename);
    if (!safeFilename.startsWith('backup_') || !safeFilename.endsWith('.sql')) {
        res.status(400).json({ error: 'Nome de arquivo inválido' });
        return;
    }

    const filepath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filepath)) {
        res.status(404).json({ error: 'Arquivo não encontrado' });
        return;
    }

    res.download(filepath, safeFilename);
});

// DELETE /api/backup/:filename — Deletar um backup
router.delete('/:filename', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);

    if (!safeFilename.startsWith('backup_') || !safeFilename.endsWith('.sql')) {
        res.status(400).json({ error: 'Nome de arquivo inválido' });
        return;
    }

    const filepath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filepath)) {
        res.status(404).json({ error: 'Arquivo não encontrado' });
        return;
    }

    try {
        fs.unlinkSync(filepath);
        res.json({ message: 'Backup removido com sucesso' });
    } catch (err: any) {
        res.status(500).json({ error: err?.message || 'Erro ao remover backup' });
    }
});

// POST /api/backup/restore — Restaurar banco a partir de arquivo .sql
router.post('/restore', authMiddleware, requireRole('admin'), upload.single('backup_file'), async (req: AuthRequest, res: Response) => {
    const uploadedFile = (req as any).file;

    if (!uploadedFile) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
    }

    const dbName = process.env.DB_NAME || 'pdv_local';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';

    const cmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${uploadedFile.path}" --no-password`;

    exec(cmd, { env: { ...process.env, PGPASSWORD: dbPassword } }, async (error) => {
        // Limpar arquivo temporário
        try { fs.unlinkSync(uploadedFile.path); } catch { /* ignore */ }

        if (error) {
            console.error('Restore failed:', error);
            res.status(500).json({ error: `Falha na restauração: ${error.message}` });
            return;
        }

        // Registrar no histórico
        try {
            await pool.query(
                "INSERT INTO backup_history (filename, filepath, size_bytes, status) VALUES ($1, $2, $3, $4)",
                [`restore_${uploadedFile.originalname}`, uploadedFile.path, uploadedFile.size, 'restored']
            );
        } catch { /* ignore */ }

        res.json({ message: 'Banco de dados restaurado com sucesso. Por favor, reinicie o servidor.' });
    });
});

export default router;
