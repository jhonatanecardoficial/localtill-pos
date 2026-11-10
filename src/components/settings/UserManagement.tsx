import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Shield, Briefcase, Package, User, Edit2, Info, Plus, Key } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { UpgradeButton } from '@/components/UpgradeButton';
import { useSubscription } from '@/hooks/useSubscription';
import { useActiveBranch } from '@/hooks/useActiveBranch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  branch_id?: string | null;
  branch_name?: string | null;
}

interface RoleInfo {
  value: string;
  label: string;
  description: string;
  icon: any;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  permissions: string[];
}

const rolesInfo: RoleInfo[] = [
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Controle total do sistema',
    icon: Shield,
    variant: 'destructive',
    permissions: [
      'Gerenciar usuários e permissões',
      'Configurar filiais e turnos',
      'Configurar descontos e fidelidade',
      'Definir metas de vendas',
      'Acessar todos os relatórios',
      'Gerenciar produtos e categorias',
      'Controlar estoque',
      'Realizar vendas no PDV',
    ],
  },
  {
    value: 'manager',
    label: 'Gerente',
    description: 'Gerenciamento de operações',
    icon: Briefcase,
    variant: 'default',
    permissions: [
      'Visualizar relatórios gerenciais',
      'Gerenciar produtos e categorias',
      'Controlar estoque',
      'Autorizar movimentações de caixa',
      'Realizar vendas no PDV',
      'Visualizar configurações',
    ],
  },
  {
    value: 'stock_clerk',
    label: 'Estoquista',
    description: 'Controle de estoque e produtos',
    icon: Package,
    variant: 'secondary',
    permissions: [
      'Gerenciar produtos e categorias',
      'Controlar entrada e saída de estoque',
      'Realizar transferências entre filiais',
      'Imprimir etiquetas de produtos',
      'Visualizar relatórios de estoque',
    ],
  },
  {
    value: 'operator',
    label: 'Operador de Caixa',
    description: 'Operação do PDV',
    icon: User,
    variant: 'outline',
    permissions: [
      'Realizar vendas no PDV',
      'Abrir e fechar caixa',
      'Cadastrar clientes',
      'Consultar estoque',
      'Visualizar histórico de vendas próprias',
    ],
  },
];

