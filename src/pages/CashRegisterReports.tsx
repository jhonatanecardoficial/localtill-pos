import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from "@/lib/api";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileDown, Search, Calendar } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CashRegisterData {
  id: string;
  shift_name: string;
  operator_email: string;
  operator_name: string;
  branch_name: string;
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
  status: string;
  total_additions: number;
  total_withdrawals: number;
}

const CashRegisterReports = () => {
  const { formatCurrency } = useCurrency();
  const [cashRegisters, setCashRegisters] = useState<CashRegisterData[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchOperators();
    fetchShifts();
  }, []);

  const fetchOperators = async () => {
    try {
      const data = await api.get<any[]>('/users');
      setOperators(data || []);
    } catch (error) {
      console.error('Error fetching operators:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const data = await api.get<any[]>('/shifts');
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const fetchCashRegisters = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};

      if (selectedOperator !== 'all') params.operator_id = selectedOperator;
      if (selectedShift !== 'all') {
        const shiftId = shifts.find(s => s.id === selectedShift)?.id;
        if (shiftId) params.shift_id = shiftId;
      }
      if (startDate) params.start_date = startDate;
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        params.end_date = endDateTime.toISOString();
      }

      const data = await api.get<any[]>('/reports/cash-registers', params);

      if (!data || data.length === 0) {
        setCashRegisters([]);
        return;
      }

      const formattedData = data.map(register => ({
        id: register.id,
        shift_name: register.shift_name,
        operator_email: register.operator_email || '',
        operator_name: register.operator_name || 'N/A',
        branch_name: register.branch_name || 'N/A',
        opened_at: register.opened_at,
        closed_at: register.closed_at,
        opening_amount: parseFloat(register.opening_amount || 0),
        closing_amount_counted: register.closing_amount_counted ? parseFloat(register.closing_amount_counted) : null,
        total_sales: parseFloat(register.total_sales || 0),
        total_cash: parseFloat(register.total_cash || 0),
        total_debit: parseFloat(register.total_debit || 0),
        total_credit: parseFloat(register.total_credit || 0),
        total_pix: parseFloat(register.total_pix || 0),
        total_other: parseFloat(register.total_other || 0),
        difference: register.difference ? parseFloat(register.difference) : null,
        status: register.status,
        total_additions: parseFloat(register.total_additions || 0),
        total_withdrawals: parseFloat(register.total_withdrawals || 0),
      }));

      setCashRegisters(formattedData);
    } catch (error) {
      console.error('Error fetching cash registers:', error);
      toast.error('Erro ao buscar fechamentos de caixa');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (cashRegisters.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const headers = [
      'Turno',
      'Operador',
      'Email',
      'Filial',
      'Abertura',
      'Fechamento',
      'Valor Abertura',
      'Suprimentos',
      'Sangrias',
      'Valor Contado',
      'Total Vendas',
      'Dinheiro',
      'Débito',
      'Crédito',
      'Pix',
      'Outros',
      'Diferença',
      'Status',
    ];

    const rows = cashRegisters.map(cr => [
      cr.shift_name,
      cr.operator_name,
      cr.operator_email,
      cr.branch_name,
      format(new Date(cr.opened_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      cr.closed_at ? format(new Date(cr.closed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Em aberto',
      cr.opening_amount.toFixed(2),
      cr.total_additions.toFixed(2),
      cr.total_withdrawals.toFixed(2),
      cr.closing_amount_counted?.toFixed(2) || '-',
      cr.total_sales.toFixed(2),
      cr.total_cash.toFixed(2),
      cr.total_debit.toFixed(2),
      cr.total_credit.toFixed(2),
      cr.total_pix.toFixed(2),
      cr.total_other.toFixed(2),
      cr.difference?.toFixed(2) || '-',
      cr.status === 'OPEN' ? 'Aberto' : 'Fechado',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fechamentos_caixa_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Relatório exportado com sucesso!');
  };

  // Calcular totais
  const totals = cashRegisters.reduce(
    (acc, cr) => ({
      totalSales: acc.totalSales + cr.total_sales,
      totalCash: acc.totalCash + cr.total_cash,
      totalDebit: acc.totalDebit + cr.total_debit,
      totalCredit: acc.totalCredit + cr.total_credit,
      totalPix: acc.totalPix + cr.total_pix,
      totalOther: acc.totalOther + cr.total_other,
    }),
    { totalSales: 0, totalCash: 0, totalDebit: 0, totalCredit: 0, totalPix: 0, totalOther: 0 }
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Relatório de Fechamentos de Caixa</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Operador</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os operadores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os operadores</SelectItem>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.full_name || op.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os turnos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os turnos</SelectItem>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Data Inicial
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Data Final
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={fetchCashRegisters} disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button variant="outline" onClick={exportToCSV} disabled={cashRegisters.length === 0}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {cashRegisters.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Totais Consolidados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Vendas</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.totalSales)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Dinheiro</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.totalCash)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Débito</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.totalDebit)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Crédito</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.totalCredit)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Pix</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.totalPix)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Outros</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.totalOther)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fechamentos ({cashRegisters.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turno</TableHead>
                        <TableHead>Operador</TableHead>
                        <TableHead>Filial</TableHead>
                        <TableHead>Abertura</TableHead>
                        <TableHead>Fechamento</TableHead>
                        <TableHead className="text-right">Vlr. Abertura</TableHead>
                        <TableHead className="text-right text-green-600">Suprimentos</TableHead>
                        <TableHead className="text-right text-red-600">Sangrias</TableHead>
                        <TableHead className="text-right">Vlr. Contado</TableHead>
                        <TableHead className="text-right">Total Vendas</TableHead>
                        <TableHead className="text-right">Diferença</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashRegisters.map((cr) => (
                        <TableRow key={cr.id}>
                          <TableCell className="font-medium">{cr.shift_name}</TableCell>
                          <TableCell>{cr.operator_name}</TableCell>
                          <TableCell>{cr.branch_name}</TableCell>
                          <TableCell>
                            {format(new Date(cr.opened_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {cr.closed_at
                              ? format(new Date(cr.closed_at), 'dd/MM/yy HH:mm', { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(cr.opening_amount)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(cr.total_additions)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(cr.total_withdrawals)}</TableCell>
                          <TableCell className="text-right">
                            {cr.closing_amount_counted ? formatCurrency(cr.closing_amount_counted) : '-'}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(cr.total_sales)}</TableCell>
                          <TableCell className="text-right">
                            {cr.difference !== null ? (
                              <span className={cr.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(cr.difference)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${cr.status === 'OPEN'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                              {cr.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!loading && cashRegisters.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum fechamento de caixa encontrado. Use os filtros acima para buscar.
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default CashRegisterReports;
