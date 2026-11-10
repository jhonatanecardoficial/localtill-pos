import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refreshSubscription } = useSubscription();

  useEffect(() => {
    // Refresh subscription status when landing on success page
    refreshSubscription();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Pagamento Confirmado!</CardTitle>
          <CardDescription>
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-semibold">O que você tem agora:</h3>
              <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                <li>1 filial ativa</li>
                <li>4 usuários (1 admin + 3 adicionais)</li>
                <li>Acesso completo ao sistema</li>
              </ul>
            </div>
            
            <div className="p-4 border border-primary/20 rounded-lg space-y-2">
              <h3 className="font-semibold">Próximos passos:</h3>
              <ol className="space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Configure sua filial inicial</li>
                <li>Adicione produtos e categorias</li>
                <li>Cadastre seus usuários (até 3 adicionais)</li>
                <li>Comece a vender!</li>
              </ol>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Precisa de mais filiais ou usuários? Você pode adquirir através das configurações do sistema.
            </div>
          </div>

          <Button 
            onClick={() => navigate('/dashboard')} 
            className="w-full"
            size="lg"
          >
            Acessar o Sistema
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
