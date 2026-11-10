import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Store,
  FolderTree,
  Tag,
  UserCheck,
  TrendingUp,
  Trophy,
  Building2,
  User,
  Info,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { canViewMenuItem } from '@/lib/permissions';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'PDV', path: '/pos' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: FolderTree, label: 'Categorias', path: '/categories' },
  { icon: Store, label: 'Estoque', path: '/inventory' },
  { icon: UserCheck, label: 'Clientes', path: '/customers' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: TrendingUp, label: 'Lucratividade', path: '/profitability' },
  { icon: Trophy, label: 'Vendedores', path: '/salesmen' },
  { icon: Tag, label: 'Etiquetas', path: '/labels' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
  { icon: Info, label: 'Sobre', path: '/about' },
];

export const Sidebar = ({ className, onNavigate, collapsed = false, onToggle }: SidebarProps) => {
  const location = useLocation();
  const { signOut, userRoles, user } = useAuth();

  const visibleMenuItems = menuItems.filter(item => {
    if (item.label === 'Dashboard' && userRoles.includes('operator') && !userRoles.includes('admin') && !userRoles.includes('manager')) {
      return false;
    }
    return canViewMenuItem(userRoles, item.path);
  });

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'bg-sidebar border-r border-sidebar-border flex flex-col h-screen overflow-hidden transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Header with toggle button */}
        <div className={cn(
          'p-3 border-b border-sidebar-border flex items-center',
          collapsed ? 'justify-center' : 'justify-between gap-3'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-sidebar-primary rounded-xl flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-sidebar-foreground leading-tight truncate">Sistema PDV</h1>
                <p className="text-xs text-sidebar-foreground/60">Multi-Filial</p>
              </div>
            </div>
          )}

          {onToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-8 h-8"
                  aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                >
                  {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? 'Expandir menu' : 'Recolher menu'}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Icon for collapsed logo area */}
          {collapsed && !onToggle && (
            <div className="w-9 h-9 bg-sidebar-primary rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        {/* User Info - only visible when expanded */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-sidebar-border space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-sidebar-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sidebar-foreground/60">Usuário</p>
                <p className="font-medium text-sidebar-foreground truncate text-sm">
                  {user?.full_name || 'Carregando...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-sidebar-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sidebar-foreground/60">Filial Vinculada</p>
                <p className="font-medium text-sidebar-foreground truncate text-sm">
                  {user?.branch_name ? user.branch_name : 'Sem filial'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed user avatar */}
        {collapsed && (
          <div className="py-3 border-b border-sidebar-border flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center cursor-default">
                  <User className="w-4 h-4 text-sidebar-accent-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>
                  <p className="font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.branch_name || 'Sem filial'}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            const btn = (
              <Link key={item.path} to={item.path} onClick={onNavigate}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full transition-colors',
                    collapsed ? 'justify-center px-0 h-10' : 'justify-start gap-3 h-10',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Button>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return btn;
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          'border-t border-sidebar-border bg-sidebar/50',
          collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3 space-y-2'
        )}>
          {!collapsed && (
            <div className="px-1">
              <SyncStatusIndicator />
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
                  collapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full justify-start gap-3 h-10'
                )}
                onClick={signOut}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="text-sm">Sair</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sair</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};
