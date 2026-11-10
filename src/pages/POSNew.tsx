import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Search,
  X,
  LogOut,
  LogIn,
  Smartphone,
} from "lucide-react";
// import { supabase } from "@/lib/supabase"; // REMOVED
import { offlineDb, OfflineProduct, OfflineCategory, OfflineCustomer, PendingSale } from "@/lib/offlineDb"; // ADDED
import { api, getImageUrl } from "@/lib/api"; // ADDED
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCashRegister } from "@/hooks/useCashRegister";
import { OpenCashRegisterDialog } from "@/components/cash/OpenCashRegisterDialog";
import { CloseCashRegisterDialog } from "@/components/cash/CloseCashRegisterDialog";
import { PaymentMethodDialog } from "@/components/cash/PaymentMethodDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReceiptDialog } from "@/components/pos/ReceiptDialog";
import { TouchQuantityDialog } from "@/components/pos/TouchQuantityDialog";
import { useActiveBranch } from "@/hooks/useActiveBranch";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/hooks/useAuth"; // ADDED

// Re-using interfaces from offlineDb where possible or adapting
interface Product extends OfflineProduct {
  stock: number;
}

interface Category extends OfflineCategory { }

interface CartItem {
  product: Product;
  quantity: number;
}

const POSNew = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("products");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState("1");
  const [shifts, setShifts] = useState<any[]>([]);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [showCloseCashDialog, setShowCloseCashDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [touchMode, setTouchMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("pos_touch_mode");
      if (saved !== null) return saved === "true";
      return (
        typeof window !== "undefined" &&
        ("ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          (window.matchMedia && window.matchMedia("(pointer: coarse)").matches))
      );
    } catch {
      return false;
    }
  });

  const toggleTouchMode = () => {
    setTouchMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pos_touch_mode", String(next));
      } catch {
        // ignore
      }
      toast.info(next ? "Modo Touch Ativado (Ideal para telas touch)" : "Modo Touch Desativado (Modo Mouse/Teclado)");
      return next;
    });
  };
  const [receiptData, setReceiptData] = useState<{
    sale: any;
    items: any[];
  } | null>(null);

  const [customers, setCustomers] = useState<OfflineCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("walk-in");
  const [couponCode, setCouponCode] = useState("");

  // Loyalty program state
  const [loyaltySettings, setLoyaltySettings] = useState<any>(null);
  const [customerPoints, setCustomerPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);

  const { activeBranch, loading: branchLoading } = useActiveBranch();
  const { user } = useAuth(); // Get user from auth hook

  const {
    activeCashRegister,
    loading: cashLoading,
    openCashRegister,
    closeCashRegister,
    refreshCashRegister,
    updateCashRegisterTotals,
  } = useCashRegister();

  useEffect(() => {
    if (activeBranch && !branchLoading) {
      fetchData();
      fetchShifts();
      fetchCustomers();
      fetchLoyaltySettings();
    }
  }, [activeBranch, branchLoading]);

  // Fetch customer points when customer selection changes
  useEffect(() => {
    if (selectedCustomer && selectedCustomer !== "walk-in") {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (customer) {
        setCustomerPoints(customer.loyalty_points || 0);
      }
    } else {
      setCustomerPoints(0);
      setPointsToUse(0);
    }
  }, [selectedCustomer, customers]);

  const fetchCustomers = async () => {
    try {
      // Offline-first: get from IndexedDB
      const data = await offlineDb.getCustomers();
      setCustomers(data || []);

      // Background update if online (optional, handled by syncManager usually)
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchLoyaltySettings = async () => {
    try {
      const data = await offlineDb.getSetting('loyalty_settings');
      setLoyaltySettings(data || null);
    } catch (error) {
      console.error("Error fetching loyalty settings:", error);
    }
  };

  const fetchShifts = async () => {
    try {
      // Shifts might need to be online-only or cached. 
      // For now, let's assume online requirement for opening/closing shifts properly via API, 
      // OR implement offline shifts in future.
      // Using API directly for shifts as it's a critical admin operation often done online.
      // If offline, maybe we just list cached shifts?
      // For simplicity, let's try API and fail gracefully or use local shifts if we had them.
      // Current offlineDb doesn't store shifts, so we trust API or empty list.

      if (navigator.onLine) {
        const data = await api.get('/shifts', { is_active: true });
        setShifts(data || []);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const fetchData = async () => {
    try {
      if (!activeBranch) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Offline-first: Get products and categories from IndexedDB
      let [localProducts, localCategories] = await Promise.all([
        offlineDb.getProducts(),
        offlineDb.getCategories()
      ]);

      if ((!localProducts || localProducts.length === 0) && navigator.onLine) {
        try {
          const [remoteProducts, remoteCategories] = await Promise.all([
            api.get<any[]>('/products', { active_only: true, branch_id: activeBranch.id }),
            api.get<any[]>('/categories')
          ]);
          if (remoteProducts && remoteProducts.length > 0) {
            await offlineDb.saveProducts(remoteProducts);
            localProducts = remoteProducts;
          }
          if (remoteCategories && remoteCategories.length > 0) {
            await offlineDb.saveCategories(remoteCategories);
            localCategories = remoteCategories;
          }
        } catch (syncErr) {
          console.warn("Could not sync products from server:", syncErr);
        }
      }

      setProducts(localProducts || []);
      setCategories(localCategories || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar produtos offline");
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setQuantityInput("1");
    setShowQuantityDialog(true);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const quantity = parseInt(quantityInput);
    if (quantity <= 0 || isNaN(quantity)) {
      toast.error("Quantidade inválida");
      return;
    }

    // Verificar estoque disponível
    if (quantity > selectedProduct.stock) {
      toast.error(
        `Estoque insuficiente! Disponível: ${selectedProduct.stock} ${selectedProduct.unit}`
      );
      return;
    }

    const existingItem = cart.find(
      (item) => item.product.id === selectedProduct.id
    );

    // Se já existe no carrinho, verificar se a soma não excede o estoque
    if (existingItem) {
      const totalQuantity = existingItem.quantity + quantity;
      if (totalQuantity > selectedProduct.stock) {
        toast.error(
          `Estoque insuficiente! Disponível: ${selectedProduct.stock} ${selectedProduct.unit}, já no carrinho: ${existingItem.quantity}`
        );
        return;
      }

      setCart(
        cart.map((item) =>
          item.product.id === selectedProduct.id
            ? { ...item, quantity: totalQuantity }
            : item
        )
      );
    } else {
      setCart([...cart, { product: selectedProduct, quantity }]);
    }

    setShowQuantityDialog(false);
    setSelectedProduct(null);
    toast.success(`${selectedProduct.name} adicionado ao carrinho`);
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + delta;

            // Verificar se não excede o estoque
            if (delta > 0 && newQuantity > item.product.stock) {
              toast.error(
                `Estoque insuficiente! Máximo: ${item.product.stock} ${item.product.unit}`
              );
              return item;
            }

            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce(
      (sum, item) => sum + item.product.sale_price * item.quantity,
      0
    );
  };

  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }

    if (!activeCashRegister) {
      toast.error(
        "Nenhum caixa aberto! Abra um caixa antes de realizar vendas."
      );
      return;
    }

    setShowPaymentDialog(true);
  };

  const handleCheckout = async (paymentMethod: string, amountPaid?: number) => {
    if (!activeCashRegister) return;
    if (!activeBranch?.id) {
      toast.error("Nenhuma filial selecionada");
      return;
    }

    try {
      if (!user) throw new Error("Usuário não autenticado");

      const total = calculateTotal();
      const saleNumber = `SALE-${Date.now()}`;

      const toDbPayment = (
        method: string
      ): "cash" | "debit" | "credit" | "pix" | "check" | "other" => {
        switch (method) {
          case "cash":
          case "debit":
          case "credit":
          case "pix":
          case "check":
            return method;
          case "mb_way":
          case "multibanco":
            return method as any;
          default:
            return "other";
        }
      };

      // Calculate discount and net total logic
      const discount =
        loyaltySettings?.is_active && pointsToUse > 0
          ? pointsToUse * (loyaltySettings.reais_per_point || 0)
          : 0;

      const netTotal = Math.max(0, total - discount);

      // Create PendingSale object for OfflineDB
      const saleData: PendingSale = {
        client_id: uuidv4(), // Local ID - using uuidv4 for compatibility
        branch_id: activeBranch.id,
        cashier_id: user.id,
        customer_id: selectedCustomer !== "walk-in" ? selectedCustomer : undefined,
        cash_register_id: activeCashRegister.id,

        payment_method: toDbPayment(paymentMethod),
        transaction_type: 'sale', // Default

        subtotal: total,
        discount: discount,
        tax: 0, // Not handled yet
        total: netTotal,

        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.sale_price,
          discount: 0,
          total: item.product.sale_price * item.quantity
        })),

        created_at: new Date().toISOString()
      };

      // Save Sale to OfflineDB
      await offlineDb.addPendingSale(saleData);

      // Update LOCAL Stock Immediately (Optimistic UI)
      // We need to update the products state and also update offlineDb products
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(item => item.product.id === p.id);
        if (cartItem) {
          return { ...p, stock: p.stock - cartItem.quantity };
        }
        return p;
      });
      setProducts(updatedProducts);
      await offlineDb.saveProducts(updatedProducts); // Persist simplified stock change

      // Calculate change logic for UI feedback (if cash)
      if (paymentMethod === "cash" && amountPaid) {
        // This is local only visualization or local update of cash register if we supported offline registers fully
        // activeCashRegister is from hook which might be online.
      }

      // Loyalty: Optimistic Update
      if (loyaltySettings?.is_active && selectedCustomer !== "walk-in") {
        const pointsToAward = Math.floor(netTotal * (loyaltySettings.points_per_real || 0));
        const newPoints = customerPoints - pointsToUse + pointsToAward;

        // Update local customer state if we wanted to reflect immediately
        // For now, just show toast
        toast.success(`${pointsToAward} pontos agendados!`, {
          description: `Saldo atualizado após sincronização.`,
        });
      }

      // Show receipt
      const customerName =
        selectedCustomer !== "walk-in"
          ? customers.find((c) => c.id === selectedCustomer)?.name
          : "Cliente Não Identificado";

      const calculatedChange =
        paymentMethod === "cash" && amountPaid !== undefined
          ? Math.max(0, amountPaid - netTotal)
          : undefined;

      setReceiptData({
        sale: {
          ...saleData,
          sale_number: saleNumber,
          customer_name: customerName,
          coupon_code: couponCode,
          id: saleData.client_id, // Use local ID for receipt
          amount_paid: amountPaid,
          change: calculatedChange,
        },
        items: cart.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.sale_price,
          total: item.product.sale_price * item.quantity,
        })),
      });
      setShowReceipt(true);

      toast.success("Venda salva offline!", { description: "Será sincronizada quando houver internet." });

      setShowPaymentDialog(false);
      clearCart();
      setPointsToUse(0);

      // Trigger sync in background if online
      if (navigator.onLine) {
        // We could import fullSync from syncManager but avoiding direct import to keep this clean?
        // Actually we should use syncManager public helper if possible, or just let auto-sync handle it.
        // Let's stick to auto-sync for robustness, or manual trigger if urgent.
      }

    } catch (error: any) {
      console.error("Error completing sale:", error);
      const msg = error?.message || String(error);
      toast.error("Erro ao salvar venda", { description: msg });
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const productsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = filteredProducts.filter(
      (p) => p.category_id === category.id
    );
    return acc;
  }, {} as Record<string, Product[]>);

  const uncategorizedProducts = filteredProducts.filter((p) => !p.category_id);

  return (
    <MainLayout>
      {branchLoading ? (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      ) : !activeBranch ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-muted/10 p-8 text-center">
          <div className="bg-background p-8 rounded-lg shadow-lg max-w-md w-full border">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Nenhuma Filial Encontrada
            </h2>
            <p className="text-muted-foreground mb-6">
              Para começar a vender, você precisa criar sua primeira filial.
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
      ) : (
        <>
          {!cashLoading && !activeCashRegister && (
            <Alert className="m-4 border-orange-500 bg-orange-50">
              <AlertDescription className="flex items-center justify-between">
                <span className="font-medium">
                  ⚠️ Nenhum caixa aberto. Abra um caixa para começar a vender.
                </span>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant={touchMode ? "default" : "outline"}
                    onClick={toggleTouchMode}
                    className="text-xs h-8 gap-1.5"
                    title="Alternar entre modo touch e teclado tradicional"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Modo Touch:</span>
                    <span className="font-bold">{touchMode ? "Ativo" : "Inativo"}</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowOpenCashDialog(true)}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Abrir Caixa
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {activeCashRegister && (
        <div className="bg-primary/10 border-b px-2 sm:px-4 py-2 w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto w-full">
            {/* Desktop: show all info */}
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <span className="font-medium">Caixa Aberto:</span>
              <Badge variant="default">{activeCashRegister.shift_name}</Badge>
              <span className="text-muted-foreground">
                Abertura: {formatCurrency(activeCashRegister.opening_amount)}
              </span>
              <span className="text-muted-foreground">
                Vendas: {formatCurrency(activeCashRegister.total_sales)}
              </span>
              <span className="text-muted-foreground">
                Dinheiro em Caixa:{" "}
                {formatCurrency(activeCashRegister.current_change || 0)}
              </span>
            </div>
            {/* Mobile: compact info with labels */}
            <div className="flex lg:hidden items-center justify-between w-full text-xs gap-2">
              <Badge variant="default" className="text-xs truncate max-w-[120px]">{activeCashRegister.shift_name}</Badge>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/70">Vendas:</span>
                <span className="font-semibold">
                  {formatCurrency(activeCashRegister.total_sales)}
                </span>
                <span className="text-muted-foreground/70 ml-1">Caixa:</span>
                <span className="font-semibold">
                  {formatCurrency(activeCashRegister.current_change || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
              <Button
                size="sm"
                variant={touchMode ? "default" : "outline"}
                onClick={toggleTouchMode}
                className="text-xs h-8 gap-1.5 border-primary/30 active:scale-95 transition-all flex-1 sm:flex-initial"
                title="Alternar entre modo touch e teclado tradicional"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="sm:inline">Modo Touch:</span>
                <span className="font-bold">{touchMode ? "Ativo" : "Inativo"}</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowCloseCashDialog(true)}
                className="text-xs lg:text-sm h-8 shrink-0"
              >
                <LogOut className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Fechar Caixa</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] w-full max-w-full overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col w-full max-w-full overflow-hidden min-w-0">
          {/* Search Bar & Customer Info */}
          <div className="p-2 lg:p-4 border-b bg-background space-y-2 lg:space-y-4 w-full max-w-full">
            <div className="flex gap-2 lg:gap-4 w-full">
              <div className="flex-1 min-w-0">
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Cliente
                </Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 truncate"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="walk-in">Cliente Não Identificado</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{" "}
                      {customer.document ? `(${customer.document})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24 sm:w-32 lg:w-1/3 shrink-0">
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Cupom
                </Label>
                <Input
                  placeholder="Código"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="h-10 text-sm w-full"
                />
              </div>
            </div>

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 w-full"
              />
            </div>
          </div>

          {/* Categories Filter */}
          <div className="p-2 lg:p-4 border-b bg-muted/30 w-full max-w-full overflow-hidden">
            <ScrollArea className="w-full max-w-full">
              <div className="flex gap-1 lg:gap-2 pb-1">
                <Badge
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap text-xs lg:text-sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  Todas
                </Badge>
                {categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? "default" : "outline"
                    }
                    className="cursor-pointer whitespace-nowrap text-xs lg:text-sm"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="p-2 lg:p-4 space-y-4 lg:space-y-6">
              {loading ? (
                <div className="text-center py-12">Carregando produtos...</div>
              ) : (
                <>
                  {categories.map((category) => {
                    const categoryProducts =
                      productsByCategory[category.id] || [];
                    if (categoryProducts.length === 0) return null;

                    return (
                      <div key={category.id}>
                        <h2 className="text-lg lg:text-xl font-semibold mb-2 lg:mb-4 text-foreground">
                          {category.name}
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4">
                          {categoryProducts.map((product) => (
                            <Card
                              key={product.id}
                              className={`transition-all select-none ${product.stock <= 0
                                ? "opacity-50 cursor-not-allowed bg-muted"
                                : "cursor-pointer hover:shadow-lg hover:scale-105 active:scale-95"
                                }`}
                              onClick={() =>
                                product.stock > 0 && handleProductClick(product)
                              }
                            >
                              <CardContent className="p-2 lg:p-3">
                                <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-1 lg:mb-2">
                                  {product.image_url ? (
                                    <img
                                      src={getImageUrl(product.image_url)}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="w-8 lg:w-12 h-8 lg:h-12 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <h3 className="font-semibold text-xs lg:text-sm line-clamp-2 mb-1">
                                  {product.name}
                                </h3>
                                <p className="text-sm lg:text-lg font-bold text-primary">
                                  {formatCurrency(product.sale_price)}
                                </p>
                                <p className="text-xs text-muted-foreground hidden lg:block">
                                  {product.sku}
                                </p>
                                <p
                                  className={`text-xs font-medium ${product.stock <= 0
                                    ? "text-destructive"
                                    : product.stock <= 10
                                      ? "text-warning"
                                      : "text-muted-foreground"
                                    }`}
                                >
                                  QT: {product.stock} {product.unit}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {uncategorizedProducts.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4 text-foreground">
                        Sem Categoria
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {uncategorizedProducts.map((product) => (
                          <Card
                            key={product.id}
                            className={`transition-all select-none ${product.stock <= 0
                              ? "opacity-50 cursor-not-allowed bg-muted"
                              : "cursor-pointer hover:shadow-lg hover:scale-105 active:scale-95"
                              }`}
                            onClick={() =>
                              product.stock > 0 && handleProductClick(product)
                            }
                          >
                            <CardContent className="p-3">
                              <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                                {product.image_url ? (
                                  <img
                                    src={getImageUrl(product.image_url)}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-12 h-12 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                                {product.name}
                              </h3>
                              <p className="text-lg font-bold text-primary">
                                {formatCurrency(product.sale_price)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.sku}
                              </p>
                              <p
                                className={`text-xs font-medium ${product.stock <= 0
                                  ? "text-destructive"
                                  : product.stock <= 10
                                    ? "text-warning"
                                    : "text-muted-foreground"
                                  }`}
                              >
                                QT: {product.stock} {product.unit}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Section - Desktop Only */}
        <div className="hidden lg:flex w-96 border-l bg-muted/30 flex-col">
          <CardHeader className="border-b bg-background">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrinho ({cart.length})
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                cart.map((item) => (
                  <Card key={item.product.id}>
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {item.product.image_url && (
                          <img
                            src={getImageUrl(item.product.image_url)}
                            alt={item.product.name}
                            className="w-16 h-16 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-sm text-primary font-semibold">
                            {formatCurrency(item.product.sale_price)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-lg active:scale-95 border flex items-center justify-center shrink-0"
                              onClick={() =>
                                updateCartQuantity(item.product.id, -1)
                              }
                              title="Diminuir quantidade"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-bold w-8 text-center select-none">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-lg active:scale-95 border flex items-center justify-center shrink-0"
                              onClick={() =>
                                updateCartQuantity(item.product.id, 1)
                              }
                              title="Aumentar quantidade"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.product.id)}
                              className="h-8 w-8 p-0 ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 flex items-center justify-center rounded-lg shrink-0"
                              title="Remover item do carrinho"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background space-y-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={openPaymentDialog}
              disabled={cart.length === 0}
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Forma de Pagamento
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile FAB Cart Button */}
      <Button
        className="lg:hidden fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg z-40"
        onClick={() => setShowMobileCart(true)}
        disabled={cart.length === 0}
      >
        <ShoppingCart className="w-6 h-6" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
            {cart.length}
          </span>
        )}
      </Button>

      {/* Mobile Cart Drawer */}
      <Drawer open={showMobileCart} onOpenChange={setShowMobileCart}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho ({cart.length})
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[50vh]">
            <div className="space-y-2 pb-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                cart.map((item) => (
                  <Card key={item.product.id}>
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {item.product.image_url && (
                          <img
                            src={getImageUrl(item.product.image_url)}
                            alt={item.product.name}
                            className="w-14 h-14 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-sm text-primary font-semibold">
                            {formatCurrency(item.product.sale_price)}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-11 w-11 p-0 rounded-xl active:scale-95 border-2 flex items-center justify-center shrink-0 shadow-sm"
                              onClick={() =>
                                updateCartQuantity(item.product.id, -1)
                              }
                              title="Diminuir quantidade"
                            >
                              <Minus className="w-5 h-5" />
                            </Button>
                            <span className="text-base font-extrabold w-8 text-center select-none">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-11 w-11 p-0 rounded-xl active:scale-95 border-2 flex items-center justify-center shrink-0 shadow-sm"
                              onClick={() =>
                                updateCartQuantity(item.product.id, 1)
                              }
                              title="Aumentar quantidade"
                            >
                              <Plus className="w-5 h-5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-11 w-11 p-0 ml-auto rounded-xl text-destructive hover:bg-destructive/10 active:scale-95 flex items-center justify-center shrink-0"
                              onClick={() => removeFromCart(item.product.id)}
                              title="Remover produto do carrinho"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
          <DrawerFooter className="border-t">
            <div className="flex justify-between font-bold text-lg mb-2">
              <span>Total</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                setShowMobileCart(false);
                openPaymentDialog();
              }}
              disabled={cart.length === 0}
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Forma de Pagamento
            </Button>
            {cart.length > 0 && (
              <Button variant="outline" onClick={clearCart}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Carrinho
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Touch & Accessibility Quantity Dialog */}
      <TouchQuantityDialog
        open={showQuantityDialog}
        onOpenChange={setShowQuantityDialog}
        product={selectedProduct}
        quantityInput={quantityInput}
        setQuantityInput={setQuantityInput}
        onConfirm={handleAddToCart}
        touchMode={touchMode}
      />

      {/* Open Cash Register Dialog */}
      <OpenCashRegisterDialog
        open={showOpenCashDialog}
        onOpenChange={setShowOpenCashDialog}
        shifts={shifts}
        branchId={activeBranch?.id || ""}
        onOpen={async (shiftId, shiftName, branchId, openingAmount) => {
          if (!activeBranch) {
            toast.error("Selecione uma filial ativa antes de abrir o caixa");
            return;
          }
          await openCashRegister(shiftId, shiftName, branchId, openingAmount);
          refreshCashRegister();
        }}
      />

      {/* Close Cash Register Dialog */}
      <CloseCashRegisterDialog
        open={showCloseCashDialog}
        onOpenChange={async (open) => {
          if (open) {
            // Atualizar totais antes de abrir o dialog
            await updateCashRegisterTotals();
          }
          setShowCloseCashDialog(open);
        }}
        cashRegister={activeCashRegister}
        onClose={async (cashRegisterId, closingAmount, notes) => {
          await closeCashRegister(cashRegisterId, closingAmount, notes);
          refreshCashRegister();
        }}
      />

      {/* Payment Method Dialog */}
      <PaymentMethodDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        totalAmount={calculateTotal()}
        onConfirm={handleCheckout}
        loyaltySettings={loyaltySettings}
        customerPoints={customerPoints}
        pointsToUse={pointsToUse}
        onPointsToUseChange={setPointsToUse}
        customerName={
          customers.find((c) => c.id === selectedCustomer)?.name ||
          "Cliente sem cadastro"
        }
        availableCash={
          activeCashRegister?.current_change ??
          activeCashRegister?.opening_amount ??
          0
        }
        touchMode={touchMode}
      />
      <ReceiptDialog
        open={showReceipt}
        onOpenChange={setShowReceipt}
        sale={receiptData?.sale}
        items={receiptData?.items || []}
        branchName={activeBranch?.name}
      />
    </MainLayout>
  );
};

export default POSNew;
