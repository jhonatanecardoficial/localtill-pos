import { Menu, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface MobileHeaderProps {
    onMenuClick: () => void;
    userName?: string;
    branchName?: string;
}

export const MobileHeader = ({ onMenuClick, userName, branchName }: MobileHeaderProps) => {
    return (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border h-14 flex items-center px-4 gap-3">
            <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
                <Menu className="w-6 h-6" />
            </Button>

            <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
                <span className="font-bold text-sidebar-foreground">PDV</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-sidebar-foreground/70">
                {branchName && (
                    <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span className="max-w-[80px] truncate">{branchName}</span>
                    </div>
                )}
                {userName && (
                    <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="max-w-[60px] truncate">{userName}</span>
                    </div>
                )}
            </div>
        </header>
    );
};
