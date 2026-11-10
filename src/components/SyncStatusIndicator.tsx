import { useSync } from '@/hooks/useSync';
import { Wifi, WifiOff, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncStatusIndicatorProps {
    compact?: boolean;
}

export const SyncStatusIndicator = ({ compact = false }: SyncStatusIndicatorProps) => {
    const { isOnline, isSyncing, pendingSales, lastSync, manualSync } = useSync();

    const formatLastSync = (iso: string | null) => {
        if (!iso) return 'Nunca';
        const diff = Date.now() - new Date(iso).getTime();
        if (diff < 60000) return 'Agora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
        return `${Math.floor(diff / 3600000)}h atrás`;
    };

    if (compact) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="relative h-8 w-8 p-0"
                        onClick={() => manualSync()}
                    >
                        {isSyncing ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        ) : isOnline ? (
                            <Wifi className="w-4 h-4 text-green-400" />
                        ) : (
                            <WifiOff className="w-4 h-4 text-red-400" />
                        )}
                        {pendingSales > 0 && (
                            <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {pendingSales}
                            </span>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <div className="text-xs space-y-1">
                        <p>{isOnline ? '🟢 Servidor online' : '🔴 Servidor offline'}</p>
                        {pendingSales > 0 && <p>⏳ {pendingSales} vendas pendentes</p>}
                        <p>Última sync: {formatLastSync(lastSync)}</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
            {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : isOnline ? (
                <Cloud className="w-4 h-4 text-green-400" />
            ) : (
                <CloudOff className="w-4 h-4 text-red-400" />
            )}

            <div className="flex flex-col text-xs">
                <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                    {isOnline ? 'Online' : 'Offline'}
                </span>
                {pendingSales > 0 && (
                    <span className="text-yellow-400">{pendingSales} vendas pendentes</span>
                )}
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-auto"
                onClick={() => manualSync()}
                disabled={isSyncing}
            >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
        </div>
    );
};
