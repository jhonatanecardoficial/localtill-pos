import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";

import POSNew from './pages/POSNew';
import Inventory from './pages/Inventory';
import Reports from "@/pages/Reports";
import ProductLabels from "@/pages/ProductLabels";
import Customers from "@/pages/Customers";
import ProfitabilityReport from "@/pages/ProfitabilityReport";
import SalesmanDashboard from "@/pages/SalesmanDashboard";
import OperatorPerformance from "@/pages/OperatorPerformance";
import CashRegisterReports from "@/pages/CashRegisterReports";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";
import ServerSetup from "./pages/ServerSetup";
import About from "./pages/About";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" duration={2000} toastOptions={{ style: { marginTop: '4rem' } }} />
      <HashRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <CurrencyProvider>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/server-setup" element={<ServerSetup />} />

                {/* Rotas protegidas */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                {/* PDV - operator, manager, admin */}
                <Route path="/pos" element={<ProtectedRoute allowedRoles={['operator', 'manager', 'admin']}><POSNew /></ProtectedRoute>} />


                <Route path="/products" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'stock_clerk']}><Products /></ProtectedRoute>} />
                <Route path="/categories" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'stock_clerk']}><Categories /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'stock_clerk']}><Inventory /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute allowedRoles={['operator', 'manager', 'admin', 'stock_clerk']}><Customers /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><Reports /></ProtectedRoute>} />
                <Route path="/profitability" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><ProfitabilityReport /></ProtectedRoute>} />
                <Route path="/salesmen" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><SalesmanDashboard /></ProtectedRoute>} />
                <Route path="/operator-performance" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><OperatorPerformance /></ProtectedRoute>} />
                <Route path="/cash-register-reports" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><CashRegisterReports /></ProtectedRoute>} />
                <Route path="/labels" element={<ProtectedRoute allowedRoles={['manager', 'admin', 'stock_clerk']}><ProductLabels /></ProtectedRoute>} />

                {/* Configurações */}
                <Route path="/settings" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><Settings /></ProtectedRoute>} />
                <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </CurrencyProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
