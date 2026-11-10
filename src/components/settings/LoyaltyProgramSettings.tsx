import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Award, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface LoyaltySettings {
  id: string;
  points_per_real: number;
  reais_per_point: number;
  points_expiry_months: number | null;
  is_active: boolean;
}

import { useActiveBranch } from '@/hooks/useActiveBranch';
import { Package } from 'lucide-react';

export const LoyaltyProgramSettings = () => {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { branches, loading: branchesLoading } = useActiveBranch();

  useEffect(() => {
    if (!branchesLoading && branches.length > 0) {
      fetchSettings();
    }
  }, [branchesLoading, branches.length]);

  const fetchSettings = async () => {
    try {
      const data = await api.get<LoyaltySettings>('/settings/loyalty');

      if (data) {
        setSettings(data);
      } else {
        // Default settings if none exist
        setSettings({
          id: 'new', // Placeholder
          points_per_real: 1,
          reais_per_point: 0.10,
          points_expiry_months: 12,
          is_active: false
        });
      }
    } catch (error) {
      console.error('Error fetching loyalty settings:', error);
      toast.error('Erro ao carregar configurações de fidelidade');
    }
  };

  if (!branchesLoading && branches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Nenhuma Filial Encontrada</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Para configurar o programa de fidelidade, você precisa ter pelo menos uma filial.
          </p>
          <Button
            onClick={() => window.location.href = '/settings'}
          >
            Criar Filial
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setLoading(true);
    try {
      const loyaltyData = {
        points_per_real: settings.points_per_real,
        reais_per_point: settings.reais_per_point,
        points_expiry_months: settings.points_expiry_months,
        is_active: settings.is_active,
      };

      const updatedSettings = await api.put<LoyaltySettings>('/settings/loyalty', loyaltyData);
      setSettings(updatedSettings);

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error updating loyalty settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Programa de Fidelidade
        </CardTitle>
        <CardDescription>
          Configure como os clientes acumulam e trocam pontos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="active" className="text-base font-semibold">
                Programa Ativo
              </Label>
              <p className="text-sm text-muted-foreground">
                Ative ou desative o programa de fidelidade
              </p>
            </div>
            <Switch
              id="active"
              checked={settings.is_active}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_active: checked })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="points_per_real">
                Pontos por Real Gasto
              </Label>
              <Input
                id="points_per_real"
                type="number"
                step="0.01"
                min="0"
                value={settings.points_per_real}
                onChange={(e) =>
                  setSettings({ ...settings, points_per_real: parseFloat(e.target.value) })
                }
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Exemplo: 10 pontos = R$ 1,00 gasto
              </p>
            </div>

            <div>
              <Label htmlFor="reais_per_point">
                Valor de Cada Ponto (R$)
              </Label>
              <Input
                id="reais_per_point"
                type="number"
                step="0.01"
                min="0"
                value={settings.reais_per_point}
                onChange={(e) =>
                  setSettings({ ...settings, reais_per_point: parseFloat(e.target.value) })
                }
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Exemplo: 100 pontos = R$ 1,00 de desconto
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="expiry">
              Validade dos Pontos (meses)
            </Label>
            <Input
              id="expiry"
              type="number"
              min="0"
              value={settings.points_expiry_months || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  points_expiry_months: e.target.value ? parseInt(e.target.value) : null
                })
              }
              placeholder="Deixe vazio para sem validade"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pontos expiram após este período. Deixe vazio se não houver validade.
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-primary">Exemplo de Funcionamento</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>
                • Cliente gasta R$ 100,00 → Ganha {settings.points_per_real * 100} pontos
              </li>
              <li>
                • {100} pontos = R$ {(100 * settings.reais_per_point).toFixed(2)} de desconto
              </li>
              {settings.points_expiry_months && (
                <li>
                  • Pontos expiram em {settings.points_expiry_months} meses
                </li>
              )}
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
