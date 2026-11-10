import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import api, { setServerUrl } from "@/lib/api";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, userRoles, signIn } = useAuth();
  const navigate = useNavigate();

  // Verificar se o servidor está configurado
  useEffect(() => {
    const checkServer = async () => {
      // Se carregado via HTTP (não file://), o servidor já é o próprio host
      if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        const origin = window.location.origin;
        const result = await api.discover(origin);
        if (result) {
          setServerUrl(origin);
          return; // Servidor OK, não precisa navegar
        }
      }

      // Caso contrário, verificar se o servidor está configurado
      const online = await api.isOnline();
      if (!online) {
        navigate('/server-setup');
      }
    };
    checkServer();
  }, [navigate]);

  // Redirecionar se já autenticado
  useEffect(() => {
    if (user) {
      // Operadores vão direto para o POS
      if (userRoles.includes('operator') && !userRoles.includes('admin') && !userRoles.includes('manager')) {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, userRoles, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md mx-4 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center">
            <LogIn className="w-8 h-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-white">PDV Local</CardTitle>
          <CardDescription className="text-slate-400">
            Faça login para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
