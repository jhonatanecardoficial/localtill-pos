import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CreditCard, Banknote, Smartphone, Receipt, Wallet } from "lucide-react";

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    totalAmount: number;
    onConfirm: (paymentMethod: string) => void;
    loading?: boolean;
}

export function PaymentModal({
    open,
    onOpenChange,
    totalAmount,
    onConfirm,
    loading,
}: PaymentModalProps) {
    const { formatCurrency } = useCurrency();

    const paymentMethods = [
        {
            id: "cash",
            label: "Dinheiro",
            icon: Banknote,
            color: "text-green-600 bg-green-100 dark:bg-green-900/20",
        },
        {
            id: "debit",
            label: "Débito",
            icon: CreditCard,
            color: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
        },
        {
            id: "credit",
            label: "Crédito",
            icon: CreditCard,
            color: "text-purple-600 bg-purple-100 dark:bg-purple-900/20",
        },
        {
            id: "mb_way",
            label: "MB Way",
            icon: Smartphone,
            color: "text-pink-600 bg-pink-100 dark:bg-pink-900/20",
        },
        {
            id: "multibanco",
            label: "Multibanco",
            icon: Receipt,
            color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20",
        },
        {
            id: "pix",
            label: "PIX",
            icon: Smartphone,
            color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20",
        },
        {
            id: "other",
            label: "Outros",
            icon: Wallet,
            color: "text-gray-600 bg-gray-100 dark:bg-gray-800",
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Selecione o Método de Pagamento</DialogTitle>
                    <DialogDescription className="hidden">
                        Escolha uma das opções abaixo para finalizar a venda.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="text-center mb-6">
                        <p className="text-sm text-muted-foreground mb-1">Total a Pagar</p>
                        <p className="text-3xl font-bold text-primary">
                            {formatCurrency(totalAmount)}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map((method) => (
                            <Button
                                key={method.id}
                                variant="outline"
                                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-accent/50 transition-colors"
                                onClick={() => onConfirm(method.id)}
                                disabled={loading}
                            >
                                <div className={`p-2 rounded-full ${method.color}`}>
                                    <method.icon className="w-5 h-5" />
                                </div>
                                <span className="font-medium">{method.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
