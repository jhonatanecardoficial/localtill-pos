import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trash2,
  AlertTriangle,
  History,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useActiveBranch } from "@/hooks/useActiveBranch";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  created_at: string;
  notes: string | null;
  product_name: string;
  product_sku: string;
  branch_name: string;
  profile_name: string;
  customer_name: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface CashRegister {
  id: string;
  shift_name: string;
  operator_id: string;
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
  notes: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
  total_mb_way?: number;
  total_multibanco?: number;
  total_additions?: number;
  total_withdrawals?: number;
}

interface Operator {
  id: string;
  full_name: string;
  email: string;
}

interface Shift {
  id: string;
  name: string;
}

const Reports = () => {
  const [activeTab, setActiveTab] = useState("inventory");
  const { formatCurrency, locale } = useCurrency();
  const { userRoles } = useAuth();
  const canDelete = userRoles.includes('admin') || userRoles.includes('manager');

  // Inventory states
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [inventoryFilters, setInventoryFilters] = useState({
    startDate: "",
    endDate: "",
    productId: "all",
    movementType: "all",
  });

  // Inventory delete + audit states
  const [deletingMovId, setDeletingMovId] = useState<string | null>(null);
  const [deleteMovReason, setDeleteMovReason] = useState('');
  const [deleteMovLoading, setDeleteMovLoading] = useState(false);
  const [deletedMovements, setDeletedMovements] = useState<any[]>([]);
  const [inventorySubTab, setInventorySubTab] = useState('movements');

  // Cash register states
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingCash, setLoadingCash] = useState(true);
  const [cashFilters, setCashFilters] = useState({
    startDate: "",
    endDate: "",
    operatorId: "all",
    shiftId: "all",
    status: "all",
  });

  const activeBranchData = useActiveBranch();
  const branches = activeBranchData?.branches || [];
  const branchesLoading = activeBranchData?.loading || false;



  const fetchDeletedMovements = useCallback(async () => {
    try {
      const rows = await api.get<any[]>('/inventory/movements/deleted', { limit: '200' });
      setDeletedMovements(Array.isArray(rows) ? rows : []);
    } catch { /* silent */ }
  }, []);

  const handleDeleteMovement = async () => {
    if (!deletingMovId || !deleteMovReason.trim()) {
      toast.error('Informe o motivo da exclusão');
      return;
    }
    setDeleteMovLoading(true);
    try {
      await api.delete(`/inventory/movements/${deletingMovId}`, { reason: deleteMovReason });
      toast.success('Movimentação excluída e auditoria registrada');
      setDeletingMovId(null);
      setDeleteMovReason('');
      await fetchMovements();
      await fetchDeletedMovements();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir movimentação');
    } finally {
      setDeleteMovLoading(false);
    }
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.get<Product[]>("/products", { is_active: true });
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any)?.name === "AbortError") return;
      console.error("Error fetching products:", error);
    }
  }, []);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fetchMovements = useCallback(async (signal?: AbortSignal) => {
    setLoadingInventory(true);
    try {
      const params: Record<string, string | number> = { limit: '1000' }; // Reasonable limit for reports

      if (inventoryFilters.startDate) params.start_date = inventoryFilters.startDate;
      if (inventoryFilters.endDate) {
        const endDate = new Date(inventoryFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        params.end_date = endDate.toISOString();
      }
      if (inventoryFilters.productId !== "all") params.product_id = inventoryFilters.productId;
      if (inventoryFilters.movementType !== "all") params.movement_type = inventoryFilters.movementType;

      const rows = await api.get<any[]>('/inventory/movements', params);
      const rowsArr = Array.isArray(rows) ? rows : [];

      const formatted: Movement[] = rowsArr.map((r) => ({
        id: r.id,
        movement_type: r.movement_type,
        quantity: r.quantity,
        created_at: r.created_at,
        notes: r.notes,
        product_name: r.product_name || "Produto",
        product_sku: r.sku || "N/A",
        branch_name: r.branch_name || "Filial",
        profile_name: r.user_name || "N/A",
        customer_name: r.customer_name || null,
      }));

      setMovements(formatted);
    } catch (error) {
      if ((error as any)?.name === "AbortError") return;
      console.error("Error fetching movements:", error);
      toast.error("Erro ao carregar movimentações");
    } finally {
      setLoadingInventory(false);
    }
  }, [inventoryFilters]);

  const fetchOperators = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.get<Operator[]>('/users');
      setOperators(Array.isArray(data) ? data : []);
    } catch (error) {
      if ((error as any)?.name === "AbortError") return;
      console.error("Error fetching operators:", error);
    }
  }, []);

  const fetchShifts = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.get<Shift[]>('/shifts', { is_active: true });
      setShifts(Array.isArray(data) ? data : []);
    } catch (error) {
      if ((error as any)?.name === "AbortError") return;
      console.error("Error fetching shifts:", error);
    }
  }, []);

  const fetchCashRegisters = useCallback(async (signal?: AbortSignal) => {
    setLoadingCash(true);
    try {
      const params: Record<string, string | number> = {};

      if (cashFilters.startDate) params.start_date = cashFilters.startDate;
      if (cashFilters.endDate) {
        const endDate = new Date(cashFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        params.end_date = endDate.toISOString();
      }
      if (cashFilters.operatorId !== "all") params.operator_id = cashFilters.operatorId;
      if (cashFilters.shiftId !== "all") params.shift_id = cashFilters.shiftId;
      if (cashFilters.status !== "all") params.status = cashFilters.status;

      const data = await api.get<any[]>('/reports/cash-registers', params);
      const dataArr = Array.isArray(data) ? data : [];

      const formattedData = dataArr.map((cr) => ({
        ...cr,
        profiles: { full_name: cr.operator_name, email: '' }, // Adapter for interface
        total_mb_way: parseFloat(cr.total_mb_way || 0),
        total_multibanco: parseFloat(cr.total_multibanco || 0),
        total_additions: parseFloat(cr.total_additions || 0),
        total_withdrawals: parseFloat(cr.total_withdrawals || 0),
        total_sales: parseFloat(cr.total_sales || 0), // Ensure numbers
        total_cash: parseFloat(cr.total_cash || 0),
        total_debit: parseFloat(cr.total_debit || 0),
        total_credit: parseFloat(cr.total_credit || 0),
        total_pix: parseFloat(cr.total_pix || 0),
        total_other: parseFloat(cr.total_other || 0),
        opening_amount: parseFloat(cr.opening_amount || 0),
        closing_amount_counted: cr.closing_amount_counted ? parseFloat(cr.closing_amount_counted) : null,
        difference: cr.difference ? parseFloat(cr.difference) : null,
      }));

      setCashRegisters(formattedData);
    } catch (error) {
      if ((error as any)?.name === "AbortError") return;
      console.error("Error fetching cash registers:", error);
      toast.error("Erro ao carregar registros de caixa");
    } finally {
      setLoadingCash(false);
    }
  }, [cashFilters]);
  /* eslint-enable @typescript-eslint/no-explicit-any */



  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    fetchOperators(controller.signal);
    fetchShifts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts, fetchOperators, fetchShifts]);

  useEffect(() => {
    if (branchesLoading) return;
    if (branches.length === 0) return;
    const controller = new AbortController();
    if (activeTab === "inventory") {
      fetchMovements(controller.signal);
    } else if (activeTab === "cash") {
      fetchCashRegisters(controller.signal);
    }
    return () => controller.abort();
  }, [
    activeTab,
    inventoryFilters,
    cashFilters,
    branchesLoading,
    branches.length,
    fetchProducts,
    fetchOperators,
    fetchShifts,
    fetchMovements,
    fetchCashRegisters
  ]);

  const exportInventoryToCSV = () => {
    if (movements.length === 0) {
      toast.error("Nenhuma movimentação para exportar");
      return;
    }

    const headers = [
      "Data",
      "Tipo",
      "Produto",
      "SKU",
      "Filial",
      "Vendedor",
      "Cliente",
      "Quantidade",
      "Observações",
    ];
    const csvData = movements.map((m) => [
      new Date(m.created_at).toLocaleString("pt-BR"),
      m.movement_type === "in"
        ? "Entrada"
        : m.movement_type === "out"
          ? "Saída"
          : "Transferência",
      m.product_name || "Produto",
      m.product_sku || "N/A",
      m.branch_name || "Filial",
      m.profile_name || "N/A",
      m.customer_name || "-",
      m.quantity.toString(),
      m.notes || "",
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `movimentacoes_${new Date().toISOString().split("T")[0]
      }.csv`;
    link.click();
    toast.success("Relatório exportado com sucesso!");
  };

  const exportCashToCSV = () => {
    if (cashRegisters.length === 0) {
      toast.error("Nenhum registro de caixa para exportar");
      return;
    }

    const headers = [
      "Data Abertura",
      "Data Fechamento",
      "Turno",
      "Operador",
      "Status",
      "Abertura",
      "Total Vendas",
      "Dinheiro",
      "Débito",
      "Crédito",
      "PIX",
      "MB Way",
      "Multibanco",
      "Outros",
      "Troco Adicionado",
      "Sangria",
      "Fechamento Contado",
      "Diferença",
      "Observações",
    ];

    const csvData = cashRegisters.map((cr) => [
      new Date(cr.opened_at).toLocaleString("pt-BR"),
      cr.closed_at
        ? new Date(cr.closed_at).toLocaleString("pt-BR")
        : "Em aberto",
      cr.shift_name,
      cr.profiles?.full_name || "Operador",
      cr.status,
      cr.opening_amount.toFixed(2),
      cr.total_sales.toFixed(2),
      cr.total_cash.toFixed(2),
      cr.total_debit.toFixed(2),
      cr.total_credit.toFixed(2),
      cr.total_pix.toFixed(2),
      (cr.total_mb_way || 0).toFixed(2),
      (cr.total_multibanco || 0).toFixed(2),
      cr.total_other.toFixed(2),
      (cr.total_additions || 0).toFixed(2),
      (cr.total_withdrawals || 0).toFixed(2),
      cr.closing_amount_counted ? cr.closing_amount_counted.toFixed(2) : "",
      cr.difference ? cr.difference.toFixed(2) : "",
      cr.notes || "",
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fechamentos_caixa_${new Date().toISOString().split("T")[0]
      }.csv`;
    link.click();
    toast.success("Relatório exportado com sucesso!");
  };

  const clearInventoryFilters = () => {
    setInventoryFilters({
      startDate: "",
      endDate: "",
      productId: "all",
      movementType: "all",
    });
  };

  const clearCashFilters = () => {
    setCashFilters({
      startDate: "",
      endDate: "",
      operatorId: "all",
      shiftId: "all",
      status: "CLOSED",
    });
  };

  const totalIn = movements
    .filter((m) => m.movement_type === "in")
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalOut = movements
    .filter((m) => m.movement_type === "out")
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalSalesSum = cashRegisters.reduce(
    (sum, cr) => sum + cr.total_sales,
    0
  );
  const totalDifferenceSum = cashRegisters.reduce(
    (sum, cr) => sum + (cr.difference || 0),
    0
  );
  const closedRegisters = cashRegisters.filter(
    (cr) => cr.status === "CLOSED"
  ).length;

  // Show loading state while branches are loading
  if (branchesLoading) {
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
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Nenhuma Filial Encontrada
            </h2>
            <p className="text-muted-foreground mb-6">
              Para visualizar relatórios, você precisa criar sua primeira
              filial.
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => (window.location.href = "/settings")}
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
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl lg:text-3xl font-bold">Relatórios</h1>
        </div>

        <Tabs
          defaultValue="inventory"
          className="space-y-6"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="w-full lg:w-auto flex">
            <TabsTrigger value="inventory" className="flex-1 lg:flex-none text-xs lg:text-sm">Estoque</TabsTrigger>
            <TabsTrigger value="cash" className="flex-1 lg:flex-none text-xs lg:text-sm">Fechamento de Caixa</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={exportInventoryToCSV} className="gap-2" size="sm">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
            </div>

            {/* Collapsible Filters for Mobile */}
            <Collapsible defaultOpen={false} className="lg:hidden">
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filtros
                      </div>
                      <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="startDateMobile" className="text-xs">Data Inicial</Label>
                        <Input
                          id="startDateMobile"
                          type="date"
                          className="h-8 text-xs"
                          value={inventoryFilters.startDate}
                          onChange={(e) =>
                            setInventoryFilters({
                              ...inventoryFilters,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="endDateMobile" className="text-xs">Data Final</Label>
                        <Input
                          id="endDateMobile"
                          type="date"
                          className="h-8 text-xs"
                          value={inventoryFilters.endDate}
                          onChange={(e) =>
                            setInventoryFilters({
                              ...inventoryFilters,
                              endDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={inventoryFilters.movementType}
                          onValueChange={(value) =>
                            setInventoryFilters({
                              ...inventoryFilters,
                              movementType: value,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="in">Entrada</SelectItem>
                            <SelectItem value="out">Saída</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Desktop Filters */}
            <Card className="hidden lg:block">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data Inicial</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={inventoryFilters.startDate}
                      onChange={(e) =>
                        setInventoryFilters({
                          ...inventoryFilters,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Final</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={inventoryFilters.endDate}
                      onChange={(e) =>
                        setInventoryFilters({
                          ...inventoryFilters,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movementType">Tipo</Label>
                    <Select
                      value={inventoryFilters.movementType}
                      onValueChange={(value) =>
                        setInventoryFilters({
                          ...inventoryFilters,
                          movementType: value,
                        })
                      }
                    >
                      <SelectTrigger id="movementType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="in">Entrada</SelectItem>
                        <SelectItem value="out">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={clearInventoryFilters}
                      className="w-full"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Entradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-success">
                      +{totalIn}
                    </span>
                    <TrendingUp className="w-8 h-8 text-success opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Saídas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-destructive">
                      {totalOut}
                    </span>
                    <TrendingDown className="w-8 h-8 text-destructive opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Movimentações</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingInventory ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : movements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação encontrada
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="hidden lg:table-cell">SKU</TableHead>
                          <TableHead className="hidden lg:table-cell">Filial</TableHead>
                          <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                          <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                          <TableHead className="text-right">
                            Qtd
                          </TableHead>
                          <TableHead className="hidden lg:table-cell">Obs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(movement.created_at).toLocaleString(
                                "pt-BR"
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${movement.movement_type === "in"
                                  ? "bg-success/10 text-success"
                                  : movement.movement_type === "out"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                                  }`}
                              >
                                {movement.movement_type === "in"
                                  ? "Entrada"
                                  : movement.movement_type === "out"
                                    ? "Saída"
                                    : "Transferência"}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              {movement.product_name || "Produto"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {movement.product_sku || "N/A"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {movement.branch_name || "Filial"}
                            </TableCell>
                            <TableCell className="font-medium hidden md:table-cell">
                              {movement.profile_name || "N/A"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {movement.customer_name || "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {movement.quantity > 0 ? "+" : ""}
                              {movement.quantity}
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden lg:table-cell">
                              {movement.notes || "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => { setDeletingMovId(movement.id); setDeleteMovReason(''); }}
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Excluir movimentação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auditoria de exclusões */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 cursor-pointer" onClick={() => { fetchDeletedMovements(); setInventorySubTab(inventorySubTab === 'audit' ? 'movements' : 'audit'); }}>
                  <History className="w-4 h-4" />
                  Auditoria de Exclusões {inventorySubTab === 'audit' ? '▲' : '▼'}
                  <span className="text-xs text-muted-foreground font-normal ml-1">({deletedMovements.length} registros)</span>
                </CardTitle>
              </CardHeader>
              {inventorySubTab === 'audit' && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead>Excluído por</TableHead>
                        <TableHead>Data Exclusão</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma exclusão registrada</TableCell>
                        </TableRow>
                      ) : deletedMovements.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.product_name}</TableCell>
                          <TableCell><span className="text-xs bg-muted px-2 py-1 rounded">{row.movement_type}</span></TableCell>
                          <TableCell className="text-right font-mono">{row.quantity}</TableCell>
                          <TableCell className="text-sm">{row.deleted_by_name || '—'}</TableCell>
                          <TableCell className="text-sm">{new Date(row.deleted_at).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate" title={row.reason}>{row.reason || <span className="text-muted-foreground">Sem motivo</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="cash" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={exportCashToCSV} className="gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Caixas Fechados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{closedRegisters}</span>
                    <FileText className="w-8 h-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total em Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-success">
                      {formatCurrency(totalSalesSum)}
                    </span>
                    <TrendingUp className="w-8 h-8 text-success opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Diferença Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-2xl font-bold ${totalDifferenceSum >= 0
                        ? "text-success"
                        : "text-destructive"
                        }`}
                    >
                      {formatCurrency(totalDifferenceSum)}
                    </span>
                    {totalDifferenceSum >= 0 ? (
                      <TrendingUp className="w-8 h-8 text-success opacity-50" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-destructive opacity-50" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cash-startDate">Data Inicial</Label>
                    <Input
                      id="cash-startDate"
                      type="date"
                      value={cashFilters.startDate}
                      onChange={(e) =>
                        setCashFilters({
                          ...cashFilters,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cash-endDate">Data Final</Label>
                    <Input
                      id="cash-endDate"
                      type="date"
                      value={cashFilters.endDate}
                      onChange={(e) =>
                        setCashFilters({
                          ...cashFilters,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cash-operator">Operador</Label>
                    <Select
                      value={cashFilters.operatorId}
                      onValueChange={(value) =>
                        setCashFilters({ ...cashFilters, operatorId: value })
                      }
                    >
                      <SelectTrigger id="cash-operator">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os operadores</SelectItem>
                        {operators.map((operator) => (
                          <SelectItem key={operator.id} value={operator.id}>
                            {operator.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cash-shift">Turno</Label>
                    <Select
                      value={cashFilters.shiftId}
                      onValueChange={(value) =>
                        setCashFilters({ ...cashFilters, shiftId: value })
                      }
                    >
                      <SelectTrigger id="cash-shift">
                        <SelectValue />
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
                    <Label htmlFor="cash-status">Status</Label>
                    <Select
                      value={cashFilters.status}
                      onValueChange={(value) =>
                        setCashFilters({ ...cashFilters, status: value })
                      }
                    >
                      <SelectTrigger id="cash-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="OPEN">Abertos</SelectItem>
                        <SelectItem value="CLOSED">Fechados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={clearCashFilters}>
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registros de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCash ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : cashRegisters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro de caixa encontrado
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Abertura</TableHead>
                          <TableHead>Fechamento</TableHead>
                          <TableHead>Turno</TableHead>
                          <TableHead>Operador</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Abertura</TableHead>
                          <TableHead className="text-right">Vendas</TableHead>
                          <TableHead className="text-right">S. Entradas</TableHead>
                          <TableHead className="text-right">S. Saídas</TableHead>
                          <TableHead className="text-right">Diferença</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashRegisters.map((register) => (
                          <TableRow key={register.id}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(register.opened_at).toLocaleString(
                                "pt-BR"
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {register.closed_at
                                ? new Date(register.closed_at).toLocaleString(
                                  "pt-BR"
                                )
                                : "-"}
                            </TableCell>
                            <TableCell>{register.shift_name}</TableCell>
                            <TableCell>
                              {register.profiles?.full_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  register.status === "OPEN"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {register.status === "OPEN"
                                  ? "Aberto"
                                  : "Fechado"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(register.opening_amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(register.total_sales)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-success">
                              {formatCurrency(register.total_additions || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-destructive">
                              {formatCurrency(register.total_withdrawals || 0)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono ${(register.difference || 0) >= 0
                                ? "text-success"
                                : "text-destructive"
                                }`}
                            >
                              {formatCurrency(register.difference || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo de Exclusão de Movimentação */}
      <Dialog open={!!deletingMovId} onOpenChange={(open) => { if (!open) { setDeletingMovId(null); setDeleteMovReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Excluir Movimentação
            </DialogTitle>
            <DialogDescription>
              Esta ação reverterá o estoque do produto e criará um registro de auditoria.
              Não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-mov-reason">Motivo da exclusão *</Label>
            <Textarea
              id="delete-mov-reason"
              placeholder="Informe o motivo..."
              value={deleteMovReason}
              onChange={(e) => setDeleteMovReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletingMovId(null); setDeleteMovReason(""); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMovement}
              disabled={deleteMovLoading || !deleteMovReason.trim()}
            >
              {deleteMovLoading ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Reports;
