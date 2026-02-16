import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Subscriptions from "./pages/Subscriptions";
import LiveEntry from "./pages/LiveEntry";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import AuditLogs from "./pages/AuditLogs";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function StaffRedirect({ children }: { children: React.ReactNode }) {
  const { can } = usePermissions();
  if (!can('view_dashboard_kpis')) return <Navigate to="/members" replace />;
  return <>{children}</>;
}

function PermissionGuard({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can } = usePermissions();
  if (!can(permission as any)) return <Navigate to="/members" replace />;
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/" element={<StaffRedirect><Dashboard /></StaffRedirect>} />
                <Route path="/members" element={<Members />} />
                <Route path="/subscriptions" element={<PermissionGuard permission="payments_view"><Subscriptions /></PermissionGuard>} />
                <Route path="/live-entry" element={<LiveEntry />} />
                <Route path="/payments" element={<PermissionGuard permission="payments_view"><Payments /></PermissionGuard>} />
                <Route path="/settings" element={<PermissionGuard permission="settings_access"><Settings /></PermissionGuard>} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/audit-logs" element={<PermissionGuard permission="settings_access"><AuditLogs /></PermissionGuard>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
