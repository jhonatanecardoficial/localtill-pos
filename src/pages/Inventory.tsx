import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  ArrowRightLeft
} from 'lucide-react';
import { api, getImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InventoryItem {
  id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
  min_stock: number;
  max_stock: number | null;
  product_name: string;
  sku: string;
  barcode: string | null;
  sale_price: number;
  cost_price: number;
  category_name: string | null;
  branch_name: string;
  unit?: string;
  image_url?: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  created_at: string;
  notes: string | null;
  product_name: string;
  sku: string;
  branch_name: string;
  user_name: string;
}

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [movementData, setMovementData] = useState({
    product_id: '',
    branch_id: '',
    movement_type: 'in',
    quantity: '',
    notes: '',
  });

  const [adjustData, setAdjustData] = useState({
    quantity: '',
    min_stock: '',
    max_stock: '',
  });

  const [transferData, setTransferData] = useState({
    product_id: '',
    from_branch_id: '',
    to_branch_id: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => {
      controller.abort();
    };
  }, [selectedBranch]);

  useEffect(() => {
    // Check for low stock items on load
    if (inventory.length > 0) {
      const lowStock = inventory.filter(item => item.quantity <= item.min_stock);
      if (lowStock.length > 0) {
        setShowLowStockAlert(true);
      }
    }
  }, [inventory]);

  const fetchData = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      // Fetch branches first to check if we can proceed
      const branchesList = await api.get<Branch[]>('/branches', { is_active: true });
      const branchesArr = Array.isArray(branchesList) ? branchesList : [];

      setBranches(branchesArr);

      // If no branches, stop here to avoid errors in other fetches
      if (branchesArr.length === 0) {
        return;
      }

      // Fetch other data only if we have branches
      await Promise.all([
        fetchInventory(signal),
        fetchProducts(signal),
        fetchMovements(signal),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Don't show generic error if it's just empty data
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (signal?: AbortSignal) => {
    try {
      const params: any = {};
      if (selectedBranch !== 'all') {
        params.branch_id = selectedBranch;
      }

      const data = await api.get<InventoryItem[]>('/inventory', params);
      setInventory(Array.isArray(data) ? data : []);
    } catch (error) {
      if ((error as any)?.name === 'AbortError') return;
      console.error('Error fetching inventory:', error);
      toast.error('Erro ao carregar estoque');
    }
  };



  const fetchProducts = async (signal?: AbortSignal) => {
    try {
      const data = await api.get<Product[]>('/products', { is_active: true });
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      if ((error as any)?.name === 'AbortError') return;
      console.error('Error fetching products:', error);
    }
  };

  const fetchMovements = async (signal?: AbortSignal) => {
    try {
      const params: any = { limit: 20 };
      if (selectedBranch !== 'all') {
        params.branch_id = selectedBranch;
      }

      const data = await api.get<Movement[]>('/inventory/movements', params);
      setMovements(Array.isArray(data) ? data : []);
    } catch (error) {
      if ((error as any)?.name === 'AbortError') return;
      console.error('Error fetching movements:', error);
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const quantity = parseInt(movementData.quantity);
      if (quantity <= 0) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }

      // Create movement record (Backend handles inventory update)
      await api.post('/inventory/movement', {
        product_id: movementData.product_id,
        branch_id: movementData.branch_id,
        movement_type: movementData.movement_type,
        quantity,
        notes: movementData.notes || undefined,
      });

      toast.success('Movimentação registrada com sucesso!');
      setShowMovementDialog(false);
      resetMovementForm();
      fetchData();
    } catch (error) {
      console.error('Error creating movement:', error);
      toast.error('Erro ao registrar movimentação');
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      await api.put(`/inventory/${selectedItem.id}`, {
        quantity: parseInt(adjustData.quantity),
        min_stock: parseInt(adjustData.min_stock),
        max_stock: adjustData.max_stock ? parseInt(adjustData.max_stock) : null,
      });



      toast.success('Estoque ajustado com sucesso!');
      setShowAdjustDialog(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error('Erro ao ajustar estoque');
    }
  };

  const openAdjustDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustData({
      quantity: item.quantity.toString(),
      min_stock: item.min_stock.toString(),
      max_stock: item.max_stock?.toString() || '',
    });
    setShowAdjustDialog(true);
  };

  const resetMovementForm = () => {
    setMovementData({
      product_id: '',
      branch_id: '',
      movement_type: 'in',
      quantity: '',
      notes: '',
    });
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const quantity = parseInt(transferData.quantity);
      if (quantity <= 0) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }

      // Create movement for source (out - saída)
      await api.post('/inventory/movement', {
        product_id: transferData.product_id,
        branch_id: transferData.from_branch_id,
        movement_type: 'out',
        quantity: quantity,
        notes: `Transferência para outra filial. ${transferData.notes}`,
      });

      // Create movement for destination (in - entrada)
      await api.post('/inventory/movement', {
        product_id: transferData.product_id,
        branch_id: transferData.to_branch_id,
        movement_type: 'in',
        quantity: quantity,
        notes: `Transferência de outra filial. ${transferData.notes}`,
      });

      toast.success('Transferência realizada com sucesso!');
      setShowTransferDialog(false);
      resetTransferForm();
      fetchData();
    } catch (error) {
      console.error('Error transferring:', error);
      toast.error('Erro ao realizar transferência');
    }
  };

  const resetTransferForm = () => {
    setTransferData({
      product_id: '',
      from_branch_id: '',
      to_branch_id: '',
      quantity: '',
      notes: '',
    });
  };

  const filteredInventory = inventory.filter(item =>
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = filteredInventory.filter(item => item.quantity <= item.min_stock);
  const totalValue = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);

  // Show loading state while branches are loading
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Only show empty state if loading is complete AND no branches
  if (branches.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-muted/10 p-8 text-center">
          <div className="bg-background p-8 rounded-lg shadow-lg max-w-md w-full border">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma Filial Encontrada</h2>
            <p className="text-muted-foreground mb-6">
              Para gerenciar o estoque, você precisa criar sua primeira filial.
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => window.location.href = '/settings'}
            >
              Criar Filial
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Estoque</h1>
            <p className="text-muted-foreground mt-1">Controle de inventário por filial</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowTransferDialog(true)}
              variant="outline"
              className="gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transferir
            </Button>
            <Button onClick={() => setShowMovementDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Movimentação
            </Button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && showLowStockAlert && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    Atenção: {lowStockItems.length} {lowStockItems.length === 1 ? 'produto está' : 'produtos estão'} com estoque baixo
                  </h3>
                  <div className="space-y-1 text-sm">
                    {lowStockItems.slice(0, 3).map(item => (
                      <p key={item.id} className="text-muted-foreground">
                        • {item.product_name || 'Produto'} ({item.branch_name || 'Filial'}): {item.quantity} {item.unit || 'un'} (mín: {item.min_stock})
                      </p>
                    ))}
                    {lowStockItems.length > 3 && (
                      <p className="text-muted-foreground">
                        ... e mais {lowStockItems.length - 3} {lowStockItems.length - 3 === 1 ? 'produto' : 'produtos'}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLowStockAlert(false)}
                >
                  Dispensar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Itens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{filteredInventory.length}</span>
                <Package className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quantidade Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{totalValue}</span>
                <TrendingUp className="w-8 h-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-warning">{lowStockItems.length}</span>
                <AlertTriangle className="w-8 h-8 text-warning opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Filiais Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{branches.length}</span>
                <TrendingDown className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todas as filiais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as filiais</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventário</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Estoque Mín.</TableHead>
                    <TableHead className="text-right">Estoque Máx.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={getImageUrl(item.image_url)}
                              alt={item.product_name || 'Produto'}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{item.product_name || 'Produto sem nome'}</div>
                            <div className="text-sm text-muted-foreground">{item.sku || 'N/A'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.branch_name || 'Filial'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.quantity} {item.unit || 'un'}
                      </TableCell>
                      <TableCell className="text-right">{item.min_stock}</TableCell>
                      <TableCell className="text-right">{item.max_stock || '-'}</TableCell>
                      <TableCell>
                        {item.quantity <= item.min_stock ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-warning/10 text-warning">
                            Baixo
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-success/10 text-success">
                            Normal
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjustDialog(item)}
                        >
                          Ajustar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{movement.product_name || 'Produto Removido'}</div>
                        <div className="text-sm text-muted-foreground">{movement.sku || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{movement.branch_name || 'Filial Removida'}</TableCell>
                    <TableCell>
                      {movement.movement_type === 'in' ? (
                        <span className="flex items-center gap-1 text-success">
                          <Plus className="w-4 h-4" /> Entrada
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive">
                          <Minus className="w-4 h-4" /> Saída
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {movement.quantity}
                    </TableCell>
                    <TableCell>
                      {new Date(movement.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
            <DialogDescription>
              Registre entrada ou saída de produtos do estoque
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMovement}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select
                  value={movementData.product_id}
                  onValueChange={(value) => setMovementData({ ...movementData, product_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filial *</Label>
                <Select
                  value={movementData.branch_id}
                  onValueChange={(value) => setMovementData({ ...movementData, branch_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a filial" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={movementData.movement_type}
                    onValueChange={(value) => setMovementData({ ...movementData, movement_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={movementData.quantity}
                    onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={movementData.notes}
                  onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                  rows={3}
                  placeholder="Motivo da movimentação..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowMovementDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transferir Estoque</DialogTitle>
            <DialogDescription>
              Transfira produtos entre filiais
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select
                  value={transferData.product_id}
                  onValueChange={(value) => setTransferData({ ...transferData, product_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>De (Filial Origem) *</Label>
                  <Select
                    value={transferData.from_branch_id}
                    onValueChange={(value) => setTransferData({ ...transferData, from_branch_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem
                          key={branch.id}
                          value={branch.id}
                          disabled={branch.id === transferData.to_branch_id}
                        >
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Para (Filial Destino) *</Label>
                  <Select
                    value={transferData.to_branch_id}
                    onValueChange={(value) => setTransferData({ ...transferData, to_branch_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem
                          key={branch.id}
                          value={branch.id}
                          disabled={branch.id === transferData.from_branch_id}
                        >
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer_quantity">Quantidade *</Label>
                <Input
                  id="transfer_quantity"
                  type="number"
                  min="1"
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer_notes">Observações</Label>
                <Textarea
                  id="transfer_notes"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  rows={3}
                  placeholder="Motivo da transferência..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Transferir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="sm:max-w-[400px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
            <DialogDescription>
              {selectedItem && `${selectedItem.product_name || 'Produto'} - ${selectedItem.branch_name || 'Filial'}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjust}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adjust_quantity">Quantidade Atual *</Label>
                <Input
                  id="adjust_quantity"
                  type="number"
                  min="0"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjust_min_stock">Estoque Mínimo *</Label>
                <Input
                  id="adjust_min_stock"
                  type="number"
                  min="0"
                  value={adjustData.min_stock}
                  onChange={(e) => setAdjustData({ ...adjustData, min_stock: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjust_max_stock">Estoque Máximo</Label>
                <Input
                  id="adjust_max_stock"
                  type="number"
                  min="0"
                  value={adjustData.max_stock}
                  onChange={(e) => setAdjustData({ ...adjustData, max_stock: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdjustDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Inventory;
