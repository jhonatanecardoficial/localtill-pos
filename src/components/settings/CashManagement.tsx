import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, MinusCircle, DollarSign, RefreshCw, User, Building2, History, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCashRegister } from '@/hooks/useCashRegister';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';

interface CashMovementItem {
  id: string;
  cash_register_id: string;
  movement_type: string;
  amount: number | string;
  reason?: string;
  performed_by_name?: string;
  operator_name?: string;
  shift_name?: string;
  branch_name?: string;
  created_at: string;
}

interface ExtendedCashRegister {
  id: string;
  current_change: number;
  status: string;
  opened_at: string;
  operator_id: string;
  operator_name?: string;
  branch_name?: string;
  profiles?: {
    full_name: string;
  };
  branches?: {
    name: string;
    code: string;
  };
}

export const CashManagement = () => {
  const { activeCashRegister, refreshCashRegister } = useCashRegister();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showAdminAuthDialog, setShowAdminAuthDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [allOpenRegisters, setAllOpenRegisters] = useState<ExtendedCashRegister[]>([]);
  const [selectedRegister, setSelectedRegister] = useState<ExtendedCashRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<CashMovementItem[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const fetchMovements = async (registerId?: string) => {
    setLoadingMovements(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (registerId) {
        params.cash_register_id = registerId;
      }
      const data = await api.get<CashMovementItem[]>('/cash-movements', params);
      setMovements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching cash movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { userRoles } = useAuth(); // Assuming useAuth provides roles

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;

    // Check if current user has admin role
    const isAdmin = userRoles?.includes('admin') || userRoles?.includes('owner'); // owner usually has admin rights
    setIsAdminUser(isAdmin);

    fetchMovements(isAdmin ? undefined : activeCashRegister?.id);

    if (isAdmin) {
      fetchOpenRegisters();
    } else if (activeCashRegister) {
      // Safe mapping for non-admin active register
      setSelectedRegister({
        id: activeCashRegister.id,
        current_change: activeCashRegister.current_change || 0,
        status: activeCashRegister.status,
        opened_at: activeCashRegister.opened_at,
        operator_id: user.id
      });
    }
  };

  const fetchOpenRegisters = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>('/cash-registers', { status: 'OPEN' });

      // Map API response to Component interface
      const mappedData: ExtendedCashRegister[] = (data || []).map((item: any) => ({
        id: item.id,
        current_change: item.current_change,
        status: item.status,
        opened_at: item.opened_at,
        operator_id: item.operator_id,
        // The API returns distinct fields
        operator_name: item.operator_name,
        branch_name: item.branch_name,
        // For compatibility with UI that might expect these nested objects
        profiles: { full_name: item.operator_name || 'Desconhecido' },
        branches: { name: item.branch_name || '-', code: '' }
      }));

      setAllOpenRegisters(mappedData);
      fetchMovements();
    } catch (error) {
      console.error('Error fetching registers:', error);
      toast.error('Erro ao buscar caixas abertos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (action: 'add' | 'withdraw', register?: ExtendedCashRegister) => {
    const target = register || (isAdminUser ? null : (activeCashRegister as unknown as ExtendedCashRegister));

    if (!target) {
      if (!isAdminUser && !activeCashRegister) {
        toast.error('Nenhum caixa aberto');
        return;
      }
      if (isAdminUser && !register) {
        return;
      }
    }

    if (target) {
      setSelectedRegister(target);
    } else if (!isAdminUser && activeCashRegister) {
      setSelectedRegister({
        id: activeCashRegister.id,
        current_change: activeCashRegister.current_change || 0,
        status: activeCashRegister.status,
        opened_at: activeCashRegister.opened_at,
        operator_id: '',
      });
    }

    if (isAdminUser) {
      if (action === 'add') {
        setShowAddDialog(true);
      } else {
        setShowWithdrawDialog(true);
      }
    } else {
      setPendingAction(action);
      setShowAdminAuthDialog(true);
    }
  };

  const authenticateAdmin = async () => {
    setIsChecking(true);
    try {
      await api.post('/auth/verify-admin', {
        email: adminEmail,
        password: adminPassword,
      });

      setShowAdminAuthDialog(false);
      setAdminEmail('');
      setAdminPassword('');

      if (pendingAction === 'add') {
        setShowAddDialog(true);
      } else {
        setShowWithdrawDialog(true);
      }

      setPendingAction(null);
    } catch (error) {
      console.error('Error authenticating admin:', error);
      toast.error('Credenciais inválidas ou usuário não é administrador');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCashMovement = async (type: 'addition' | 'withdrawal') => {
    const target = selectedRegister;
    if (!target) return;

    const movementAmount = parseFloat(amount);
    if (isNaN(movementAmount) || movementAmount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    if (type === 'withdrawal' && movementAmount > (target.current_change || 0)) {
      toast.error('Valor de retirada maior que o disponível em caixa');
      return;
    }

    try {
      await api.post('/cash-registers/movements', {
        cash_register_id: target.id,
        movement_type: type,
        amount: movementAmount,
        reason: reason || null,
      });

      toast.success(
        type === 'addition' ? 'Troco adicionado com sucesso!' : 'Retirada realizada com sucesso!'
      );

      setAmount('');
      setReason('');
      setShowAddDialog(false);
      setShowWithdrawDialog(false);

      fetchMovements(isAdminUser ? undefined : target.id);
      if (isAdminUser) {
        fetchOpenRegisters();
      } else {
        refreshCashRegister();
      }
    } catch (error) {
      console.error('Error processing cash movement:', error);
      toast.error((error as any)?.response?.data?.error || (error as any)?.message || 'Erro ao processar movimentação');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Gerenciamento de Troco {isAdminUser ? '(Visão Administrativa)' : ''}
              </CardTitle>
              <CardDescription>
                {isAdminUser
                  ? 'Visualize e gerencie o troco de todos os caixas abertos'
                  : 'Adicione ou retire troco do seu caixa'}
              </CardDescription>
            </div>
            {isAdminUser && (
              <Button size="sm" variant="outline" onClick={fetchOpenRegisters}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Lista
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isAdminUser ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead className="text-right">Troco Atual</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allOpenRegisters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum caixa aberto no momento
                      </TableCell>
                    </TableRow>
                  ) : (
                    allOpenRegisters.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{reg.profiles?.full_name || reg.operator_name || 'Desconhecido'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{reg.branches?.name || reg.branch_name || '-'}</span>
                            {reg.branches?.code && <Badge variant="outline" className="text-xs">{reg.branches.code}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(reg.opened_at).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-green-600">
                          {formatCurrency(reg.current_change || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleOpenDialog('add', reg)} title="Adicionar Troco">
                              <PlusCircle className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleOpenDialog('withdraw', reg)} title="Retirar Troco (Sangria)">
                              <MinusCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            activeCashRegister ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Troco Disponível:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(activeCashRegister.current_change || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleOpenDialog('add')}
                    className="w-full"
                    variant="default"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Adicionar Troco
                  </Button>

                  <Button
                    onClick={() => handleOpenDialog('withdraw')}
                    className="w-full"
                    variant="outline"
                  >
                    <MinusCircle className="w-4 h-4 mr-2" />
                    Retirar Troco
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum caixa aberto no momento
              </p>
            )
          )}
        </CardContent>
      </Card>

      {/* Histórico de Movimentações (Suprimentos e Sangrias) */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                Histórico de Movimentações de Troco
              </CardTitle>
              <CardDescription>
                Registro de suprimentos (adicionar troco) e sangrias (retirar troco)
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchMovements(isAdminUser ? undefined : activeCashRegister?.id)}
              disabled={loadingMovements}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingMovements ? 'animate-spin' : ''}`} />
              Atualizar Histórico
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMovements ? (
            <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma movimentação de troco registrada até o momento.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {isAdminUser && <TableHead>Operador / Caixa</TableHead>}
                    {isAdminUser && <TableHead>Filial</TableHead>}
                    <TableHead>Motivo</TableHead>
                    <TableHead>Realizado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mov) => {
                    const isAddition =
                      mov.movement_type === 'addition' ||
                      mov.movement_type === 'deposit' ||
                      mov.movement_type === 'suprimento' ||
                      mov.movement_type === 'supply';
                    const amountNum = parseFloat(String(mov.amount)) || 0;

                    return (
                      <TableRow key={mov.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(mov.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          {isAddition ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 gap-1 font-medium">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              Suprimento (Entrada)
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 gap-1 font-medium">
                              <ArrowUpRight className="w-3 h-3 text-rose-600" />
                              Sangria (Retirada)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold whitespace-nowrap ${isAddition ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isAddition ? '+' : '-'} {formatCurrency(amountNum)}
                        </TableCell>
                        {isAdminUser && (
                          <TableCell className="text-sm">
                            <span className="font-medium">{mov.operator_name || 'Operador'}</span>
                            {mov.shift_name && (
                              <span className="text-xs text-muted-foreground block">{mov.shift_name}</span>
                            )}
                          </TableCell>
                        )}
                        {isAdminUser && (
                          <TableCell className="text-sm text-muted-foreground">
                            {mov.branch_name || '-'}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {mov.reason || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {mov.performed_by_name || 'Sistema'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdminAuthDialog} onOpenChange={setShowAdminAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autenticação de Administrador</DialogTitle>
            <DialogDescription>
              Esta ação requer permissão de administrador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email do Administrador</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdminAuthDialog(false);
                setAdminEmail('');
                setAdminPassword('');
                setPendingAction(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={authenticateAdmin} disabled={isChecking}>
              {isChecking ? 'Verificando...' : 'Autenticar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Troco</DialogTitle>
            <DialogDescription>
              Informe o valor a ser adicionado ao caixa {selectedRegister?.profiles?.full_name ? `de ${selectedRegister.profiles.full_name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-amount">Valor</Label>
              <Input
                id="add-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-reason">Motivo (opcional)</Label>
              <Textarea
                id="add-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Suprimento de troco"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleCashMovement('addition')}>
              Confirmar Adição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirar Troco</DialogTitle>
            <DialogDescription>
              Informe o valor a ser retirado do caixa {selectedRegister?.profiles?.full_name ? `de ${selectedRegister.profiles.full_name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Valor</Label>
              <Input
                id="withdraw-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedRegister?.current_change || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-reason">Motivo (opcional)</Label>
              <Textarea
                id="withdraw-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Sangria"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleCashMovement('withdrawal')}>
              Confirmar Retirada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
