import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Shift {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface CashRegister {
  id: string;
  shift_id: string;
  shift_name: string;
  operator_id: string;
  branch_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount_counted: number | null;
  total_sales: number;
  total_cash: number;
  total_debit: number;
  total_credit: number;
  total_pix: number;
  total_other: number;
  difference: number | null;
  status: 'OPEN' | 'CLOSED';
  notes: string | null;
  current_change: number;
}

export const useCashRegister = () => {
  const { user } = useAuth();
  const [activeCashRegister, setActiveCashRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkActiveCashRegister();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkActiveCashRegister = async () => {
    try {
      const data = await api.get<CashRegister[]>('/cash-registers', { status: 'OPEN' });
      const dataArr = Array.isArray(data) ? data : [];
      // Encontrar caixa aberto do operador atual
      const myRegister = dataArr.find((cr: CashRegister) => cr.operator_id === user?.id);
      setActiveCashRegister(myRegister || null);
    } catch (error) {
      console.error('Error checking active cash register:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCashRegister = async (
    shiftId: string,
    shiftName: string,
    branchId: string,
    openingAmount: number
  ) => {
    try {
      const data = await api.post<CashRegister>('/cash-registers/open', {
        shift_id: shiftId,
        shift_name: shiftName,
        opening_amount: openingAmount,
      });

      setActiveCashRegister(data);
      toast.success('Caixa aberto com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Error opening cash register:', error);
      toast.error(error.message || 'Erro ao abrir caixa');
      return null;
    }
  };

  const closeCashRegister = async (
    cashRegisterId: string,
    closingAmountCounted: number,
    notes?: string
  ) => {
    try {
      const data = await api.put<CashRegister>(`/cash-registers/${cashRegisterId}/close`, {
        closing_amount_counted: closingAmountCounted,
        notes,
      });

      setActiveCashRegister(null);
      toast.success('Caixa fechado com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Error closing cash register:', error);
      toast.error(error.message || 'Erro ao fechar caixa');
      return null;
    }
  };

  const updateCashRegisterTotals = async () => {
    if (!activeCashRegister) return;

    try {
      const data = await api.get<CashRegister[]>('/cash-registers', { status: 'OPEN' });
      const dataArr = Array.isArray(data) ? data : [];
      const updated = dataArr.find((cr: CashRegister) => cr.id === activeCashRegister.id);
      if (updated) {
        setActiveCashRegister(updated);
      }
    } catch (error) {
      console.error('Error updating cash register totals:', error);
    }
  };

  return {
    activeCashRegister,
    loading,
    openCashRegister,
    closeCashRegister,
    refreshCashRegister: checkActiveCashRegister,
    updateCashRegisterTotals,
  };
};
