import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';

export function GeneralSettings() {
    const { currency, locale, updateSettings, loading: contextLoading } = useCurrency();
    const [saving, setSaving] = useState(false);

    const [selectedCurrency, setSelectedCurrency] = useState(currency);
    const [selectedLocale, setSelectedLocale] = useState(locale);

    useEffect(() => {
        if (!contextLoading) {
            setSelectedCurrency(currency);
            setSelectedLocale(locale);
        }
    }, [contextLoading, currency, locale]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSettings(selectedCurrency, selectedLocale);
            toast.success('Configurações salvas com sucesso!');
        } catch (error) {
            toast.error('Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    if (contextLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                        <CardTitle>Configurações Gerais</CardTitle>
                        <CardDescription>Preferências regionais e de moeda</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Moeda da Loja</Label>
                        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a moeda" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BRL">Real Brasileiro (BRL)</SelectItem>
                                <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Define o símbolo e formatação de preços em todo o sistema.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Formato Regional (Locale)</Label>
                        <Select value={selectedLocale} onValueChange={setSelectedLocale}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a região" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                                <SelectItem value="en-US">Inglês (Estados Unidos)</SelectItem>
                                <SelectItem value="de-DE">Alemão (Alemanha)</SelectItem>
                                <SelectItem value="es-ES">Espanhol (Espanha)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Define como números e datas são exibidos (ex: 1.000,00 vs 1,000.00).
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Salvar Alterações
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
