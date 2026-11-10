import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface UpgradeButtonProps {
  type: 'branch' | 'users';
  disabled?: boolean;
}

export const UpgradeButton = ({ type, disabled }: UpgradeButtonProps) => {

  const handleUpgrade = () => {
    // For local-till version, upgrades might be handled differnetly or just contact support
    window.open('https://your-support-url.com/contact', '_blank');
  };

  return (
    <Button
      onClick={handleUpgrade}
      disabled={disabled}
      variant="default"
      size="sm"
      className="gap-2"
    >
      <ShoppingCart className="w-4 h-4" />
      {type === 'branch' ? 'Adicionar Filial' : 'Adicionar 10 Usuários'}
      {/* Removed price for local version or update as needed */}
    </Button>
  );
};
