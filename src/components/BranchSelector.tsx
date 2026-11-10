import { Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveBranch } from '@/hooks/useActiveBranch';

export const BranchSelector = () => {
  const { activeBranch, branches, loading, setActiveBranch } = useActiveBranch();

  if (loading || branches.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select
        value={activeBranch?.id || ''}
        onValueChange={setActiveBranch}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecione a filial">
            {activeBranch?.name}
          </SelectValue>
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
  );
};
