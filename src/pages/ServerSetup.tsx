import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Wifi, WifiOff, Server } from 'lucide-react';
import api, { setServerUrl } from '@/lib/api';

const ServerSetup = () => {
    const [serverIp, setServerIp] = useState('');
    const [port, setPort] = useState('3000');
    const [testing, setTesting] = useState(false);
    const [autoSearching, setAutoSearching] = useState(false);
    const [connected, setConnected] = useState(false);
    const [serverInfo, setServerInfo] = useState<{ name: string; version: string } | null>(null);
    const navigate = useNavigate();

    // Tentar auto-descoberta ao carregar
    useEffect(() => {
        tryAutoDiscover();
    }, []);

    const tryAutoDiscover = async () => {
        setAutoSearching(true);
        try {
            // Tentar pdv-server.local (mDNS)
            const mdnsResult = await api.discover('http://pdv-server.local:3000');
            if (mdnsResult) {
                setServerUrl('http://pdv-server.local:3000');
                setServerInfo(mdnsResult);
                setConnected(true);
                toast.success('Servidor encontrado automaticamente!');
                setAutoSearching(false);
                return;
            }

            // Tentar localhost
            const localResult = await api.discover('http://localhost:3000');
            if (localResult) {
                setServerUrl('http://localhost:3000');
                setServerInfo(localResult);
                setConnected(true);
                setServerIp('localhost');
                toast.success('Servidor encontrado em localhost!');
                setAutoSearching(false);
                return;
            }
        } catch {
            // Nenhuma descoberta automática
        }
        setAutoSearching(false);
    };

    const testConnection = async () => {
        if (!serverIp) {
            toast.error('Digite o IP do servidor');
            return;
        }

        setTesting(true);
        const url = `http://${serverIp}:${port}`;
        try {
            const result = await api.discover(url);
            if (result) {
                setServerUrl(url);
                setServerInfo(result);
                setConnected(true);
                toast.success(`Conectado ao ${result.name}!`);
            } else {
                toast.error('Servidor não encontrado neste endereço');
            }
        } catch {
            toast.error('Não foi possível conectar ao servidor');
        } finally {
            setTesting(false);
        }
    };

    const continueToLogin = () => {
        navigate('/auth');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <Card className="w-full max-w-md mx-4 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center">
                        <Server className="w-8 h-8 text-blue-400" />
                    </div>
                    <CardTitle className="text-2xl text-white">PDV Local</CardTitle>
                    <CardDescription className="text-slate-400">
                        Configure a conexão com o servidor
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Status de auto-descoberta */}
                    {autoSearching && (
                        <div className="flex items-center gap-2 p-3 bg-blue-900/30 rounded-lg border border-blue-800">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            <span className="text-sm text-blue-300">Procurando servidor na rede...</span>
                        </div>
                    )}

                    {/* Conectado */}
                    {connected && serverInfo && (
                        <div className="flex items-center gap-2 p-3 bg-green-900/30 rounded-lg border border-green-800">
                            <Wifi className="w-4 h-4 text-green-400" />
                            <div>
                                <p className="text-sm text-green-300 font-medium">{serverInfo.name}</p>
                                <p className="text-xs text-green-400/70">v{serverInfo.version} • Conectado</p>
                            </div>
                        </div>
                    )}

                    {/* Entrada manual de IP */}
                    {!connected && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Endereço IP do Servidor</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="192.168.1.100"
                                        value={serverIp}
                                        onChange={(e) => setServerIp(e.target.value)}
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                        onKeyDown={(e) => e.key === 'Enter' && testConnection()}
                                    />
                                    <Input
                                        placeholder="3000"
                                        value={port}
                                        onChange={(e) => setPort(e.target.value)}
                                        className="w-20 bg-slate-700/50 border-slate-600 text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={testConnection}
                                    disabled={testing || !serverIp}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    {testing ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testando...</>
                                    ) : (
                                        'Conectar'
                                    )}
                                </Button>
                                <Button
                                    onClick={tryAutoDiscover}
                                    variant="outline"
                                    disabled={autoSearching}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <Wifi className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                                <WifiOff className="w-4 h-4 text-slate-500" />
                                <span className="text-xs text-slate-500">
                                    Peça ao administrador o IP do servidor ou tente a busca automática
                                </span>
                            </div>
                        </>
                    )}

                    {/* Botão continuar */}
                    {connected && (
                        <Button onClick={continueToLogin} className="w-full bg-green-600 hover:bg-green-700 text-white">
                            Continuar para o Login
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ServerSetup;
