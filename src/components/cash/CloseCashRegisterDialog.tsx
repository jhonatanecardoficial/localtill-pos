import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CashRegister } from "@/hooks/useCashRegister";
import { useCurrency } from "@/contexts/CurrencyContext";
import { api } from "@/lib/api";

interface CloseCashRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashRegister: CashRegister | null;
  onClose: (
    cashRegisterId: string,
    closingAmount: number,
    notes?: string
  ) => Promise<void>;
}

export const CloseCashRegisterDialog = ({
  open,
  onOpenChange,
  cashRegister: initialCashRegister,
  onClose,
}: CloseCashRegisterDialogProps) => {
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(initialCashRegister);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (open && initialCashRegister?.id) {
      fetchLatestData(initialCashRegister.id);
    }
  }, [open, initialCashRegister?.id]);

  const fetchLatestData = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.get<CashRegister>(`/cash-registers/${id}`);
      if (data) {
        setCashRegister(data);
      }
    } catch (error) {
      console.error("Error fetching latest cash register data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!cashRegister) return null;

  // Expected cash is directly tracked by current_change in the backend
  const expectedCash = cashRegister.current_change || 0;

  const difference = closingAmount
    ? parseFloat(closingAmount) - expectedCash
    : 0;

  const handleSubmit = async () => {
    if (!closingAmount) return;

    setLoading(true);
    await onClose(
      cashRegister.id,
      parseFloat(closingAmount),
      notes || undefined
    );
    setLoading(false);
    onOpenChange(false);
    setClosingAmount("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar Caixa</DialogTitle>
          <DialogDescription>
            Confira os valores e informe o valor contado em dinheiro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Turno:</span>
                <span className="text-sm">{cashRegister.shift_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Abertura:</span>
                <span className="text-sm">
                  {formatCurrency(cashRegister.opening_amount)}
                </span>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Vendas em Dinheiro:</span>
                  <span className="text-sm">
                    {formatCurrency(cashRegister.total_cash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cartão Débito:</span>
                  <span className="text-sm">
                    {formatCurrency(cashRegister.total_debit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cartão Crédito:</span>
                  <span className="text-sm">
                    {formatCurrency(cashRegister.total_credit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">PIX:</span>
                  <span className="text-sm">
                    {formatCurrency(cashRegister.total_pix)}
                  </span>
                </div>
                {/* Note: MB Way and Multibanco might be grouped in 'other' or specific columns if added to backend. 
                    Assuming backend standard fields for now. If custom fields needed, backend must support them.
                    For now displaying standard fields available in interface. */}
                <div className="flex justify-between">
                  <span className="text-sm">Outros:</span>
                  <span className="text-sm">
                    {formatCurrency(cashRegister.total_other)}
                  </span>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold">
                  <span>Total de Vendas:</span>
                  <span className="text-primary">
                    {formatCurrency(cashRegister.total_sales)}
                  </span>
                </div>
                <div className="flex justify-between font-bold mt-2">
                  <span>Dinheiro Esperado no Caixa:</span>
                  <span className="text-primary">
                    {formatCurrency(expectedCash)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="closing-amount">Valor Contado em Dinheiro *</Label>
            <Input
              id="closing-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
            />
          </div>

          {closingAmount && (
            <Card
              className={
                difference === 0
                  ? "bg-green-50"
                  : difference > 0
                    ? "bg-blue-50"
                    : "bg-red-50"
              }
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold">
                    {difference === 0
                      ? "✓ Conferido"
                      : difference > 0
                        ? "Sobra"
                        : "Quebra"}
                    :
                  </span>
                  <span
                    className={`font-bold text-lg ${difference === 0
                      ? "text-green-700"
                      : difference > 0
                        ? "text-blue-700"
                        : "text-red-700"
                      }`}
                  >
                    {formatCurrency(Math.abs(difference))}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre o fechamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
            disabled={!closingAmount || loading}
          >
            {loading ? "Fechando..." : "Fechar Caixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
