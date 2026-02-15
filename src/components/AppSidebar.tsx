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
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { title: 'Tableau de Bord', url: '/', icon: LayoutDashboard },
  { title: 'Membres', url: '/members', icon: Users },
  { title: 'Abonnements', url: '/subscriptions', icon: CreditCard },
  { title: 'Entrée Live', url: '/live-entry', icon: ScanLine },
  { title: 'Paiements', url: '/payments', icon: Receipt },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 relative`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center neon-glow flex-shrink-0">
          <Dumbbell className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-display text-sm font-bold text-primary tracking-wider">CYBERGYM</h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-widest">MANAGEMENT</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-primary/20 transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-primary" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-primary" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 group"
            activeClassName="bg-primary/10 text-primary neon-glow"
          >
            <item.icon className="w-5 h-5 flex-shrink-0 group-hover:text-primary transition-colors" />
            {!collapsed && (
              <span className="text-sm font-medium tracking-wide">{item.title}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
