import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Percent, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DiscountRule {
  id: string;
  rule_type: 'quantity' | 'value';
  threshold: number;
  discount_percentage: number;
  is_active: boolean;
}

export const DiscountRulesSettings = () => {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    rule_type: 'quantity' as 'quantity' | 'value',
    threshold: 0,
    discount_percentage: 0,
  });
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const data = await api.get<DiscountRule[]>('/settings/discounts');
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching discount rules:', error);
      toast.error('Erro ao carregar regras de desconto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/settings/discounts', { ...formData, is_active: true });

      toast.success('Regra de desconto criada com sucesso!');
      setDialogOpen(false);
      fetchRules();
      setFormData({
        rule_type: 'quantity',
        threshold: 0,
        discount_percentage: 0,
      });
    } catch (error) {
      console.error('Error creating discount rule:', error);
      toast.error('Erro ao criar regra de desconto');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/settings/discounts/${id}`, { is_active: !currentStatus });

      toast.success('Status atualizado com sucesso!');
      fetchRules();
    } catch (error) {
      console.error('Error updating discount rule:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta regra?')) return;

    try {
      await api.delete(`/settings/discounts/${id}`);

      toast.success('Regra excluída com sucesso!');
      fetchRules();
    } catch (error) {
      console.error('Error deleting discount rule:', error);
      toast.error('Erro ao excluir regra');
    }
  };

  const getRuleTypeLabel = (type: string) => {
    return type === 'quantity' ? 'Quantidade de Itens' : 'Valor Total (R$)';
  };

  const getThresholdLabel = (type: string, threshold: number) => {
    return type === 'quantity'
      ? `${threshold} itens ou mais`
      : formatCurrency(threshold);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Descontos Progressivos
            </CardTitle>
            <CardDescription>
              Configure descontos automáticos baseados em quantidade ou valor
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Regra de Desconto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="rule_type">Tipo de Regra</Label>
                  <Select
                    value={formData.rule_type}
                    onValueChange={(value: 'quantity' | 'value') =>
                      setFormData({ ...formData, rule_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quantity">Por Quantidade de Itens</SelectItem>
                      <SelectItem value="value">Por Valor Total da Compra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="threshold">
                    {formData.rule_type === 'quantity' ? 'Quantidade Mínima' : 'Valor Mínimo (R$)'}
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    step={formData.rule_type === 'value' ? '0.01' : '1'}
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="discount">Desconto (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Regra'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Condição</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">
                  {getRuleTypeLabel(rule.rule_type)}
                </TableCell>
                <TableCell>
                  {getThresholdLabel(rule.rule_type, rule.threshold)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{rule.discount_percentage}% OFF</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(rule.id, rule.is_active)}
                  >
                    {rule.is_active ? (
                      <>
                        <ToggleRight className="w-4 h-4 mr-1 text-success" />
                        Ativa
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 mr-1 text-muted-foreground" />
                        Inativa
                      </>
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma regra cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
