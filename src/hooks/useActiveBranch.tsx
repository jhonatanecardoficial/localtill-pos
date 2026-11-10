import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from './useAuth';

interface Branch {
  id: string;
  name: string;
  code: string;
}

export const useActiveBranch = () => {
  const { user } = useAuth();
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchBranches();
    fetchActiveBranch();
  }, [user]);

  const fetchBranches = async () => {
    try {
      const data = await api.get<Branch[]>('/branches');
      const arr = Array.isArray(data) ? data : [];
      setBranches(arr.filter((b: any) => b.is_active));
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchActiveBranch = async () => {
    if (!user) return;

    try {
      if (user.branch_id) {
        const data = await api.get<Branch[]>('/branches');
        const arr = Array.isArray(data) ? data : [];
        const branch = arr.find((b: any) => b.id === user.branch_id);
        if (branch) {
          setActiveBranch(branch);
        }
      } else {
        // Fallback: pegar primeira filial
        const data = await api.get<Branch[]>('/branches');
        const arr = Array.isArray(data) ? data : [];
        const firstActive = arr.find((b: any) => b.is_active);
        if (firstActive) {
          await setUserActiveBranch(firstActive.id);
          setActiveBranch(firstActive);
        }
      }
    } catch (error) {
      console.error('Error fetching active branch:', error);
    } finally {
      setLoading(false);
    }
  };

  const setUserActiveBranch = async (branchId: string) => {
    if (!user) return;

    try {
      await api.put('/settings/active-branch', { branch_id: branchId });

      const newBranch = branches.find(b => b.id === branchId);
      if (newBranch) {
        setActiveBranch(newBranch);
      }
    } catch (error) {
      console.error('Error setting active branch:', error);
    }
  };

  return {
    activeBranch,
    branches,
    loading,
    setActiveBranch: setUserActiveBranch,
  };
};
