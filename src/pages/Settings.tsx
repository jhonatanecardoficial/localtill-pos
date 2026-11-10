import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Target, Percent, Award, Building2, Users, Clock, Wifi, HardDrive } from 'lucide-react';
import { SalesTargetsSettings } from '@/components/settings/SalesTargetsSettings';
import { DiscountRulesSettings } from '@/components/settings/DiscountRulesSettings';
import { LoyaltyProgramSettings } from '@/components/settings/LoyaltyProgramSettings';
import { BranchManagement } from '@/components/settings/BranchManagement';
import { UserManagement } from '@/components/settings/UserManagement';
import { ShiftManagement } from '@/components/settings/ShiftManagement';
import { CashManagement } from '@/components/settings/CashManagement';
import { useAuth } from '@/hooks/useAuth';
import { canEditSettings, canManageUsers, canManageBranches } from '@/lib/permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { BackupManagement } from '@/components/settings/BackupManagement';
import { Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';


const Settings = () => {
  const { userRoles } = useAuth();
  const [serverInfo, setServerInfo] = useState<{ ip: string; port: number; url: string } | null>(null);

  const isAdmin = canManageUsers(userRoles);
  const isReadOnly = !canEditSettings(userRoles);
  const canSeeBranches = canManageBranches(userRoles);
  const canSeeUsers = canManageUsers(userRoles);

  useEffect(() => {
    api.get<any>('/server-info')
      .then(data => setServerInfo(data))
      .catch(() => { });
  }, []);

  return (
    <MainLayout>
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="mb-4 lg:mb-6">
          <div className="flex items-center gap-2 lg:gap-3 mb-2">
            <SettingsIcon className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Configurações</h1>
          </div>
          <p className="text-sm lg:text-base text-muted-foreground">
            Configure todos os aspectos do sistema PDV
          </p>

          {serverInfo && (
            <Card className="mt-4 border-primary/30 bg-primary/5">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <Wifi className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Endereço de acesso na rede:
                    <span className="ml-2 font-mono text-primary font-bold text-base">{serverInfo.url}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Informe este endereço para os outros terminais se conectarem ao servidor.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isReadOnly && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Você está no modo de visualização. Apenas administradores podem editar as configurações.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Tabs defaultValue="targets" className="space-y-4">
          {/* Mobile: horizontal scroll tabs */}
          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
            <TabsList className="inline-flex lg:grid w-auto lg:w-full min-w-max lg:min-w-0 gap-1" style={{
              gridTemplateColumns: isAdmin && canSeeBranches && canSeeUsers ? 'repeat(9, 1fr)' : canSeeBranches && canSeeUsers ? 'repeat(8, 1fr)' : 'repeat(6, 1fr)'
            }}>
              <TabsTrigger value="general" className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 text-xs lg:text-sm whitespace-nowrap">
                <Globe className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Geral</span>
                <span className="sm:hidden">Geral</span>
              </TabsTrigger>
              <TabsTrigger value="targets" className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 text-xs lg:text-sm whitespace-nowrap">
                <Target className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Metas de Vendas</span>
                <span className="sm:hidden">Metas</span>
              </TabsTrigger>
              <TabsTrigger value="discounts" className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 text-xs lg:text-sm whitespace-nowrap">
                <Percent className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Descontos</span>
                <span className="sm:hidden">Desc.</span>
              </TabsTrigger>
              <TabsTrigger value="loyalty" className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 text-xs lg:text-sm whitespace-nowrap">
                <Award className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Fidelidade</span>
                <span className="sm:hidden">Fidel.</span>
              </TabsTrigger>
              <TabsTrigger value="shifts" className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 text-xs lg:text-sm whitespace-nowrap">
                <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Turnos</span>
                <span className="sm:hidden">Turnos</span>
              </TabsTrigger>
              {canSeeBranches && (
                <TabsTrigger value="branches" className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 text-xs lg:text-sm whitespace-nowrap">
                  <Building2 className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Filiais</span>
                  <span className="sm:hidden">Filiais</span>
                </TabsTrigger>
              )}
              {canSeeUsers && (
                <TabsTrigger value="users" className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 text-xs lg:text-sm whitespace-nowrap">
                  <Users className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span className="hidden sm:inline">Usuários</span>
                  <span className="sm:hidden">Users</span>
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="backup" className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 text-xs lg:text-sm whitespace-nowrap">
                  <HardDrive className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Backup</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="targets">
            <SalesTargetsSettings />
          </TabsContent>

          <TabsContent value="discounts">
            <DiscountRulesSettings />
          </TabsContent>

          <TabsContent value="loyalty">
            <LoyaltyProgramSettings />
          </TabsContent>

          <TabsContent value="shifts" className="space-y-4">
            <ShiftManagement />
            <CashManagement />
          </TabsContent>

          {canSeeBranches && (
            <TabsContent value="branches">
              <BranchManagement />
            </TabsContent>
          )}

          {canSeeUsers && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="backup" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-primary" />
                    Backup e Restauração
                  </CardTitle>
                  <CardDescription>
                    Gerencie backups do banco de dados. Crie, baixe ou restaure backups para proteger seus dados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BackupManagement />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
