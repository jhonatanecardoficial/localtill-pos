import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/CurrencyContext';

interface SalesTarget {
  id: string;
  user_id: string;
  month: number;
  year: number;
  target_amount: number;
  achieved_amount: number;
  user_name?: string;
}

interface User {
  id: string;
  full_name: string;
}

export const SalesTargetsSettings = () => {
  const { formatCurrency } = useCurrency();
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    user_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    target_amount: 0,
  });

  useEffect(() => {
    fetchUsers();
    fetchTargets();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get<any[]>('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  const fetchTargets = async () => {
    try {
      const data = await api.get<SalesTarget[]>('/settings/targets');
      setTargets(data || []);
    } catch (error) {
      console.error('Error fetching targets:', error);
      toast.error('Erro ao carregar metas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/settings/targets', formData);

      toast.success('Meta criada com sucesso!');
      setDialogOpen(false);
      fetchTargets();
      setFormData({
        user_id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        target_amount: 0,
      });
    } catch (error) {
      console.error('Error creating target:', error);
      toast.error('Erro ao criar meta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta meta?')) return;

    try {
      await api.delete(`/settings/targets/${id}`);

      toast.success('Meta excluída com sucesso!');
      fetchTargets();
    } catch (error) {
      console.error('Error deleting target:', error);
      toast.error('Erro ao excluir meta');
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[month - 1];
  };

  const calculateProgress = (achieved: number, target: number) => {
    if (!target) return 0;
    return Math.min((achieved / target) * 100, 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Metas de Vendas
            </CardTitle>
            <CardDescription>
              Defina e acompanhe metas mensais por vendedor
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Meta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="user">Vendedor</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="month">Mês</Label>
                    <Select
                      value={formData.month.toString()}
                      onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {getMonthName(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="year">Ano</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      min={2020}
                      max={2100}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="target">Valor da Meta (R$)</Label>
                  <Input
                    id="target"
                    type="number"
                    step="0.01"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Meta'}
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
              <TableHead>Vendedor</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Meta</TableHead>
              <TableHead>Alcançado</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((target) => (
              <TableRow key={target.id}>
                <TableCell className="font-medium">{target.user_name}</TableCell>
                <TableCell>
                  {getMonthName(target.month)}/{target.year}
                </TableCell>
                <TableCell>
                  {formatCurrency(target.target_amount)}
                </TableCell>
                <TableCell>
                  {formatCurrency(target.achieved_amount || 0)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={calculateProgress(target.achieved_amount || 0, target.target_amount)} className="w-24" />
                    <span className="text-xs text-muted-foreground">
                      {calculateProgress(target.achieved_amount || 0, target.target_amount).toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(target.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {targets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma meta cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
