import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReceiptItem {
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface ReceiptSale {
    sale_number?: string;
    created_at: string;
    subtotal: number;
    total: number;
    payment_method: string;
    customer_name?: string;
    coupon_code?: string;
    amount_paid?: number;
    change?: number;
}

interface ReceiptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sale: ReceiptSale | null;
    items: ReceiptItem[];
    branchName?: string;
}

import { useCurrency } from "@/contexts/CurrencyContext";

// ... inside component ...
export function ReceiptDialog({ open, onOpenChange, sale, items, branchName }: ReceiptDialogProps) {
    const { formatCurrency } = useCurrency();

    if (!sale) return null;

    const handlePrint = () => {
        window.print();
    };

    // Removed local formatCurrency function

    const translatePaymentMethod = (method: string) => {
        const methods: Record<string, string> = {
            cash: 'Dinheiro',
            debit: 'Cartão de Débito',
            credit: 'Cartão de Crédito',
            pix: 'PIX',
            mb_way: 'MB Way',
            multibanco: 'Multibanco',
            other: 'Outros',
            // legacy keys
            credit_card: 'Cartão de Crédito',
            debit_card: 'Cartão de Débito',
        };
        return methods[method] || method;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-white text-black print:shadow-none print:border-none">
                <DialogHeader className="print:hidden">
                    <DialogTitle>Comprovante de Venda</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 print:space-y-2 text-sm font-mono" id="receipt-content">
                    <div className="text-center border-b pb-4 print:pb-2 border-dashed border-gray-300">
                        <h2 className="font-bold text-lg">{branchName || "PDV"}</h2>
                        <p className="text-gray-500 text-xs">Comprovante Não Fiscal</p>
                        <p className="text-xs">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>

                    <div className="space-y-1">
                        <p><strong>Venda:</strong> {sale.sale_number}</p>
                        {sale.customer_name && <p><strong>Cliente:</strong> {sale.customer_name}</p>}
                    </div>

                    <div className="border-t border-b py-2 border-dashed border-gray-300">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <th className="pb-1">Item</th>
                                    <th className="pb-1 text-right">Qtd</th>
                                    <th className="pb-1 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="py-0.5 pr-2">{item.name}</td>
                                        <td className="py-0.5 text-right">{item.quantity}</td>
                                        <td className="py-0.5 text-right">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-1 text-right">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(sale.subtotal)}</span>
                        </div>
                        {sale.coupon_code && (
                            <div className="flex justify-between text-green-600">
                                <span>Cupom ({sale.coupon_code}):</span>
                                <span>- {formatCurrency(sale.subtotal - sale.total)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed border-gray-300">
                            <span>TOTAL:</span>
                            <span>{formatCurrency(sale.total)}</span>
                        </div>
                        <div className="text-xs text-gray-600 pt-1 flex justify-between">
                            <span>Pagamento:</span>
                            <span className="font-medium">{translatePaymentMethod(sale.payment_method)}</span>
                        </div>
                        {sale.amount_paid !== undefined && sale.amount_paid > 0 && (
                            <div className="flex justify-between text-xs pt-1 border-t border-dotted border-gray-200">
                                <span>Valor Recebido:</span>
                                <span>{formatCurrency(sale.amount_paid)}</span>
                            </div>
                        )}
                        {sale.change !== undefined && sale.change > 0 && (
                            <div className="flex justify-between text-xs font-bold text-gray-900 pt-0.5">
                                <span>Troco Devolvido:</span>
                                <span>{formatCurrency(sale.change)}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-center pt-4 print:pt-8 text-xs text-gray-400">
                        <p>Obrigado pela preferência!</p>
                    </div>
                </div>

                <DialogFooter className="print:hidden gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </Button>
                </DialogFooter>

                <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt-content, #receipt-content * {
              visibility: visible;
            }
            #receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
            }
            /* Reset dialog layout for print */
            [role="dialog"] {
              position: static !important;
              transform: none !important;
              border: none !important;
              box-shadow: none !important;
              max-width: 100% !important;
              width: 100% !important;
              padding: 0 !important;
            }
            /* Hide backdrop */
            div[data-state="open"] {
              background: none !important;
            }
          }
        `}</style>
            </DialogContent>
        </Dialog>
    );
}
