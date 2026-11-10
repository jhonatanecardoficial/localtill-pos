import api from './api';
import { offlineDb } from './offlineDb';
import { toast } from 'sonner';

export interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    pendingSales: number;
    lastSync: string | null;
    error: string | null;
}

class SyncManager {
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;
    private listeners: ((status: SyncStatus) => void)[] = [];

    constructor() {
        // Initialize with default state
    }

    // Iniciar auto-sync
    startAutoSync(intervalMs = 5000) {
        if (this.syncInterval) return;

        console.log('🔄 Auto-sync started');
        this.syncInterval = setInterval(() => {
            if (navigator.onLine) {
                this.syncAll();
            }
        }, intervalMs);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    subscribe(listener: (status: SyncStatus) => void) {
        this.listeners.push(listener);
        // Invoke immediately with current state logic if needed
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private async notifyListeners() {
        // This logic needs to reconstruct the SyncStatus object
        // For now, let's just assume we want to pass mostly the syncing state
        // But useSync expects the full object.
        // We might need to query offlineDb to get pending sales count.

        const pendingSales = await offlineDb.getPendingSales();

        const status: SyncStatus = {
            isOnline: navigator.onLine,
            isSyncing: this.isSyncing,
            pendingSales: pendingSales.length,
            lastSync: new Date().toISOString(), // This should ideally be stored/fetched
            error: null
        };

        this.listeners.forEach(l => l(status));
    }

    async syncAll() {
        if (this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;
        await this.notifyListeners(); // Notify start

        try {
            // 1. Enviar vendas pendentes
            await this.syncPendingSalesInternal();

            // 2. Baixar atualizações (Produtos, Clientes, Configs)
            await this.syncReferenceData();

        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.isSyncing = false;
            await this.notifyListeners(); // Notify end
        }
    }

    // Renamed to avoid reserved word conflict if any, or just strictly private
    async syncPendingSalesInternal() {
        const pendingSales = await offlineDb.getPendingSales();
        if (pendingSales.length === 0) return;

        console.log(`📡 Syncing ${pendingSales.length} pending sales...`);

        for (const sale of pendingSales) {
            try {
                const payload = {
                    ...sale,
                    client_id: sale.client_id,
                    synced_at: new Date().toISOString()
                };

                await api.post('/sales', payload);

                await offlineDb.removePendingSale(sale.client_id);
            } catch (error) {
                console.error(`Failed to sync sale ${sale.client_id}:`, error);
            }
        }

        if ((await offlineDb.getPendingSales()).length === 0) {
            toast.success('Todas as vendas offline foram sincronizadas!');
        }
    }

    private async syncReferenceData() {
        try {
            const [products, categories, customers, loyalty] = await Promise.all([
                api.get<any[]>('/products', { active_only: true }),
                api.get<any[]>('/categories'),
                api.get<any[]>('/customers'),
                api.get<any>('/settings/loyalty')
            ]);

            if (products) await offlineDb.saveProducts(products);
            if (categories) await offlineDb.saveCategories(categories);
            if (customers) await offlineDb.saveCustomers(customers);

            if (loyalty) {
                await offlineDb.setSetting('loyalty_settings', loyalty);
            }

            console.log('✅ Reference data synced');
        } catch (error) {
            console.error('Error syncing reference data:', error);
        }
    }

    // Public wrapper for external calls
    public async syncPendingSalesPublic() {
        return this.syncPendingSalesInternal();
    }
}

export const syncManager = new SyncManager();
export default syncManager;

// Export named helpers for useSync
export const startAutoSync = () => syncManager.startAutoSync();
export const stopAutoSync = () => syncManager.stopAutoSync();
export const onSyncStatusChange = (cb: (status: SyncStatus) => void) => syncManager.subscribe(cb);
export const fullSync = () => syncManager.syncAll();
export const syncPendingSales = () => syncManager.syncPendingSalesPublic();
