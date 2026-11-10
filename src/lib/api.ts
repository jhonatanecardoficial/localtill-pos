// =====================================================
// API CLIENT - Substitui todas as chamadas Supabase
// =====================================================

const STORAGE_KEY_SERVER_URL = 'pdv_server_url';
const STORAGE_KEY_TOKEN = 'pdv_auth_token';
const STORAGE_KEY_REFRESH_TOKEN = 'pdv_refresh_token';

function getServerUrl(): string {
    const stored = localStorage.getItem(STORAGE_KEY_SERVER_URL);
    if (stored && stored !== 'http://localhost:3000' && stored !== 'http://127.0.0.1:3000') {
        return stored;
    }
    // Em ambiente web (desktop ou tablet no navegador), usar caminho relativo para o proxy do Vite
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
        return '';
    }
    return 'http://localhost:3000';
}

export function setServerUrl(url: string) {
    // Remover trailing slash
    const cleanUrl = url.replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEY_SERVER_URL, cleanUrl);
}

export function getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function setAuthTokens(token: string, refreshToken?: string) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    if (refreshToken) {
        localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
    }
}

export function clearAuthTokens() {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
}

/**
 * Retorna a URL completa para uma imagem, tratando caminhos relativos
 * para apontar para o servidor configurado.
 */
export function getImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Garantir que começa com /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${getServerUrl()}${cleanPath}`;
}

function getHeaders(isFormData = false): HeadersInit {
    const token = getAuthToken();
    const headers: any = {};

    // Se for FormData, o browser define o Content-Type com o boundary correto
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// Tentar refresh do token se expirou
async function refreshTokenIfNeeded(): Promise<boolean> {
    const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${getServerUrl()}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

async function request<T = any>(
    path: string,
    options: RequestInit = {},
    isFormData = false
): Promise<T> {
    const url = `${getServerUrl()}/api${path}`;

    let response = await fetch(url, {
        ...options,
        headers: {
            ...getHeaders(isFormData),
            ...(options.headers || {}),
        },
    });

    // ... retry logic remains checks response.status === 401 ...
    if (response.status === 401) {
        const refreshed = await refreshTokenIfNeeded();
        if (refreshed) {
            response = await fetch(url, {
                ...options,
                headers: {
                    ...getHeaders(isFormData),
                    ...(options.headers || {}),
                },
            });
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text);
}

// ...

export const api = {
    // GET request
    get: <T = any>(path: string, params?: Record<string, string | number | boolean | undefined>) => {
        let queryString = '';
        if (params) {
            const filtered = Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== null)
                .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
            if (filtered.length > 0) queryString = '?' + filtered.join('&');
        }
        return request<T>(path + queryString, { method: 'GET' });
    },

    // POST request
    post: <T = any>(path: string, body?: any, customOptions: RequestInit = {}) => {
        const isFormData = body instanceof FormData;
        return request<T>(path, {
            method: 'POST',
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
            ...customOptions
        }, isFormData);
    },

    // PUT request
    put: <T = any>(path: string, body?: any, customOptions: RequestInit = {}) => {
        const isFormData = body instanceof FormData;
        return request<T>(path, {
            method: 'PUT',
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
            ...customOptions
        }, isFormData);
    },

    // DELETE request
    delete: <T = any>(path: string, body?: any) =>
        request<T>(path, {
            method: 'DELETE',
            body: body ? JSON.stringify(body) : undefined,
        }),

    // Health check / discover
    discover: async (url?: string): Promise<{ name: string; version: string; status: string } | null> => {
        try {
            const targetUrl = url || getServerUrl();
            const response = await fetch(`${targetUrl}/api/discover`, {
                signal: AbortSignal.timeout(5000)
            });
            if (response.ok) return response.json();
            return null;
        } catch {
            return null;
        }
    },

    // Verificar se servidor está acessível
    isOnline: async (): Promise<boolean> => {
        try {
            const result = await api.discover();
            return result !== null;
        } catch {
            return false;
        }
    },

    getServerUrl,
    setServerUrl,
};

export default api;
