import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Auto-carregamento do arquivo .env no Node.js
function loadEnv() {
    const envPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'server', '.env'),
        path.resolve(__dirname, '..', '..', '.env'),
    ];

    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            if (typeof (process as any).loadEnvFile === 'function') {
                try {
                    (process as any).loadEnvFile(p);
                } catch {
                    // Fallback se erro no parser nativo
                }
            }
            break;
        }
    }
}

loadEnv();

const DB_CONFIG: any = {
    user: process.env.DB_USER || 'pdv_user',
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'pdv_db',
    password: process.env.DB_PASSWORD || 'pdv_password',
    port: parseInt(process.env.DB_PORT || '5432'),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
};

export const pool = new Pool(DB_CONFIG);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export async function testConnection(): Promise<boolean> {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Conexão com PostgreSQL estabelecida');
        return true;
    } catch (err) {
        console.error('❌ Erro ao conectar ao PostgreSQL:', err);
        return false;
    }
}

export async function resetDatabase(): Promise<void> {
    const client = await pool.connect();
    try {
        console.log('🧹 Limpando schema público do banco de dados...');
        await client.query('DROP SCHEMA IF EXISTS public CASCADE');
        await client.query('CREATE SCHEMA public');
        await client.query('GRANT ALL ON SCHEMA public TO public');
        await client.query(`GRANT ALL ON SCHEMA public TO "${DB_CONFIG.user}"`);
        console.log('✅ Schema público resetado com sucesso.');

        // Reexecutar schema e seed
        await executeSchemaAndSeed(client);
    } catch (err) {
        console.error('❌ Erro ao resetar banco:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function executeSchemaAndSeed(client: any): Promise<void> {
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schema);
    console.log('✅ Schema criado com sucesso');

    const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf-8');
    await client.query(seed);
    console.log('✅ Dados iniciais inseridos');

    await ensureAdminExists(client);
}

export async function initializeDatabase(forceReset = false): Promise<void> {
    const client = await pool.connect();
    try {
        if (forceReset) {
            client.release();
            await resetDatabase();
            return;
        }

        // Verificar integridade das tabelas essenciais
        const { rows } = await client.query(`
            SELECT count(*)::int as count FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'user_roles', 'branches', 'products', 'categories', 'inventory', 'cash_registers')
        `);

        const tablesFound = rows[0]?.count || 0;

        if (tablesFound >= 7) {
            console.log('📦 Banco de dados já inicializado e estruturado');
            await ensureAdminExists(client);
            await runMigrations(client);
            return;
        }

        console.log(`⚠️ Estrutura incompleta (${tablesFound}/7 tabelas encontradas). Recriando schema completo...`);
        client.release();
        await resetDatabase();
    } catch (err) {
        console.error('❌ Erro ao inicializar banco:', err);
        throw err;
    } finally {
        // Garantir que não duplica release
    }
}

async function runMigrations(client: any): Promise<void> {
    try {
        // Adicionar colunas total_additions/total_withdrawals se não existirem
        await client.query(`
            ALTER TABLE cash_registers 
            ADD COLUMN IF NOT EXISTS total_additions NUMERIC DEFAULT 0
        `);
        await client.query(`
            ALTER TABLE cash_registers 
            ADD COLUMN IF NOT EXISTS total_withdrawals NUMERIC DEFAULT 0
        `);

        // Tabela de auditoria: vendas deletadas
        await client.query(`
            CREATE TABLE IF NOT EXISTS deleted_sales_audit (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sale_id UUID NOT NULL,
                sale_number TEXT,
                branch_id UUID,
                total NUMERIC,
                subtotal NUMERIC,
                discount NUMERIC,
                payment_method TEXT,
                cashier_id UUID,
                cashier_name TEXT,
                customer_name TEXT,
                customer_document TEXT,
                cash_register_id UUID,
                sale_items JSONB,
                deleted_by UUID NOT NULL,
                deleted_by_name TEXT,
                reason TEXT,
                original_created_at TIMESTAMPTZ,
                deleted_at TIMESTAMPTZ DEFAULT now()
            )
        `);

        // Tabela de auditoria: movimentações deletadas
        await client.query(`
            CREATE TABLE IF NOT EXISTS deleted_movements_audit (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                movement_id UUID NOT NULL,
                product_id UUID,
                product_name TEXT,
                product_sku TEXT,
                branch_id UUID,
                branch_name TEXT,
                quantity INTEGER,
                movement_type TEXT,
                reference_id UUID,
                notes TEXT,
                user_id UUID,
                user_name TEXT,
                original_created_at TIMESTAMPTZ,
                deleted_by UUID NOT NULL,
                deleted_by_name TEXT,
                reason TEXT,
                deleted_at TIMESTAMPTZ DEFAULT now()
            )
        `);

        console.log('✅ Migrations verificadas');
    } catch (err) {
        console.error('⚠️ Erro ao aplicar migrations:', err);
    }
}

async function ensureAdminExists(client: any): Promise<void> {
    const adminEmails = ['admin@pdv.com', 'admin@pdv.local'];
    const passwordHash = await bcrypt.hash('admin123', 10);

    const { rows: branch } = await client.query('SELECT id FROM branches LIMIT 1');
    const branchId = branch.length > 0 ? branch[0].id : null;

    for (const email of adminEmails) {
        const { rows: userRows } = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        let userId: string;

        if (userRows.length === 0) {
            const { rows: newAdmin } = await client.query(
                `INSERT INTO users (email, password_hash, full_name, branch_id)
                 VALUES ($1, $2, 'Administrador', $3)
                 RETURNING id`,
                [email, passwordHash, branchId]
            );
            userId = newAdmin[0].id;
            console.log(`👤 Usuário administrador criado: ${email} / admin123`);
        } else {
            userId = userRows[0].id;
            // Atualizar senha garantindo admin123
            await client.query(
                'UPDATE users SET password_hash = $1, branch_id = COALESCE(branch_id, $2) WHERE id = $3',
                [passwordHash, branchId, userId]
            );
        }

        // Garantir papel 'admin'
        await client.query(
            `INSERT INTO user_roles (user_id, role)
             VALUES ($1, 'admin')
             ON CONFLICT (user_id, role) DO NOTHING`,
            [userId]
        );
    }

    console.log('✅ Usuários administradores configurados (admin@pdv.com / admin@pdv.local com senha: admin123)');
}

export default pool;
