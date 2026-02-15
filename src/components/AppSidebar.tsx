import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ScanLine,
  Receipt,
  LogOut,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { role, signOut } = useAuth();

  const navItems = [
    { title: 'Tableau de Bord', url: '/', icon: LayoutDashboard },
    { title: 'Membres', url: '/members', icon: Users },
    { title: 'Abonnements', url: '/subscriptions', icon: CreditCard },
    { title: 'Entrée Live', url: '/live-entry', icon: ScanLine },
    { title: 'Paiements', url: '/payments', icon: Receipt },
    ...(role === 'admin' ? [
      { title: 'Paramètres', url: '/settings', icon: Settings },
      { title: 'Journal d\'Audit', url: '/audit-logs', icon: ClipboardList },
    ] : []),
    { title: 'Mon Profil', url: '/profile', icon: User },
  ];

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 relative`}
    >
      <div className="h-14 px-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-foreground tracking-tight">GymManager</h1>
            <p className="text-[10px] text-muted-foreground">Gestion de salle</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-muted-foreground" /> : <ChevronLeft className="w-3 h-3 text-muted-foreground" />}
      </button>

      <nav className="flex-1 p-2 space-y-0.5 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 text-sm"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full text-sm"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
