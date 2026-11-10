import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { ptBR } from 'date-fns/locale';
import { Trash2, AlertTriangle, TrendingUp, ShoppingCart, History, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { api } from '@/lib/api';

const fmtDate = (d: string) =>
  d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—';

const paymentLabel: Record<string, string> = {
  cash: 'Dinheiro', debit: 'Débito', credit: 'Crédito',
  pix: 'PIX', check: 'Cheque', other: 'Outro',
};

export default function ProfitabilityReport() {
  const { userRoles } = useAuth();
  const { formatCurrency } = useCurrency();
  const isAdmin = userRoles.includes('admin');

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(format(firstOfMonth, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));

  // Data states
  const [profitability, setProfitability] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [deletedSales, setDeletedSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profitability');

  // Delete dialog
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);


  const fetchProfitability = useCallback(async () => {
    const dateParams = { start_date: `${startDate}T00:00:00`, end_date: `${endDate}T23:59:59` };
    const prof = await api.get('/reports/profitability', dateParams);
    setProfitability(Array.isArray(prof) ? prof : []);
  }, [startDate, endDate]);

  const fetchSalesList = useCallback(async () => {
    const dateParams = { start_date: `${startDate}T00:00:00`, end_date: `${endDate}T23:59:59` };
    const sales = await api.get('/reports/sales-list', dateParams);
    setSalesList(Array.isArray(sales) ? sales : []);
  }, [startDate, endDate]);

  const fetchDeletedSales = useCallback(async () => {
    const dateParams = { start_date: `${startDate}T00:00:00`, end_date: `${endDate}T23:59:59` };
    const deleted = await api.get('/reports/deleted-sales', dateParams);
    setDeletedSales(Array.isArray(deleted) ? deleted : []);
  }, [startDate, endDate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProfitability(),
        fetchSalesList(),
        fetchDeletedSales()
      ]);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [fetchProfitability, fetchSalesList, fetchDeletedSales]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async () => {
    if (!deletingId || !deleteReason.trim()) {
      toast.error('Informe o motivo da exclusão');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete(`/sales/${deletingId}`, { reason: deleteReason });
      toast.success('Venda deletada e auditoria registrada');
      setDeletingId(null);
      setDeleteReason('');
      await fetchAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Totals for profitability tab
  const totalRevenue = profitability.reduce((acc, r) => acc + Number(r.total_revenue || 0), 0);
  const totalCost = profitability.reduce((acc, r) => acc + Number(r.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;

  // Totals for sales tab
  const salesTotal = salesList.reduce((acc, s) => acc + Number(s.total || 0), 0);

  const saleToDelete = salesList.find(s => s.id === deletingId);

  return (
    <MainLayout>
      <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Relatório de Lucratividade
        </h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Data início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={fetchAll} disabled={loading}>
              {loading ? 'Carregando...' : 'Filtrar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Lucro Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profitability">
            <TrendingUp className="w-4 h-4 mr-1.5" /> Lucratividade
          </TabsTrigger>
          <TabsTrigger value="sales">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Vendas ({salesList.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="audit">
              <History className="w-4 h-4 mr-1.5" /> Auditoria ({deletedSales.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1 — Profitability by product */}
        <TabsContent value="profitability">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qtd Vendida</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitability.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum dado no período
                      </TableCell>
                    </TableRow>
                  ) : profitability.map((row) => (
                    <TableRow key={row.product_id}>
                      <TableCell className="font-medium">{row.product_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{row.sku}</TableCell>
                      <TableCell className="text-right">{row.total_sold}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_cost)}</TableCell>
                      <TableCell className={`text-right font-medium ${Number(row.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(row.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={Number(row.profit_margin) >= 20 ? 'default' : 'secondary'}>
                          {Number(row.profit_margin).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2 — Individual sales with delete */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Vendas no Período — Total: {formatCurrency(salesTotal)}</span>
                {!isAdmin && <span className="text-xs text-muted-foreground">Somente admin pode excluir vendas</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Venda</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Caixa</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma venda no período
                      </TableCell>
                    </TableRow>
                  ) : salesList.map((sale) => (
                    <>
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                        <TableCell className="text-sm">{fmtDate(sale.created_at)}</TableCell>
                        <TableCell className="text-sm">{sale.cashier_name || '—'}</TableCell>
                        <TableCell className="text-sm">{sale.customer_name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{paymentLabel[sale.payment_method] || sale.payment_method}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                              className="h-8 w-8"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => { setDeletingId(sale.id); setDeleteReason(''); }}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedSale === sale.id && (
                        <TableRow key={`${sale.id}-items`}>
                          <TableCell colSpan={7} className="bg-muted/30 px-8 py-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Itens da venda:</p>
                            <div className="space-y-1">
                              {(sale.items || []).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span>{item.product_name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                                  <span>{formatCurrency(item.total)}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3 — Audit log */}
        {isAdmin && (
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Vendas Excluídas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Venda</TableHead>
                      <TableHead>Data Original</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Excluído por</TableHead>
                      <TableHead>Data Exclusão</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma exclusão registrada
                        </TableCell>
                      </TableRow>
                    ) : deletedSales.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-sm">{row.sale_number || '—'}</TableCell>
                        <TableCell className="text-sm">{fmtDate(row.original_created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{paymentLabel[row.payment_method] || row.payment_method || '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          -{formatCurrency(row.total)}
                        </TableCell>
                        <TableCell className="text-sm">{row.deleted_by_name || '—'}</TableCell>
                        <TableCell className="text-sm">{fmtDate(row.deleted_at)}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={row.reason}>
                          {row.reason || <span className="text-muted-foreground">Sem motivo</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={!!deletingId} onOpenChange={open => { if (!open) { setDeletingId(null); setDeleteReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Excluir Venda
            </DialogTitle>
            <DialogDescription>
              Esta ação <strong>não pode ser desfeita</strong>. O estoque será revertido e os totais do caixa
              serão recalculados. Um registro de auditoria será criado.
              {saleToDelete && (
                <span className="block mt-2 font-medium text-foreground">
                  Venda: <span className="font-mono">{saleToDelete.sale_number}</span> — {formatCurrency(saleToDelete.total)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-reason">Motivo da exclusão *</Label>
            <Textarea
              id="delete-reason"
              placeholder="Informe o motivo (obrigatório)..."
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletingId(null); setDeleteReason(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading || !deleteReason.trim()}
            >
              {deleteLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
}
