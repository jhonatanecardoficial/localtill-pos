import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import pool from './database';

let backupJob: cron.ScheduledTask | null = null;

export async function getBackupConfig() {
    const { rows } = await pool.query(
        "SELECT key, value FROM system_settings WHERE key LIKE 'backup_%'"
    );
    const config: Record<string, string> = {};
    rows.forEach((r: any) => { config[r.key] = r.value; });
    return {
        enabled: config.backup_enabled === 'true',
        schedule: config.backup_schedule || '0 2 * * *',
        retentionDays: parseInt(config.backup_retention_days || '30'),
        path: config.backup_path || './backups',
    };
}

function runBackup(backupPath: string): Promise<{ filename: string; filepath: string; size: number }> {
    return new Promise((resolve, reject) => {
        const dbName = process.env.DB_NAME || 'pdv_local';
        const dbUser = process.env.DB_USER || 'postgres';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '5432';

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${dbName}_${timestamp}.sql`;
        const filepath = path.join(backupPath, filename);

        // Garantir que a pasta existe
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }

        // Tentar encontrar o pg_dump em caminhos comuns no Windows se falhar o comando simples
        const pgPaths = [
            'pg_dump', // Se estiver no PATH
            '"C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"',
            '"C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"',
            '"C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe"',
            '"C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe"',
        ];

        let lastError: any = null;
        
        const tryPath = (index: number) => {
            if (index >= pgPaths.length) {
                reject(new Error(`pg_dump não encontrado. Por favor, instale o PostgreSQL ou adicione o diretório "bin" ao PATH do Windows. Último erro: ${lastError?.message}`));
                return;
            }

            const cmd = `${pgPaths[index]} -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${filepath}" --no-password`;
            
            exec(cmd, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'postgres' } }, (error) => {
                if (error) {
                    lastError = error;
                    tryPath(index + 1);
                    return;
                }

                const stats = fs.statSync(filepath);
                resolve({ filename, filepath, size: stats.size });
            });
        };

        tryPath(0);
    });
}

async function cleanOldBackups(backupPath: string, retentionDays: number) {
    if (!fs.existsSync(backupPath)) return;

    const files = fs.readdirSync(backupPath).filter(f => f.startsWith('backup_') && f.endsWith('.sql'));
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
        const filepath = path.join(backupPath, file);
        const stats = fs.statSync(filepath);
        if (stats.mtimeMs < cutoff) {
            fs.unlinkSync(filepath);
            console.log(`🗑️ Backup antigo removido: ${file}`);
        }
    }
}

export async function performBackup(): Promise<{ filename: string; filepath: string; size: number }> {
    const config = await getBackupConfig();

    console.log('💾 Iniciando backup...');
    const result = await runBackup(config.path);

    // Registrar no histórico
    await pool.query(
        'INSERT INTO backup_history (filename, filepath, size_bytes, status) VALUES ($1, $2, $3, $4)',
        [result.filename, result.filepath, result.size, 'completed']
    );

    // Limpar backups antigos
    await cleanOldBackups(config.path, config.retentionDays);

    console.log(`✅ Backup concluído: ${result.filename} (${(result.size / 1024).toFixed(1)} KB)`);
    return result;
}

export async function startBackupScheduler() {
    const config = await getBackupConfig();

    if (!config.enabled) {
        console.log('⏸️ Backup automático desativado');
        return;
    }

    if (backupJob) {
        backupJob.stop();
    }

    backupJob = cron.schedule(config.schedule, async () => {
        try {
            await performBackup();
        } catch (err) {
            console.error('❌ Erro no backup automático:', err);
            await pool.query(
                "INSERT INTO backup_history (filename, filepath, size_bytes, status) VALUES ('error', '', 0, 'failed')"
            );
        }
    });

    console.log(`🕐 Backup automático agendado: ${config.schedule}`);
}

export async function stopBackupScheduler() {
    if (backupJob) {
        backupJob.stop();
        backupJob = null;
    }
}
