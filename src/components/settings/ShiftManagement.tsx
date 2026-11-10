import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cleanEmptyStrings } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Shift {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export const ShiftManagement = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchShifts();
    }
  }, [user]);

  const fetchShifts = async () => {
    try {
      const data = await api.get<Shift[]>('/shifts');
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Erro ao carregar turnos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const cleanedData = cleanEmptyStrings(formData);

      if (editingShift) {
        await api.put(`/shifts/${editingShift.id}`, cleanedData);
        toast.success('Turno atualizado com sucesso!');
      } else {
        await api.post('/shifts', cleanedData);
        toast.success('Turno criado com sucesso!');
      }

      setDialogOpen(false);
      setEditingShift(null);
      setFormData({ name: '', description: '', is_active: true });
      fetchShifts();
    } catch (error: any) {
      console.error('Error saving shift:', error);
      toast.error(error.message || 'Erro ao salvar turno');
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      description: shift.description || '',
      is_active: shift.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este turno?')) return;

    try {
      await api.delete(`/shifts/${id}`);
      toast.success('Turno excluído com sucesso!');
      fetchShifts();
    } catch (error: any) {
      console.error('Error deleting shift:', error);
      toast.error(error.message || 'Erro ao excluir turno');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestão de Turnos</CardTitle>
              <CardDescription>
                Configure os turnos de trabalho disponíveis para abertura de caixa
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingShift(null);
                setFormData({ name: '', description: '', is_active: true });
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Turno
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando turnos...</div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum turno cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {shift.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${shift.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {shift.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(shift)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(shift.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'Editar Turno' : 'Novo Turno'}
            </DialogTitle>
            <DialogDescription>
              Configure as informações do turno de trabalho
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Turno *</Label>
              <Input
                id="name"
                placeholder="Ex: PHD (Primeiro Horário Dia)"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Turno matutino - 06:00 às 14:00"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Turno Ativo</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              {editingShift ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
