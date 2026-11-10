import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface LowStockItem {
  id: string;
  product_name: string;
  quantity: number;
  min_stock: number;
  branch_name: string;
}

export const LowStockAlert = () => {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  useEffect(() => {
    fetchLowStockItems();

    // Poll every minute instead of realtime
    const interval = setInterval(fetchLowStockItems, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchLowStockItems = async () => {
    try {
      // Use the dedicated report endpoint which is already efficient
      const data = await api.get<any[]>('/reports/low-stock');
      const dataArr = Array.isArray(data) ? data : [];

      const formattedData: LowStockItem[] = dataArr.map(item => ({
        id: item.id,
        product_name: item.name || item.product_name || 'Produto', // Endpoint might return differently
        quantity: item.quantity,
        min_stock: item.min_stock,
        branch_name: item.branch_name || 'Filial',
      }));

      // Show toast for new low stock items if list grew
      if (formattedData.length > lowStockItems.length && lowStockItems.length > 0) {
        const newItems = formattedData.filter(
          item => !lowStockItems.find(existing => existing.id === item.id)
        );

        newItems.forEach(item => {
          toast.warning(`Estoque baixo: ${item.product_name} em ${item.branch_name}`, {
            description: `Quantidade atual: ${item.quantity} (mínimo: ${item.min_stock})`
          });
        });
      }

      setLowStockItems(formattedData);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
    }
  };

  if (lowStockItems.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Alerta de Estoque Baixo</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          {lowStockItems.slice(0, 5).map((item) => (
            <div key={item.id} className="text-sm">
              <span className="font-semibold">{item.product_name}</span> em{' '}
              <span className="font-semibold">{item.branch_name}</span>: {item.quantity} unidades
              (mínimo: {item.min_stock})
            </div>
          ))}
          {lowStockItems.length > 5 && (
            <div className="text-sm font-semibold mt-2">
              + {lowStockItems.length - 5} outros produtos com estoque baixo
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
