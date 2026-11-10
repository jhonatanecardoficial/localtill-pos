import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fork, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;
let serverIp: string | null = null;

const isDev = process.env.NODE_ENV === 'development';

function startServer(): Promise<{ port: number; ip: string }> {
    return new Promise((resolve, reject) => {
        if (isDev) {
            console.log('Dev mode: assuming server is running separately');
            resolve({ port: 3000, ip: 'localhost' });
            return;
        }

        let serverPath;
        if (app.isPackaged) {
            // Em produção (asar), o servidor está em resources/server/dist/index.js
            serverPath = path.join(process.resourcesPath, 'server', 'dist', 'index.js');
        } else {
            // Em desenvolvimento, está na raiz
            serverPath = path.join(app.getAppPath(), 'server', 'dist', 'index.js');
        }
        console.log(`Starting server from: ${serverPath}`);

        if (!fs.existsSync(serverPath)) {
            const msg = `Server not found at: ${serverPath}`;
            console.error(msg);
            reject(new Error(msg));
            return;
        }

        // Default DATABASE_URL
        const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pdv_local';

        serverProcess = fork(serverPath, [], {
            env: {
                ...process.env,
                DATABASE_URL: dbUrl,
                DB_USER: 'postgres',
                DB_PASSWORD: 'postgres',
                DB_HOST: 'localhost',
                DB_PORT: '5432',
                DB_NAME: 'pdv_local',
            },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });

        // Timeout de 15s para o servidor responder
        const timeout = setTimeout(() => {
            console.warn('Server startup timed out, proceeding anyway');
            resolve({ port: 3000, ip: 'localhost' });
        }, 15000);

        // Receber mensagem IPC do servidor
        serverProcess.on('message', (msg: any) => {
            if (msg.type === 'server-ready') {
                clearTimeout(timeout);
                console.log(`Server ready on port ${msg.port}, IP: ${msg.ip}`);
                resolve({ port: msg.port, ip: msg.ip });
            } else if (msg.type === 'error') {
                clearTimeout(timeout);
                console.error('Server error:', msg.message);
                reject(new Error(msg.message));
            }
        });

        serverProcess.on('error', (err) => {
            clearTimeout(timeout);
            console.error('Failed to start server:', err);
            reject(err);
        });

        serverProcess.on('exit', (code, signal) => {
            console.log(`Server exited with code ${code} and signal ${signal}`);
        });

        if (serverProcess.stdout) {
            serverProcess.stdout.on('data', (data) => console.log(`[Server]: ${data}`));
        }
        if (serverProcess.stderr) {
            serverProcess.stderr.on('data', (data) => console.error(`[Server Error]: ${data}`));
        }
    });
}

function stopServer() {
    if (serverProcess) {
        console.log('Stopping server...');
        serverProcess.kill();
        serverProcess = null;
    }
}

const createWindow = async () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '../public/favicon.ico'),
        autoHideMenuBar: true,
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // Carregar frontend via servidor HTTP (não file://)
        // Isso garante que o servidor está servindo tudo corretamente
        if (serverPort) {
            mainWindow.loadURL(`http://localhost:${serverPort}`);
        } else {
            // Fallback: carregar arquivo local
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }
        // TODO: remover DevTools após confirmar que funciona
        // mainWindow.webContents.openDevTools();
    }
};

app.on('ready', async () => {
    try {
        const serverInfo = await startServer();
        serverPort = serverInfo.port;
        serverIp = serverInfo.ip;
        console.log(`Server running at http://${serverIp}:${serverPort}`);
    } catch (err: any) {
        console.error('Server failed to start:', err.message);
        // Mostrar erro ao usuário
        dialog.showErrorBox(
            'Erro ao iniciar servidor',
            `${err.message}\n\nVerifique se o PostgreSQL está instalado e rodando.\nExecute o setup.bat se ainda não fez a instalação.`
        );
    }

    await createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    stopServer();
});
