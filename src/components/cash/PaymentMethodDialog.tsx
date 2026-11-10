import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  RotateCcw,
  Delete,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Keyboard,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (paymentMethod: string, amountPaid?: number) => void;
  // Loyalty props
  loyaltySettings?: any;
  customerPoints?: number;
  pointsToUse?: number;
  onPointsToUseChange?: (points: number) => void;
  customerName?: string;
  availableCash?: number;
  touchMode?: boolean;
}

const paymentMethods = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "debit", label: "Débito", icon: CreditCard },
  { value: "credit", label: "Crédito", icon: CreditCard },
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "mb_way", label: "MB Way", icon: Smartphone },
  { value: "multibanco", label: "Multibanco", icon: Receipt },
  { value: "other", label: "Outros", icon: Wallet },
];

export const PaymentMethodDialog = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirm,
  loyaltySettings,
  customerPoints = 0,
  pointsToUse = 0,
  onPointsToUseChange,
  customerName,
  availableCash = 0,
  touchMode = false,
}: PaymentMethodDialogProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [forceShowNumpad, setForceShowNumpad] = useState(false);
  const { formatCurrency, currency } = useCurrency();

  // Obtém o símbolo da moeda configurada (ex: € para EUR, R$ para BRL, $ para USD)
  const currencySymbol = (() => {
    try {
      const formatted = formatCurrency(0);
      const symbol = formatted.replace(/[\d\s.,]/g, "").trim();
      return symbol || (currency === "EUR" ? "€" : currency === "USD" ? "$" : "R$");
    } catch {
      return currency === "EUR" ? "€" : currency === "USD" ? "$" : "R$";
    }
  })();

  // Reset/update when dialog opens
  useEffect(() => {
    if (open) {
      const discount =
        (pointsToUse || 0) * (loyaltySettings?.reais_per_point || 0);
      const effective = Math.max(0, totalAmount - discount);
      setAmountPaid(effective.toFixed(2));
      setIsFirstInput(true);
      setSelectedMethod("cash");
      setForceShowNumpad(false);
    }
  }, [open, totalAmount, pointsToUse, loyaltySettings]);

  // Calculate dynamics
  const pointsDiscount =
    (pointsToUse || 0) * (loyaltySettings?.reais_per_point || 0);
  const finalTotal = Math.max(0, totalAmount - pointsDiscount);

  const numericPaid = parseFloat(amountPaid || "0");
  const change =
    selectedMethod === "cash"
      ? Math.max(0, numericPaid - finalTotal)
      : 0;

  const missingChange =
    selectedMethod === "cash" ? Math.max(0, change - availableCash) : 0;

  const handleSelectMethod = (methodValue: string) => {
    setSelectedMethod(methodValue);
    if (methodValue !== "cash") {
      setAmountPaid(finalTotal.toFixed(2));
    }
  };

  const handleQuickBill = (value: number) => {
    setAmountPaid(value.toFixed(2));
    setIsFirstInput(false);
  };

  const handleNumpadPress = (key: string) => {
    if (key === "CLEAR") {
      setAmountPaid("0");
      setIsFirstInput(true);
      return;
    }

    if (key === "BACKSPACE") {
      if (amountPaid.length <= 1) {
        setAmountPaid("0");
        setIsFirstInput(true);
      } else {
        setAmountPaid(amountPaid.slice(0, -1));
      }
      return;
    }

    // Centavos: Vírgula ou Ponto
    if (key === "," || key === ".") {
      if (!amountPaid.includes(".")) {
        const base = isFirstInput || !amountPaid || amountPaid === "0" ? "0" : amountPaid;
        setAmountPaid(base + ".");
        setIsFirstInput(false);
      }
      return;
    }

    // Dígitos 0-9
    let nextStr: string;
    if (isFirstInput || amountPaid === "0") {
      nextStr = key;
      setIsFirstInput(false);
    } else {
      nextStr = amountPaid + key;
    }

    // Limitar a 2 casas decimais após a vírgula
    if (nextStr.includes(".")) {
      const [intPart, decPart] = nextStr.split(".");
      if (decPart && decPart.length > 2) {
        nextStr = `${intPart}.${decPart.slice(0, 2)}`;
      }
    }

    setAmountPaid(nextStr);
  };

  const handleConfirm = () => {
    if (selectedMethod === "cash") {
      const paid = parseFloat(amountPaid);
      if (paid < finalTotal) {
        return;
      }
      onConfirm(selectedMethod, paid);
    } else {
      onConfirm(selectedMethod);
    }
  };

  // Generate smart quick bills formatados com a moeda configurada
  const quickBills: { label: string; value: number }[] = [
    { label: `Exato`, value: finalTotal },
  ];
  if (finalTotal < 10) quickBills.push({ label: formatCurrency(10), value: 10 });
  if (finalTotal < 20) quickBills.push({ label: formatCurrency(20), value: 20 });
  if (finalTotal < 50) quickBills.push({ label: formatCurrency(50), value: 50 });
  if (finalTotal < 100) quickBills.push({ label: formatCurrency(100), value: 100 });

  // Determina se deve exibir o teclado numérico virtual na tela
  const shouldShowTouchNumpad = touchMode || forceShowNumpad;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[94vh] p-4 sm:p-6 flex flex-col overflow-hidden">
        <DialogHeader className="text-left space-y-1 pb-2 border-b">
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            Forma de Pagamento
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Selecione a forma de pagamento e informe o valor recebido
          </DialogDescription>
        </DialogHeader>

        {/* CONTAINER COM SCROLL INTERNO PARA TELAS PEQUENAS */}
        <div className="space-y-4 py-3 overflow-y-auto flex-1 pr-1">
          {/* CARD DE VALORES EM DESTAQUE - NUNCA É COBERTO */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Total da Venda
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {formatCurrency(finalTotal)}
              </span>
            </div>

            {selectedMethod === "cash" && (
              <div className="pt-2 border-t border-primary/10 grid grid-cols-2 gap-3">
                <div className="bg-background/80 p-2.5 rounded-lg border">
                  <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                    Valor Recebido
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-primary block truncate">
                    {formatCurrency(numericPaid)}
                  </span>
                </div>

                <div className="bg-background/80 p-2.5 rounded-lg border">
                  <span className="text-[11px] font-semibold text-muted-foreground block uppercase">
                    Troco a Devolver
                  </span>
                  <span
                    className={`text-xl sm:text-2xl font-extrabold block truncate ${
                      change > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatCurrency(change)}
                  </span>
                </div>
              </div>
            )}

            {/* Alerta de Caixa Insuficiente ou Valor Menor */}
            {selectedMethod === "cash" && missingChange > 0 && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs font-semibold text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Atenção: Caixa insuficiente! Faltam {formatCurrency(missingChange)} de troco.
                </span>
              </div>
            )}

            {selectedMethod === "cash" && numericPaid < finalTotal && (
              <p className="text-xs font-medium text-destructive">
                O valor recebido deve ser maior ou igual ao total ({formatCurrency(finalTotal)}).
              </p>
            )}
          </div>

          {/* GRID DE FORMAS DE PAGAMENTO - TOUCH FRIENDLY */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Forma de Pagamento
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.value;
                return (
                  <Button
                    key={method.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className={`h-13 sm:h-14 flex items-center justify-center gap-2 p-2 rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all border-2 ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border hover:border-primary/40 bg-background"
                    }`}
                    onClick={() => handleSelectMethod(method.value)}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">{method.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO DINHEIRO */}
          {selectedMethod === "cash" && (
            <div className="space-y-3 pt-1 border-t">
              {/* Botões Rápidos de Cédulas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Cédulas Rápidas
                  </Label>
                  {/* Botão para alternar modo teclado físico / touch caso desejado */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-muted-foreground hover:text-primary gap-1 px-1.5"
                    onClick={() => setForceShowNumpad(!shouldShowTouchNumpad)}
                  >
                    <Keyboard className="w-3 h-3" />
                    {shouldShowTouchNumpad ? "Usar Teclado Físico" : "Abrir Teclado de Tela"}
                  </Button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {quickBills.map((qb) => (
                    <Button
                      key={qb.label}
                      type="button"
                      variant="secondary"
                      className="h-10 text-xs sm:text-sm font-bold rounded-lg border hover:border-primary/50 active:scale-95 transition-all truncate"
                      onClick={() => handleQuickBill(qb.value)}
                    >
                      {qb.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* MODO DESKTOP / TECLADO FÍSICO */}
              {!shouldShowTouchNumpad ? (
                <div className="space-y-2 p-3 bg-muted/40 rounded-xl border">
                  <Label htmlFor="amountPaidInput" className="text-xs font-semibold text-muted-foreground block">
                    Valor Recebido (digite no teclado físico)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-lg">
                      {currencySymbol}
                    </span>
                    <Input
                      id="amountPaidInput"
                      type="number"
                      step="0.01"
                      min={finalTotal}
                      value={amountPaid}
                      onChange={(e) => {
                        setAmountPaid(e.target.value);
                        setIsFirstInput(false);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="h-12 pl-10 text-2xl font-bold bg-background text-primary"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                /* MODO TOUCH: VISOR + NUMPAD COM VÍRGULA/PONTO PARA CENTAVOS */
                <div className="bg-muted/40 p-3 rounded-xl border space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Digitar Outro Valor
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="bg-background px-3 py-1 rounded-md border font-mono font-bold text-lg text-primary">
                        {currencySymbol} {amountPaid.replace(".", ",") || "0,00"}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2"
                        onClick={() => handleNumpadPress("CLEAR")}
                        title="Limpar valor"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Limpar
                      </Button>
                    </div>
                  </div>

                  {/* Numpad Touch na própria tela com botão de vírgula para centavos */}
                  <div className="grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                      <Button
                        key={digit}
                        type="button"
                        variant="outline"
                        className="h-11 sm:h-12 text-xl font-bold bg-background rounded-lg border shadow-sm active:scale-95 transition-transform"
                        onClick={() => handleNumpadPress(digit)}
                      >
                        {digit}
                      </Button>
                    ))}
                    {/* Botão de Vírgula / Ponto para Centavos */}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 sm:h-12 text-2xl font-extrabold bg-background rounded-lg border shadow-sm active:scale-95 transition-transform"
                      onClick={() => handleNumpadPress(",")}
                      title="Vírgula para centavos"
                    >
                      ,
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 sm:h-12 text-xl font-bold bg-background rounded-lg border shadow-sm active:scale-95 transition-transform"
                      onClick={() => handleNumpadPress("0")}
                    >
                      0
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 sm:h-12 text-sm font-semibold bg-background text-destructive hover:bg-destructive/10 rounded-lg border shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1"
                      onClick={() => handleNumpadPress("BACKSPACE")}
                      title="Apagar dígito"
                    >
                      <Delete className="w-5 h-5" />
                      Apagar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fidelidade / Pontos (se ativo) */}
          {loyaltySettings?.is_active &&
            customerPoints > 0 &&
            customerName !== "Cliente sem cadastro" && (
              <div className="border rounded-lg p-3 bg-primary/5 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span>Pontos Disponíveis: {customerPoints}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      const maxPoints = Math.min(
                        customerPoints,
                        Math.floor(
                          totalAmount / (loyaltySettings?.reais_per_point || 1)
                        )
                      );
                      onPointsToUseChange?.(maxPoints);
                    }}
                  >
                    Usar Todos
                  </Button>
                </div>
                {pointsToUse > 0 && (
                  <p className="text-green-600 font-bold">
                    Desconto aplicado: -{formatCurrency(pointsDiscount)}
                  </p>
                )}
              </div>
            )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t mt-auto">
          <Button
            type="button"
            variant="outline"
            className="h-12 text-base font-semibold w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 text-base sm:text-lg font-bold w-full sm:flex-1 gap-2 shadow-md"
            onClick={handleConfirm}
            disabled={
              selectedMethod === "cash" &&
              (numericPaid < finalTotal || missingChange > 0)
            }
          >
            <CheckCircle2 className="w-5 h-5" />
            Confirmar Venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
