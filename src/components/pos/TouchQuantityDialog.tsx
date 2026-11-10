import React, { useState, useEffect } from "react";
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
import { useCurrency } from "@/contexts/CurrencyContext";
import { getImageUrl } from "@/lib/api";
import { Plus, Minus, Delete, RotateCcw, Calculator, Check } from "lucide-react";
import { OfflineProduct } from "@/lib/offlineDb";

interface Product extends OfflineProduct {
  stock: number;
}

interface TouchQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  quantityInput: string;
  setQuantityInput: (value: string) => void;
  onConfirm: () => void;
  touchMode: boolean;
}

export const TouchQuantityDialog: React.FC<TouchQuantityDialogProps> = ({
  open,
  onOpenChange,
  product,
  quantityInput,
  setQuantityInput,
  onConfirm,
  touchMode,
}) => {
  const { formatCurrency } = useCurrency();
  const [showNumpad, setShowNumpad] = useState(false);
  const [isFirstInput, setIsFirstInput] = useState(true);

  // Reset numpad state when dialog opens
  useEffect(() => {
    if (open) {
      setIsFirstInput(true);
      setShowNumpad(false);
    }
  }, [open, product]);

  if (!product) return null;

  const currentQuantity = parseInt(quantityInput) || 1;
  const maxStock = product.stock || 1;
  const subtotal = product.sale_price * currentQuantity;

  const handleIncrement = (amount = 1) => {
    const nextVal = Math.min(currentQuantity + amount, maxStock);
    setQuantityInput(String(nextVal));
    setIsFirstInput(false);
  };

  const handleDecrement = (amount = 1) => {
    const nextVal = Math.max(currentQuantity - amount, 1);
    setQuantityInput(String(nextVal));
    setIsFirstInput(false);
  };

  const handleNumpadPress = (key: string) => {
    if (key === "CLEAR") {
      setQuantityInput("1");
      setIsFirstInput(true);
      return;
    }

    if (key === "BACKSPACE") {
      if (quantityInput.length <= 1) {
        setQuantityInput("1");
        setIsFirstInput(true);
      } else {
        setQuantityInput(quantityInput.slice(0, -1));
      }
      return;
    }

    // Digit 0-9
    let nextStr: string;
    if (isFirstInput) {
      nextStr = key === "0" ? "1" : key;
      setIsFirstInput(false);
    } else {
      nextStr = quantityInput + key;
    }

    const parsed = parseInt(nextStr);
    if (!isNaN(parsed)) {
      if (parsed > maxStock) {
        setQuantityInput(String(maxStock));
      } else {
        setQuantityInput(String(parsed));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold truncate">
            Adicionar ao Carrinho
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-foreground line-clamp-1">
            {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Imagem e Detalhes do Produto */}
          <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-xl border">
            {product.image_url ? (
              <img
                src={getImageUrl(product.image_url)}
                alt={product.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground flex-shrink-0">
                PDV
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xl font-extrabold text-primary">
                {formatCurrency(product.sale_price)}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  / {product.unit}
                </span>
              </p>
              <p
                className={`text-xs font-semibold ${
                  product.stock <= 5 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                }`}
              >
                Estoque disponível: {product.stock} {product.unit}
              </p>
            </div>
          </div>

          {/* Stepper Principal - Botões Grandes e Acessíveis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Quantidade
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-primary font-medium hover:bg-primary/10 gap-1.5"
                onClick={() => setShowNumpad(!showNumpad)}
              >
                <Calculator className="w-3.5 h-3.5" />
                {showNumpad ? "Ocultar Teclado" : "Digitar no Teclado"}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border-2 active:scale-95 transition-transform flex items-center justify-center bg-background shadow-sm hover:bg-muted"
                onClick={() => handleDecrement(1)}
                disabled={currentQuantity <= 1}
                title="Diminuir quantidade"
              >
                <Minus className="w-6 h-6 sm:w-7 sm:h-7" />
              </Button>

              {!touchMode ? (
                <div className="flex-1 max-w-[140px] h-14 sm:h-16 relative">
                  <input
                    type="number"
                    min="1"
                    max={maxStock}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onConfirm();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full h-full text-center text-3xl sm:text-4xl font-extrabold rounded-xl border-2 border-primary/40 bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                    autoFocus
                  />
                  <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                    {product.unit}
                  </span>
                </div>
              ) : (
                <div
                  className="flex-1 max-w-[140px] h-14 sm:h-16 rounded-xl border-2 border-primary/30 bg-background flex flex-col items-center justify-center cursor-pointer select-none shadow-inner"
                  onClick={() => setShowNumpad(!showNumpad)}
                >
                  <span className="text-3xl sm:text-4xl font-extrabold text-foreground leading-none">
                    {quantityInput || "1"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {product.unit}
                  </span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border-2 active:scale-95 transition-transform flex items-center justify-center bg-background shadow-sm hover:bg-muted"
                onClick={() => handleIncrement(1)}
                disabled={currentQuantity >= maxStock}
                title="Aumentar quantidade"
              >
                <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
              </Button>
            </div>
          </div>

          {/* Atalhos rápidos de quantidade (+1, +2, +5, +10) */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 5, 10].map((num) => (
              <Button
                key={num}
                type="button"
                variant="secondary"
                className="h-10 text-sm font-bold rounded-lg border hover:border-primary/50 active:scale-95 transition-all"
                onClick={() => handleIncrement(num)}
                disabled={currentQuantity + num > maxStock}
              >
                +{num}
              </Button>
            ))}
          </div>

          {/* Teclado Numérico Virtual na Tela (Numpad) */}
          {showNumpad && (
            <div className="bg-muted/40 p-3 rounded-xl border space-y-2 animate-in fade-in-50 duration-150">
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <Button
                    key={digit}
                    type="button"
                    variant="outline"
                    className="h-12 text-xl font-bold bg-background rounded-lg border shadow-sm active:scale-95 transition-transform"
                    onClick={() => handleNumpadPress(digit)}
                  >
                    {digit}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 text-sm font-semibold bg-background text-destructive hover:bg-destructive/10 rounded-lg border shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1"
                  onClick={() => handleNumpadPress("CLEAR")}
                  title="Limpar valor"
                >
                  <RotateCcw className="w-4 h-4" />
                  Limpar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 text-xl font-bold bg-background rounded-lg border shadow-sm active:scale-95 transition-transform"
                  onClick={() => handleNumpadPress("0")}
                >
                  0
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 text-sm font-semibold bg-background rounded-lg border shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1"
                  onClick={() => handleNumpadPress("BACKSPACE")}
                  title="Apagar último dígito"
                >
                  <Delete className="w-5 h-5" />
                  Apagar
                </Button>
              </div>
            </div>
          )}

          {/* Resumo Subtotal em Destaque */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium text-foreground">Total do Item:</span>
            <span className="text-xl sm:text-2xl font-extrabold text-primary">
              {formatCurrency(subtotal)}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            className="h-12 sm:h-13 text-base font-semibold w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 sm:h-13 text-base sm:text-lg font-bold w-full sm:flex-1 gap-2 shadow-md"
            onClick={onConfirm}
          >
            <Check className="w-5 h-5" />
            Adicionar ao Carrinho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
