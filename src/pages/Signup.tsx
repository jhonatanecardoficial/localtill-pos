import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from "@/lib/api";
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().trim().email({ message: 'E-mail inválido' }),
  password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
  confirmPassword: z.string(),
  fullName: z.string().trim().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

export default function Signup() {
  const navigate = useNavigate();
  // const { signUp } = useAuth(); // Unused in this component as we handle signup flow manually
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      signupSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    setCheckoutLoading(true);

    try {
      // Verificar se o usuário já existe
      const { exists } = await api.post<{ exists: boolean }>('/auth/check-email', {
        email: formData.email.toLowerCase()
      });

      if (exists) {
        toast.error('Este e-mail já está cadastrado. Para comprar novas filiais, faça login e acesse Configurações > Filiais.');
        setLoading(false);
        setCheckoutLoading(false);
        return;
      }

      toast.success('Redirecionando para pagamento...');

      // Iniciar checkout do Stripe
      const data = await api.post<{ url: string }>('/payments/create-checkout', {
        priceId: 'price_1SgboBFzQUTRMRx949NdZWXK',
        successUrl: `${window.location.origin}/payment-success`,
        cancelUrl: `${window.location.origin}/signup`,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('Erro ao processar cadastro: ' + (error.message || 'Erro desconhecido'));
      setLoading(false);
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
          <CardDescription className="text-center">
            Cadastre-se para começar a usar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                placeholder="Seu nome completo"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={loading || checkoutLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading || checkoutLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading || checkoutLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={loading || checkoutLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || checkoutLoading}>
              {checkoutLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecionando para pagamento...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Criar Conta e Pagar'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{' '}
            <Button
              variant="link"
              className="p-0"
              onClick={() => navigate('/auth')}
              disabled={loading || checkoutLoading}
            >
              Fazer login
            </Button>
          </div>
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              Plano Inicial: 1 filial + 4 usuários por $25/mês
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
