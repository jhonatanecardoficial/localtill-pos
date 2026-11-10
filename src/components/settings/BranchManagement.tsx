import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Building2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { UpgradeButton } from '@/components/UpgradeButton';
import { useSubscription } from '@/hooks/useSubscription';
import { cleanEmptyStrings } from '@/lib/utils'; // Keep this utility

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

export const BranchManagement = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const { branchesLimit } = useSubscription();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await api.get<Branch[]>('/branches');
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Erro ao carregar filiais');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanedData = cleanEmptyStrings(formData);

      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, cleanedData);
        toast.success('Filial atualizada com sucesso!');
      } else {
        await api.post('/branches', { ...cleanedData, is_active: true });
        toast.success('Filial criada com sucesso!');
      }

      setDialogOpen(false);
      setEditingBranch(null);
      fetchBranches();
      setFormData({ name: '', code: '', address: '', phone: '' });
    } catch (error: any) {
      console.error('Error saving branch:', error);
      if (error.response?.status === 409 || error.message?.includes('já existe')) {
        toast.error('Código da filial já existe');
      } else {
        toast.error('Erro ao salvar filial');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/branches/${id}`, { is_active: !currentStatus });
      toast.success('Status atualizado com sucesso!');
      fetchBranches();
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Gestão de Filiais
              <span className="text-sm text-muted-foreground">
                ({branches.length}/{branchesLimit})
              </span>
            </CardTitle>
            <CardDescription>
              Gerencie as filiais da sua empresa
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchBranches} title="Recarregar">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <UpgradeButton type="branch" />
            {branches.length < branchesLimit && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Filial
              </Button>
            )}
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingBranch(null);
              setFormData({ name: '', code: '', address: '', phone: '' });
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? 'Editar Filial' : 'Nova Filial'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Filial *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : editingBranch ? 'Atualizar' : 'Criar Filial'}
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
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell className="font-medium">{branch.name}</TableCell>
                <TableCell>{branch.code}</TableCell>
                <TableCell>{branch.address || '-'}</TableCell>
                <TableCell>{branch.phone || '-'}</TableCell>
                <TableCell>
                  <Switch
                    checked={branch.is_active}
                    onCheckedChange={() => handleToggleActive(branch.id, branch.is_active)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(branch)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {branches.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma filial cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
