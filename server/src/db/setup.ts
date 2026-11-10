import bcrypt from 'bcryptjs';
import { pool, testConnection, initializeDatabase } from '../config/database';

async function setup() {
    console.log('🚀 PDV Server - Setup');
    console.log('========================');

    // 1. Testar conexão
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Não foi possível conectar ao PostgreSQL.');
        console.error('   Verifique se o PostgreSQL está rodando e as credenciais estão corretas.');
        console.error('   DB_HOST:', process.env.DB_HOST || 'localhost');
        console.error('   DB_PORT:', process.env.DB_PORT || '5432');
        console.error('   DB_NAME:', process.env.DB_NAME || 'pdv_local');
        console.error('   DB_USER:', process.env.DB_USER || 'postgres');
        process.exit(1);
    }

    // 2. Inicializar banco (forçando recriação limpa completa)
    await initializeDatabase(true);

    console.log('========================');
    console.log('✅ Setup concluído com sucesso!');
    console.log('   Administradores:');
    console.log('   - admin@pdv.com / admin123');
    console.log('   - admin@pdv.local / admin123');
    console.log('   Execute "npm run dev" para iniciar o sistema.');

    await pool.end();
    process.exit(0);
}

setup().catch((err) => {
    console.error('❌ Erro no setup:', err);
    process.exit(1);
});
