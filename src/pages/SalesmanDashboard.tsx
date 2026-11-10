import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from "@/lib/api";
import { toast } from 'sonner';
import { Trophy, Target, TrendingUp, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/contexts/CurrencyContext';

interface SalesmanPerformance {
  user_id: string;
  cashier_name: string;
  total_sales: number;
  sales_count: number;
  target_amount: number;
  achievement_percentage: number;
}

const SalesmanDashboard = () => {
  const [performance, setPerformance] = useState<SalesmanPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      // Get sales for current month
      const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

      const salesData = await api.get<any[]>('/sales', {
        start_date: startDate,
        end_date: endDate,
        select: 'cashier_id,total' // Hint to backend if supported, otherwise it gets all
      });

      // Get targets for current month
      const targetsData = await api.get<any[]>('/sales/targets', {
        month: currentMonth,
        year: currentYear
      });

      // Get cashier names
      const profilesData = await api.get<any[]>('/users');

      // Aggregate sales by cashier
      const salesByUser = new Map<string, { total: number; count: number }>();

      salesData?.forEach((sale) => {
        if (!salesByUser.has(sale.cashier_id)) {
          salesByUser.set(sale.cashier_id, { total: 0, count: 0 });
        }
        const existing = salesByUser.get(sale.cashier_id)!;
        existing.total += Number(sale.total);
        existing.count += 1;
      });

      // Combine with targets and profiles
      const performanceData: SalesmanPerformance[] = [];

      salesByUser.forEach((sales, userId) => {
        const target = targetsData?.find(t => t.user_id === userId);
        const profile = profilesData?.find(p => p.id === userId);
        const targetAmount = target?.target_amount || 0;

        performanceData.push({
          user_id: userId,
          cashier_name: profile?.full_name || 'Usuário',
          total_sales: sales.total,
          sales_count: sales.count,
          target_amount: targetAmount,
          achievement_percentage: targetAmount > 0 ? (sales.total / targetAmount) * 100 : 0,
        });
      });

      // Sort by total sales descending
      performanceData.sort((a, b) => b.total_sales - a.total_sales);

      setPerformance(performanceData);
    } catch (error) {
      toast.error('Erro ao carregar dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const topPerformer = performance[0];
  const totalSales = performance.reduce((sum, p) => sum + p.total_sales, 0);
  const totalTransactions = performance.reduce((sum, p) => sum + p.sales_count, 0);

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Dashboard de Vendedores</h1>
          <p className="text-muted-foreground mt-1">
            Performance do mês: {currentMonth}/{currentYear}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Top Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {topPerformer?.cashier_name || '-'}
              </div>
              <div className="text-sm text-muted-foreground">
                {topPerformer ? formatCurrency(topPerformer.total_sales) : '-'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Vendas Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {formatCurrency(totalSales)}
              </div>
              <div className="text-sm text-muted-foreground">
                {totalTransactions} transações
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Vendedores Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {performance.length}
              </div>
              <div className="text-sm text-muted-foreground">
                neste período
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ranking de Vendedores</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Posição</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Transações</TableHead>
                <TableHead className="text-right">Total Vendas</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead>Atingimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : performance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma venda registrada no período
                  </TableCell>
                </TableRow>
              ) : (
                performance.map((salesman, index) => (
                  <TableRow key={salesman.user_id}>
                    <TableCell className="font-bold">
                      {index === 0 ? (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      ) : (
                        `${index + 1}º`
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{salesman.cashier_name}</TableCell>
                    <TableCell className="text-right">{salesman.sales_count}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(salesman.total_sales)}
                    </TableCell>
                    <TableCell className="text-right">
                      {salesman.target_amount > 0 ? formatCurrency(salesman.target_amount) : '-'}
                    </TableCell>
                    <TableCell>
                      {salesman.target_amount > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {salesman.achievement_percentage.toFixed(1)}%
                            </span>
                            {salesman.achievement_percentage >= 100 && (
                              <Target className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <Progress
                            value={Math.min(salesman.achievement_percentage, 100)}
                            className="h-2"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem meta</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SalesmanDashboard;
