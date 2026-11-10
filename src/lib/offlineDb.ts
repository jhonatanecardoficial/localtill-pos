// =====================================================
// OFFLINE DATABASE - IndexedDB para cache local no PDV
// =====================================================

const DB_NAME = 'pdv_offline';
const DB_VERSION = 1;

interface OfflineProduct {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    sale_price: number;
    cost_price?: number;
    unit: string;
    image_url?: string;
    category_id?: string;
    category_name?: string;
    stock: number;
    is_active: boolean;
}

interface OfflineCategory {
    id: string;
    name: string;
    description?: string;
}

interface OfflineCustomer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    loyalty_points: number;
}

interface PendingSale {
    client_id: string;
    branch_id?: string;
    cashier_id?: string;
    customer_id?: string;
    customer_name?: string;
    customer_document?: string;
    cash_register_id?: string;
    payment_method: string;
    transaction_type: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string;
    items: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        discount: number;
        total: number;
    }>;
    created_at: string;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains('products')) {
                db.createObjectStore('products', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('categories')) {
                db.createObjectStore('categories', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('customers')) {
                db.createObjectStore('customers', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('pendingSales')) {
                const store = db.createObjectStore('pendingSales', { keyPath: 'client_id' });
                store.createIndex('created_at', 'created_at');
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getFromStore<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function putInStore<T>(storeName: string, items: T[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(item => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function clearStore(storeName: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// =====================================================
// API Pública
// =====================================================

export const offlineDb = {
    // Produtos
    getProducts: () => getFromStore<OfflineProduct>('products'),
    saveProducts: (products: OfflineProduct[]) => putInStore('products', products),
    clearProducts: () => clearStore('products'),

    // Categorias
    getCategories: () => getFromStore<OfflineCategory>('categories'),
    saveCategories: (categories: OfflineCategory[]) => putInStore('categories', categories),

    // Clientes
    getCustomers: () => getFromStore<OfflineCustomer>('customers'),
    saveCustomers: (customers: OfflineCustomer[]) => putInStore('customers', customers),

    // Vendas pendentes
    getPendingSales: () => getFromStore<PendingSale>('pendingSales'),
    addPendingSale: (sale: PendingSale) => putInStore('pendingSales', [sale]),
    removePendingSale: (clientId: string) => deleteFromStore('pendingSales', clientId),
    clearPendingSales: () => clearStore('pendingSales'),

    // Settings
    getSetting: async (key: string): Promise<any> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    },
    setSetting: async (key: string, value: any): Promise<void> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            store.put({ key, value });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
};

export type { OfflineProduct, OfflineCategory, OfflineCustomer, PendingSale };
export default offlineDb;
