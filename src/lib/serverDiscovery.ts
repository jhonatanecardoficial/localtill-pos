import api, { setServerUrl } from './api';

// Configuração do mDNS
const MDNS_HOSTNAME = 'pdv-server.local';
const SERVER_PORT = 3000;
const DISCOVER_PATH = '/api/discover';

export interface ServerInfo {
    name: string;
    version: string;
    status: string;
    url: string;
}

/**
 * Tenta descobrir o servidor automaticamente
 * 1. Tenta conectar via mDNS (pdv-server.local)
 * 2. Tenta conectar via localhost (caso esteja na mesma máquina)
 * 3. Retorna null se não encontrar
 */
export async function discoverServer(): Promise<ServerInfo | null> {
    const candidates = [
        `http://${MDNS_HOSTNAME}:${SERVER_PORT}`,
        `http://localhost:${SERVER_PORT}`,
        // Poderíamos adicionar varredura de IP aqui se necessário, mas é lento no browser
        // devido a limitações de CORS/Timeout
    ];

    // Verificar se já temos uma URL salva e tentar ela primeiro
    const savedUrl = localStorage.getItem('pdv_server_url');
    if (savedUrl) {
        candidates.unshift(savedUrl);
    }

    // Remover duplicatas
    const uniqueCandidates = Array.from(new Set(candidates));

    for (const url of uniqueCandidates) {
        try {
            console.log(`Trying to connect to ${url}...`);
            const info = await api.discover(url);

            if (info) {
                console.log(`Server found at ${url}:`, info);
                setServerUrl(url); // Atualiza a URL padrão
                return {
                    ...info,
                    url
                };
            }
        } catch (e) {
            console.log(`Failed to connect to ${url}`);
        }
    }

    return null;
}

/**
 * Valida se um IP/URL é um servidor PDV válido
 */
export async function validateServerUrl(inputUrl: string): Promise<ServerInfo | null> {
    let url = inputUrl.trim();

    // Adicionar protocolo e porta se faltar
    if (!url.startsWith('http')) {
        url = `http://${url}`;
    }

    // Se não tem porta especificada e não é padrão web, assumir 3000
    if ((url.split(':').length === 2) && !url.includes(':3000')) {
        url = `${url}:3000`;
    }

    // Remover trailing slash
    url = url.replace(/\/+$/, '');

    const info = await api.discover(url);
    if (info) {
        setServerUrl(url);
        return { ...info, url };
    }
    return null;
}
