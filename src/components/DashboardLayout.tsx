import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Outlet } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-end px-6 gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary ml-2">
            AD
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
