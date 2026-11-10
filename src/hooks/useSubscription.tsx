import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

interface SubscriptionContextType {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'past_due';
  features: string[];
  maxBranches: number;
  maxUsers: number;
  branchesLimit: number;
  usersLimit: number;
  isLoading: boolean;
  checkPermission: (permission: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Por enquanto, mockamos os limites pois é uma versão local
      // Em produção, isso viria da API
      setSubscription({
        plan: 'enterprise',
        status: 'active',
        features: ['all'],
        maxBranches: 99,
        maxUsers: 99,
      });
      setIsLoading(false);
    }
  }, [user]);

  const checkPermission = (permission: string) => {
    return true; // Local version has all permissions enabled by default
  };

  return (
    <SubscriptionContext.Provider
      value={{
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'inactive',
        features: subscription?.features || [],
        maxBranches: subscription?.maxBranches || 1,
        maxUsers: subscription?.maxUsers || 1,
        branchesLimit: subscription?.maxBranches || 1,
        usersLimit: subscription?.maxUsers || 1,
        isLoading,
        checkPermission,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
