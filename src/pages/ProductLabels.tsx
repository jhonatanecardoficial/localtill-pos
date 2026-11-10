import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Printer, Tag } from 'lucide-react';
import { api } from "@/lib/api";
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import Barcode from 'react-barcode';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Product {
  id: string;
  sku: string;
  name: string;
  sale_price: number;
  barcode: string | null;
}

const ProductLabels = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await api.get<Product[]>('/products', { active: true });
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    const filtered = filteredProducts.map(p => p.id);
    setSelectedProducts(new Set(filtered));
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const handlePrint = () => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiquetas de Produtos</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            .label-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
            }
            .label {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: center;
              page-break-inside: avoid;
            }
            .label h3 {
              margin: 0 0 5px 0;
              font-size: 14px;
              font-weight: bold;
            }
            .label .price {
              font-size: 18px;
              font-weight: bold;
              margin: 5px 0;
            }
            .label .sku {
              font-size: 11px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
              .label-grid { gap: 5px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProductsList = products.filter(p => selectedProducts.has(p.id));

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Etiquetas de Produtos</h1>
            <p className="text-muted-foreground mt-1">
              Selecione produtos para imprimir etiquetas com código de barras
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearSelection} disabled={selectedProducts.size === 0}>
              Limpar Seleção
            </Button>
            <Button onClick={handlePrint} disabled={selectedProducts.size === 0}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir ({selectedProducts.size})
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={selectAll}>
            Selecionar Todos ({filteredProducts.length})
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando produtos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={`cursor-pointer transition-all ${selectedProducts.has(product.id) ? 'ring-2 ring-primary' : ''
                  }`}
                onClick={() => toggleProduct(product.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => toggleProduct(product.id)}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    <p className="text-lg font-bold text-primary mt-1">
                      {formatCurrency(product.sale_price)}
                    </p>
                    {product.barcode && (
                      <p className="text-xs text-muted-foreground">
                        Código de barras: {product.barcode}
                      </p>
                    )}
                  </div>
                  <Tag className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Hidden print content */}
        <div ref={printRef} style={{ display: 'none' }}>
          <div className="label-grid">
            {selectedProductsList.map((product) => (
              <div key={product.id} className="label">
                <h3>{product.name}</h3>
                <div className="sku">SKU: {product.sku}</div>
                {product.barcode ? (
                  <Barcode
                    value={product.barcode}
                    height={50}
                    width={1.5}
                    fontSize={12}
                    margin={5}
                  />
                ) : (
                  <Barcode
                    value={product.sku}
                    height={50}
                    width={1.5}
                    fontSize={12}
                    margin={5}
                  />
                )}
                <div className="price">
                  {formatCurrency(product.sale_price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductLabels;
