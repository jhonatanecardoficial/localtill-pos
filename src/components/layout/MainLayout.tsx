import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';

interface MainLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'pdv-sidebar-collapsed';

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const desktopSidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const mainMargin = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64';

  return (
    <div className="min-h-screen flex bg-background w-full max-w-full overflow-x-hidden">
      {/* Mobile Header - only visible on mobile */}
      <MobileHeader
        onMenuClick={() => setMobileMenuOpen(true)}
        userName={user.full_name}
        branchName={user.branch_name || ''}
      />

      {/* Mobile Sidebar Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar">
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - fixed position, collapsible */}
      <div className={`hidden lg:block fixed top-0 left-0 h-screen ${desktopSidebarWidth} z-30 transition-all duration-300`}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      {/* Main Content - offset by sidebar width on desktop */}
      <main className={`flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden pt-14 lg:pt-0 ${mainMargin} transition-all duration-300 relative`}>
        {/* Sync Status - Floating on Desktop */}
        <div className="absolute top-4 right-4 z-10 hidden lg:block">
          <SyncStatusIndicator />
        </div>

        {children}
      </main>
    </div>
  );
};
