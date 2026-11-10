import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from "@/lib/api";
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/contexts/CurrencyContext';

interface OperatorStats {
  cashier_id: string;
  cashier_name: string;
  total_sales: number;
  total_revenue: number;
  transaction_count: number;
  avg_ticket: number;
}

const OperatorPerformance = () => {
  const [stats, setStats] = useState<OperatorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    endDate: new Date().toISOString().split('T')[0],
  });
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchOperatorStats();
  }, [filters]);

  const fetchOperatorStats = async () => {
    setLoading(true);
    try {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      // Fetch sales
      const sales = await api.get<any[]>('/sales', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        select: 'cashier_id,total'
      });

      // Fetch users for names (since we can't join easily via simple API proxy without dedicated endpoint)
      const users = await api.get<any[]>('/users');
      const userMap = new Map(users?.map(u => [u.id, u.full_name]) || []);

      // Group by cashier
      const statsMap = new Map<string, OperatorStats>();

      sales?.forEach((sale: any) => {
        const cashierId = sale.cashier_id;
        const cashierName = userMap.get(cashierId) || 'Sem nome';

        if (!statsMap.has(cashierId)) {
          statsMap.set(cashierId, {
            cashier_id: cashierId,
            cashier_name: cashierName,
            total_sales: 0,
            total_revenue: 0,
            transaction_count: 0,
            avg_ticket: 0,
          });
        }

        const stat = statsMap.get(cashierId)!;
        stat.total_revenue += Number(sale.total);
        stat.transaction_count += 1;
      });

      // Calculate averages and convert to array
      const statsArray = Array.from(statsMap.values()).map(stat => ({
        ...stat,
        avg_ticket: stat.total_revenue / stat.transaction_count,
      }));

      // Sort by revenue descending
      statsArray.sort((a, b) => b.total_revenue - a.total_revenue);

      setStats(statsArray);
    } catch (error) {
      console.error('Error fetching operator stats:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const topOperator = stats[0];
  const totalRevenue = stats.reduce((sum, s) => sum + s.total_revenue, 0);
  const totalTransactions = stats.reduce((sum, s) => sum + s.transaction_count, 0);

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance por Operador</h1>
          <p className="text-muted-foreground mt-1">Acompanhe o desempenho de vendas de cada operador</p>
        </div>

        {/* Date Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Melhor Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{topOperator?.cashier_name || '-'}</p>
                  <p className="text-xs text-muted-foreground">
                    {topOperator ? formatCurrency(topOperator.total_revenue) : '-'}
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Operadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats.length}</span>
                <TrendingUp className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {formatCurrency(totalRevenue)}
                </span>
                <DollarSign className="w-8 h-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{totalTransactions}</span>
                <ShoppingBag className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Operadores</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : stats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma venda encontrada no período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Posição</TableHead>
                      <TableHead>Operador</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((stat, index) => (
                      <TableRow key={stat.cashier_id}>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {index === 0 && <Trophy className="w-5 h-5 text-warning mr-1" />}
                            <span className="font-bold">{index + 1}º</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{stat.cashier_name}</TableCell>
                        <TableCell className="text-right">{stat.transaction_count}</TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          {formatCurrency(stat.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(stat.avg_ticket)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-primary">
                            {((stat.total_revenue / totalRevenue) * 100).toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default OperatorPerformance;
