import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Database, ArrowLeftRight, LogOut, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen dark">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-surface-border flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Database className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-surface-foreground">PA Migration Hub</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <NavLink
            to="/environments"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-surface-foreground hover:bg-surface-muted'
              }`
            }
          >
            <Server className="h-4 w-4" />
            Environments
          </NavLink>
          <NavLink
            to="/migrate"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-surface-foreground hover:bg-surface-muted'
              }`
            }
          >
            <ArrowLeftRight className="h-4 w-4" />
            Migration
          </NavLink>
        </nav>

        <div className="p-4 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground truncate">{user?.username}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-background overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
