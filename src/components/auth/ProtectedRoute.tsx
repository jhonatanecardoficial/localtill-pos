import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canAccessPage, hasAnyRole } from '@/lib/permissions';
import { UserRole } from '@/types/auth'; // Updated import
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requiresAuth = true
}: ProtectedRouteProps) => {
  const { user, userRoles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Espera o loading terminar
    if (loading) return;

    // Se requer autenticação e não está logado
    if (requiresAuth && !user) {
      toast.error('Você precisa estar logado para acessar esta página');
      navigate('/auth');
      return;
    }

    // Se especificou roles permitidas, verifica se o usuário tem alguma delas
    if (allowedRoles && allowedRoles.length > 0) {
      // Aguarda userRoles ser carregado antes de verificar permissões
      if (!userRoles || userRoles.length === 0) {
        return;
      }

      if (!hasAnyRole(userRoles, allowedRoles)) {
        toast.error('Você não tem permissão para acessar esta página');
        navigate('/pos');
        return;
      }
    }
  }, [user, userRoles, loading, requiresAuth, allowedRoles, navigate]);

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};
