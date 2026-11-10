import { LowStockAlert } from '@/components/LowStockAlert';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingBag, Package, AlertCircle } from 'lucide-react';

interface Stats {
  totalSales: number;
  salesCount: number;
  productsCount: number;
  lowStockCount: number;
}

interface RecentSale {
  id: string;
  sale_number: string;
  total: number;
  created_at: string;
  customer_name: string | null;
}

interface TopProduct {
  product_id: string;
  name: string;
  sku: string;
  total_quantity: number;
  total_revenue: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    salesCount: 0,
    productsCount: 0,
    lowStockCount: 0,
  });
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const { formatCurrency, locale } = useCurrency();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Datas para filtro
        const today = new Date();
        const startDate = new Date();
        const daysAgo = viewMode === 'week' ? 7 : 30;
        startDate.setDate(today.getDate() - daysAgo);

        // 1. Resumo de vendas (Receita total e quantidade)
        // Nota: O endpoint sales-summary retorna totais globais se não passar data, ou filtrados se passar.
        // O Dashboard original mostrava totais GERAIS nos cards, e gráfico filtrado.
        // Vamos buscar totais gerais para os cards.
        const summary = await api.get('/reports/sales-summary');

        // 2. Contagem de produtos ativos
        const products = await api.get('/products', { active_only: true });

        // 3. Estoque baixo
        const lowStock = await api.get('/reports/low-stock');

        setStats({
          totalSales: Number(summary.total_revenue || 0),
          salesCount: Number(summary.total_sales || 0),
          productsCount: products.length || 0,
          lowStockCount: lowStock.length || 0,
        });

        // 4. Vendas Recentes
        const recent = await api.get('/sales', { limit: 5 });
        setRecentSales(Array.isArray(recent) ? recent : []);

        // 5. Produtos Mais Vendidos (Geral por enquanto, ou filtrado por data se preferir)
        const top = await api.get('/reports/top-products', { limit: 5 });
        setTopProducts(Array.isArray(top) ? top : []);

        // 6. Gráfico de Vendas (Diário)
        const daily = await api.get('/reports/daily-sales', {
          start_date: startDate.toISOString(),
          end_date: today.toISOString()
        });

        // Formatar para o gráfico
        const dailyArr = Array.isArray(daily) ? daily : [];
        const chartData = dailyArr.map((d: any) => ({
          date: new Date(d.date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
          total: Number(d.total_revenue),
          count: Number(d.sales_count)
        }));

        setSalesChart(chartData);

      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [viewMode, user, locale]);

  const statCards = [
    {
      title: 'Total de Vendas',
      value: formatCurrency(stats.totalSales),
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Vendas Realizadas',
      value: stats.salesCount,
      icon: ShoppingBag,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Produtos Ativos',
      value: stats.productsCount,
      icon: Package,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Estoque Baixo',
      value: stats.lowStockCount,
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo de volta, {user?.full_name || user?.email}
          </p>
        </div>

        <LowStockAlert />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-10 w-10 bg-muted rounded-xl"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="shadow-card transition-base hover:shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.bgColor} p-2 rounded-xl`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Evolução de Vendas</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  onClick={() => setViewMode('week')}
                >
                  Semanal
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  onClick={() => setViewMode('month')}
                >
                  Mensal
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Total de Vendas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Vendas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSales.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma venda registrada ainda
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium text-foreground">
                          {sale.sale_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sale.customer_name || 'Cliente não identificado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.created_at).toLocaleString(locale)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">
                          {formatCurrency(sale.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Nenhum dado disponível
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.product_id} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {product.name || 'Produto'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {product.total_quantity} unidades vendidas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">
                          {formatCurrency(product.total_revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
