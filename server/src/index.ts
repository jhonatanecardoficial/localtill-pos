import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import net from 'net';
import os from 'os';
import { Bonjour } from 'bonjour-service';
import { testConnection, initializeDatabase } from './config/database';
import { startBackupScheduler } from './config/backup';
import { errorHandler } from './middleware/errorHandler';

// Importar rotas
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import productsRoutes from './routes/products.routes';
import categoriesRoutes from './routes/categories.routes';
import inventoryRoutes from './routes/inventory.routes';
import salesRoutes from './routes/sales.routes';
import customersRoutes from './routes/customers.routes';
import branchesRoutes from './routes/branches.routes';
import cashRegisterRoutes from './routes/cashRegister.routes';
import cashMovementRoutes from './routes/cashMovement.routes';
import shiftsRoutes from './routes/shifts.routes';
import settingsRoutes from './routes/settings.routes';
import reportsRoutes from './routes/reports.routes';
import syncRoutes from './routes/sync.routes';
import uploadRoutes from './routes/upload.routes';
import backupRoutes from './routes/backup.routes';

const app = express();
const PREFERRED_PORT = parseInt(process.env.PORT || '3000');
const SERVER_NAME = process.env.SERVER_NAME || 'PDV Server';

// =====================================================
// UTILITÁRIOS
// =====================================================

function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, '0.0.0.0', () => {
            server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
    });
}

async function findAvailablePort(startPort: number): Promise<number> {
    for (let port = startPort; port < startPort + 20; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error(`Nenhuma porta disponível entre ${startPort} e ${startPort + 19}`);
}

function getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors({
    origin: true,
    credentials: true,
}));

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Caminho para uploads
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
console.log(`Pasta de uploads: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath));

// =====================================================
// ROTAS DA API
// =====================================================

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/cash-registers', cashRegisterRoutes);

app.use('/api/cash-movements', cashMovementRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/backup', backupRoutes);

// Health check / descoberta de rede
app.get('/api/discover', (_req, res) => {
    res.json({
        name: SERVER_NAME,
        version: '1.0.0',
        status: 'online',
        timestamp: new Date().toISOString(),
    });
});

// Server info para exibir IP:Porta na interface
app.get('/api/server-info', (_req, res) => {
    const ip = getLocalIpAddress();
    const port = (app as any)._serverPort || PREFERRED_PORT;
    res.json({
        ip,
        port,
        url: `http://${ip}:${port}`,
        name: SERVER_NAME,
    });
});

// =====================================================
// SERVIR FRONTEND (build estático do React)
// =====================================================

// Detectar caminho do frontend baseado no ambiente
// Dentro do Electron empacotado: resources/server/dist/ -> resources/app.asar/dist/
// Em dev: server/dist/ -> dist/
let frontendPath: string;

const asarPath = path.join(__dirname, '..', '..', 'app.asar', 'dist');
const unpackedAppPath = path.join(__dirname, '..', '..', 'app', 'dist');
const devPath = path.join(__dirname, '..', '..', 'dist');

if (fs.existsSync(asarPath)) {
    frontendPath = asarPath;
} else if (fs.existsSync(unpackedAppPath)) {
    frontendPath = unpackedAppPath;
} else {
    frontendPath = devPath;
}

console.log(`Frontend path: ${frontendPath}`);
app.use(express.static(frontendPath));

// SPA fallback
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend não encontrado.');
    }
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(errorHandler);

// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function start() {
    console.log('');
    console.log('╔════════════════════════════════════╗');
    console.log('║       PDV Server - Local           ║');
    console.log('╚════════════════════════════════════╝');
    console.log('');

    // 1. Conectar ao banco
    const connected = await testConnection();
    if (!connected) {
        console.error('');
        console.error('❌ Não foi possível conectar ao PostgreSQL!');
        console.error('   Verifique se o PostgreSQL está rodando.');
        console.error('   Execute o setup.bat se ainda não fez a instalação.');
        console.error('');
        if (process.send) {
            process.send({ type: 'error', message: 'PostgreSQL não disponível. Execute o setup.bat primeiro.' });
        }
        return;
    }

    // 2. Inicializar banco (cria tabelas se não existirem)
    await initializeDatabase();

    // 3. Iniciar backup scheduler
    try {
        await startBackupScheduler();
    } catch (err) {
        console.warn('⚠️ Backup scheduler não pôde ser iniciado:', err);
    }

    // 4. Encontrar porta disponível
    let actualPort: number;
    try {
        actualPort = await findAvailablePort(PREFERRED_PORT);
    } catch (err) {
        console.error('❌ Nenhuma porta disponível:', err);
        if (process.send) {
            process.send({ type: 'error', message: 'Nenhuma porta disponível' });
        }
        return;
    }

    if (actualPort !== PREFERRED_PORT) {
        console.log(`⚠️ Porta ${PREFERRED_PORT} ocupada, usando porta ${actualPort}`);
    }

    const localIp = getLocalIpAddress();

    // 5. Iniciar servidor HTTP
    (app as any)._serverPort = actualPort;
    app.listen(actualPort, '0.0.0.0', () => {
        console.log('');
        console.log(`🚀 Servidor rodando em http://0.0.0.0:${actualPort}`);
        console.log(`📡 API disponível em http://localhost:${actualPort}/api`);
        console.log(`🌐 Acesso na rede: http://${localIp}:${actualPort}`);
        console.log('');

        // Enviar info para o Electron via IPC
        if (process.send) {
            process.send({
                type: 'server-ready',
                port: actualPort,
                ip: localIp,
            });
        }

        // 6. Anunciar via mDNS
        try {
            const bonjour = new Bonjour();
            bonjour.publish({
                name: SERVER_NAME,
                type: 'http',
                port: actualPort,
                txt: { version: '1.0.0', app: 'pdv-local' },
            });
            console.log(`📢 mDNS: "${SERVER_NAME}" anunciado na rede local`);
        } catch (err) {
            console.warn('⚠️ mDNS não disponível');
        }

        console.log('');
        console.log('────────────────────────────────────');
        console.log('  Aguardando conexões de PDVs...');
        console.log('────────────────────────────────────');
        console.log('');
    });
}

start().catch((err) => {
    console.error('❌ Erro fatal ao iniciar servidor:', err);
    if (process.send) {
        process.send({ type: 'error', message: String(err) });
    }
});

export default app;
