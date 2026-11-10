import { useState, useEffect, useCallback } from 'react';
import { onSyncStatusChange, fullSync, syncPendingSales, SyncStatus, startAutoSync, stopAutoSync } from '@/lib/syncManager';

export function useSync() {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        isOnline: false,
        isSyncing: false,
        pendingSales: 0,
        lastSync: null,
        error: null,
    });

    useEffect(() => {
        // Iniciar auto-sync
        startAutoSync();

        // Subscrever a mudanças de status
        const unsubscribe = onSyncStatusChange(setSyncStatus);

        return () => {
            unsubscribe();
            stopAutoSync();
        };
    }, []);

    const manualSync = useCallback(async () => {
        await fullSync();
    }, []);

    const syncSales = useCallback(async () => {
        return await syncPendingSales();
    }, []);

    return {
        ...syncStatus,
        manualSync,
        syncSales,
    };
}
