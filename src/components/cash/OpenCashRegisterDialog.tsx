import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shift } from '@/hooks/useCashRegister';
import { useActiveBranch } from '@/hooks/useActiveBranch';
import { toast } from 'sonner';

interface OpenCashRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: Shift[];
  branchId: string;
  onOpen: (shiftId: string, shiftName: string, branchId: string, openingAmount: number) => Promise<void>;
}

export const OpenCashRegisterDialog = ({
  open,
  onOpenChange,
  shifts,
  branchId,
  onOpen,
}: OpenCashRegisterDialogProps) => {
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { activeBranch } = useActiveBranch();

  const handleSubmit = async () => {
    if (!selectedShiftId || !openingAmount) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (!activeBranch) {
      toast.error('Nenhuma filial ativa selecionada. Selecione uma filial antes de abrir o caixa.');
      return;
    }

    if (!branchId) {
      toast.error('ID da filial não encontrado');
      return;
    }

    const shift = shifts.find((s) => s.id === selectedShiftId);
    if (!shift) return;

    setLoading(true);
    await onOpen(selectedShiftId, shift.name, branchId, parseFloat(openingAmount));
    setLoading(false);
    onOpenChange(false);
    setSelectedShiftId('');
    setOpeningAmount('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
          <DialogDescription>
            Selecione o turno e informe o valor inicial do fundo de troco.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shift">Turno *</Label>
            <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
              <SelectTrigger id="shift">
                <SelectValue placeholder="Selecione o turno" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name}
                    {shift.description && (
                      <span className="text-xs text-muted-foreground ml-2">
                        - {shift.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor de Abertura (Fundo de Troco) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedShiftId || !openingAmount || loading}
          >
            {loading ? 'Abrindo...' : 'Abrir Caixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
