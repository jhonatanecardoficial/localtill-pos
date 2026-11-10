import { UserRole } from '@/types/auth';

// Definição de permissões por role
export const ROLE_PERMISSIONS = {
  admin: {
    pages: [
      '/dashboard',
      '/pos',
      '/products',
      '/categories',
      '/inventory',
      '/customers',
      '/reports',
      '/profitability',
      '/salesmen',
      '/labels',
      '/settings',
      '/operator-performance',
      '/cash-register-reports'
    ],
    canEditSettings: true,
    canManageUsers: true,
    canManageBranches: true,
    canViewAllReports: true,
  },
  manager: {
    pages: [
      '/dashboard',
      '/pos',
      '/products',
      '/categories',
      '/inventory',
      '/customers',
      '/reports',
      '/profitability',
      '/salesmen',
      '/labels',
      '/settings',
      '/operator-performance',
      '/cash-register-reports'
    ],
    canEditSettings: true,
    canManageUsers: true,
    canManageBranches: true,
    canViewAllReports: true,
  },
  stock_clerk: {
    pages: [
      '/dashboard',
      '/products',
      '/categories',
      '/inventory',
      '/labels',
    ],
    canEditSettings: false,
    canManageUsers: false,
    canManageBranches: false,
    canViewAllReports: false,
  },
  operator: {
    pages: [
      '/dashboard',
      '/pos',
      '/customers',
    ],
    canEditSettings: false,
    canManageUsers: false,
    canManageBranches: false,
    canViewAllReports: false,
  },
} as const;

// Verifica se o usuário tem acesso a uma página
export const canAccessPage = (userRoles: UserRole[], page: string): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  // Admin tem acesso a tudo
  if (userRoles.includes('admin')) return true;

  // Verifica se alguma das roles do usuário permite acesso à página
  return userRoles.some(role => {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions && permissions.pages.some(allowedPage => page.startsWith(allowedPage));
  });
};

// Verifica se o usuário pode editar configurações
export const canEditSettings = (userRoles: UserRole[]): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some(role => ROLE_PERMISSIONS[role]?.canEditSettings);
};

// Verifica se o usuário pode gerenciar usuários
export const canManageUsers = (userRoles: UserRole[]): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some(role => ROLE_PERMISSIONS[role]?.canManageUsers);
};

// Verifica se o usuário pode gerenciar filiais
export const canManageBranches = (userRoles: UserRole[]): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some(role => ROLE_PERMISSIONS[role]?.canManageBranches);
};

// Verifica se o usuário pode ver todos os relatórios
export const canViewAllReports = (userRoles: UserRole[]): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some(role => ROLE_PERMISSIONS[role]?.canViewAllReports);
};

// Verifica se o usuário tem alguma das roles especificadas
export const hasAnyRole = (userRoles: UserRole[], requiredRoles: UserRole[]): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  return requiredRoles.some(role => userRoles.includes(role));
};

// Verifica se o usuário pode ver o item do menu baseado nas páginas permitidas
export const canViewMenuItem = (userRoles: UserRole[], path: string): boolean => {
  return canAccessPage(userRoles, path);
};