export const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [changeBranchDialogOpen, setChangeBranchDialogOpen] = useState(false);
  const [changingBranchUser, setChangingBranchUser] = useState<UserWithRoles | null>(null);
  const [selectedNewBranchId, setSelectedNewBranchId] = useState<string>('');
  const [confirmChangeBranch, setConfirmChangeBranch] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [passwordChangeUser, setPasswordChangeUser] = useState<UserWithRoles | null>(null);
  const [newPasswordData, setNewPasswordData] = useState({ password: '', confirmPassword: '', oldPassword: '' });
  const [loading, setLoading] = useState(false);
  const { usersLimit } = useSubscription();
  const { branches } = useActiveBranch();
  const { user: currentUser } = useAuth();

  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    fullName: '',
    branchId: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get<UserWithRoles[]>('/users');
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Erro ao carregar usuários');
      setUsers([]);
    }
  };

  const handleEditUser = (user: UserWithRoles) => {
    setEditingUser(user);
    setSelectedRoles(user.roles);
    setDialogOpen(true);
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;

    // Impedir que o admin remova sua própria permissão de admin
    if (editingUser.id === currentUser?.id && editingUser.roles.includes('admin') && !selectedRoles.includes('admin')) {
      toast.error('Você não pode remover sua própria permissão de administrador');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/users/${editingUser.id}/roles`, {
        roles: selectedRoles
      });

      toast.success('Permissões atualizadas com sucesso!');
      setDialogOpen(false);
      setEditingUser(null);
      setSelectedRoles([]);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating roles:', error);
      toast.error(error.response?.data?.error || 'Erro ao atualizar permissões');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleValue: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleValue)
        ? prev.filter(r => r !== roleValue)
        : [...prev, roleValue]
    );
  };

  const getRoleInfo = (roleValue: string) => {
    return rolesInfo.find(r => r.value === roleValue);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/users', {
        email: newUserData.email,
        password: newUserData.password,
        fullName: newUserData.fullName,
        branchId: newUserData.branchId,
        role: 'operator', // Default role
      });

      toast.success('Usuário adicionado com sucesso!');
      setAddUserDialogOpen(false);
      setNewUserData({ email: '', password: '', fullName: '', branchId: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.response?.data?.error || 'Erro ao adicionar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChangeBranchDialog = (user: UserWithRoles) => {
    setChangingBranchUser(user);
    setSelectedNewBranchId(user.branch_id || '');
    setConfirmChangeBranch(false);
    setChangeBranchDialogOpen(true);
  };

  const handleOpenChangePasswordDialog = (user: UserWithRoles) => {
    setPasswordChangeUser(user);
    setNewPasswordData({ password: '', confirmPassword: '', oldPassword: '' });
    setChangePasswordDialogOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChangeUser) return;
    if (newPasswordData.password !== newPasswordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPasswordData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Require old password if target user is admin
    if (passwordChangeUser.roles.includes('admin') && !newPasswordData.oldPassword && currentUser?.id === passwordChangeUser.id) {
      toast.error('A senha atual é obrigatória para administradores');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/users/${passwordChangeUser.id}/password`, {
        newPassword: newPasswordData.password,
        currentPassword: newPasswordData.oldPassword,
      });

      toast.success('Senha alterada com sucesso!');
      setChangePasswordDialogOpen(false);
      setPasswordChangeUser(null);
      setNewPasswordData({ password: '', confirmPassword: '', oldPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeBranch = async () => {
    if (!changingBranchUser || !selectedNewBranchId || !confirmChangeBranch) {
      toast.error('Por favor, selecione uma filial e confirme a mudança');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/users/${changingBranchUser.id}/branch`, {
        branchId: selectedNewBranchId
      });

      toast.success('Filial do usuário alterada com sucesso!');
      setChangeBranchDialogOpen(false);
      setChangingBranchUser(null);
      setSelectedNewBranchId('');
      setConfirmChangeBranch(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error changing user branch:', error);
      toast.error(error.response?.data?.error || 'Erro ao alterar filial do usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gerenciamento de Usuários e Permissões
                <span className="text-sm text-muted-foreground">
                  ({users.length}/{usersLimit})
                </span>
              </CardTitle>
              <CardDescription>
                Gerencie as permissões de acesso de cada usuário no sistema
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <UpgradeButton type="users" />
              {users.length < usersLimit && (
                <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                      <DialogDescription>
                        Crie um novo usuário para sua equipe. O usuário receberá permissões de operador por padrão.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <Label htmlFor="fullName">Nome Completo *</Label>
                        <Input
                          id="fullName"
                          value={newUserData.fullName}
                          onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Senha *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                          required
                          minLength={6}
                        />
                      </div>
                      <div>
                        <Label htmlFor="branch">Filial *</Label>
                        <Select
                          value={newUserData.branchId}
                          onValueChange={(value) => setNewUserData({ ...newUserData, branchId: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a filial" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.code} - {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Adicionando...' : 'Adicionar Usuário'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Sobre as Permissões</AlertTitle>
            <AlertDescription>
              Cada usuário pode ter uma ou mais permissões. As permissões controlam quais áreas e funcionalidades do sistema o usuário pode acessar.
            </AlertDescription>
          </Alert>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {user.branch_name || <span className="text-muted-foreground">Sem filial</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => {
                          const roleInfo = getRoleInfo(role);
                          if (!roleInfo) return null;
                          const Icon = roleInfo.icon;
                          return (
                            <Badge key={role} variant={roleInfo.variant}>
                              <Icon className="w-3 h-3 mr-1" />
                              {roleInfo.label}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem permissões</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Esconde editar permissões e mudar filial para propósitos de admin se o usuário alvo for admin e o atual não for */}
                      {(!user.roles.includes('admin') || currentUser?.roles.includes('admin')) && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditUser(user)}
                            title="Editar permissões"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenChangeBranchDialog(user)}
                            title="Mudar filial"
                          >
                            <Building2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenChangePasswordDialog(user)}
                        title="Alterar Senha"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Permissões</DialogTitle>
            <DialogDescription>
              Selecione as permissões para {editingUser?.full_name}. Note que a permissão de Administrador é exclusiva para donos do sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {rolesInfo
              .filter(role => role.value !== 'admin') // Remove admin from selectable roles
              .map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRoles.includes(role.value);

                return (
                  <div
                    key={role.value}
                    className={`border rounded-lg p-4 ${isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={role.value}
                        checked={isSelected}
                        onCheckedChange={() => toggleRole(role.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={role.value}
                          className="flex items-center gap-2 text-base font-semibold cursor-pointer"
                        >
                          <Icon className="w-4 h-4" />
                          {role.label}
                          <Badge variant={role.variant} className="ml-2">
                            {role.value}
                          </Badge>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                          {role.description}
                        </p>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Permissões incluídas:
                          </p>
                          <ul className="text-sm space-y-1">
                            {role.permissions.map((permission, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span className="text-muted-foreground">{permission}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRoles} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Mudança de Filial */}
      <Dialog open={changeBranchDialogOpen} onOpenChange={setChangeBranchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mudar Filial do Usuário</DialogTitle>
            <DialogDescription>
              Mudar {changingBranchUser?.full_name} para uma nova filial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label className="text-sm font-semibold">Filial Atual</Label>
              <div className="flex items-center gap-2 mt-2 p-3 bg-muted rounded-md">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {changingBranchUser?.branch_name || 'Sem filial'}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="newBranch">Nova Filial *</Label>
              <Select
                value={selectedNewBranchId}
                onValueChange={setSelectedNewBranchId}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione a nova filial" />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter(b => b.id !== changingBranchUser?.branch_id)
                    .map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.code} - {branch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>⚠️ ATENÇÃO - Leia Cuidadosamente</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p className="font-semibold">Ao mudar este usuário de filial:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Todo o histórico de vendas dele na filial atual permanecerá vinculado à filial anterior</li>
                  <li>Relatórios da filial anterior incluirão apenas vendas realizadas até agora</li>
                  <li>Novas vendas serão vinculadas à nova filial</li>
                </ul>
                <p className="font-semibold text-sm mt-3">📋 RECOMENDAÇÃO:</p>
                <p className="text-sm">Faça backup dos relatórios desta filial antes de prosseguir!</p>
              </AlertDescription>
            </Alert>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-md">
              <Checkbox
                id="confirmChange"
                checked={confirmChangeBranch}
                onCheckedChange={(checked) => setConfirmChangeBranch(checked === true)}
              />
              <Label
                htmlFor="confirmChange"
                className="text-sm cursor-pointer leading-tight"
              >
                Entendo as consequências e quero prosseguir com a mudança de filial
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangeBranchDialogOpen(false);
                setConfirmChangeBranch(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangeBranch}
              disabled={loading || !selectedNewBranchId || !confirmChangeBranch}
              variant="destructive"
            >
              {loading ? 'Alterando...' : 'Confirmar Mudança'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Alterar a senha de acesso de {passwordChangeUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            {passwordChangeUser?.roles.includes('admin') && currentUser?.id === passwordChangeUser.id && (
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Senha Atual *</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={newPasswordData.oldPassword}
                  onChange={(e) => setNewPasswordData({ ...newPasswordData, oldPassword: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPasswordData.password}
                onChange={(e) => setNewPasswordData({ ...newPasswordData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={newPasswordData.confirmPassword}
                onChange={(e) => setNewPasswordData({ ...newPasswordData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setChangePasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
