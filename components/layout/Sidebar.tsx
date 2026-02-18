import React from 'react';
import { LayoutDashboard, PieChart, Users, Settings, LogOut, Palette, LayoutGrid, ClipboardList, ArrowDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/src/auth/useAuth';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeView: 'dashboard' | 'settings' | 'campaigns' | 'creatives' | 'demographics' | 'ads' | 'summary' | 'planning';
  setActiveView: (view: 'dashboard' | 'settings' | 'campaigns' | 'creatives' | 'demographics' | 'ads' | 'summary' | 'planning') => void;
  isDemoMode: boolean;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  className?: string;
}

export function Sidebar({ className, activeView, setActiveView, isDemoMode, userRole, userName, userEmail }: SidebarProps) {
  const { logout } = useAuth();

  const NavItem = ({ icon: Icon, label, view }: any) => (
    <Button
      variant={activeView === view ? "secondary" : "ghost"}
      className={cn("w-full justify-start gap-3", activeView === view && "bg-secondary text-primary font-semibold")}
      onClick={() => view && setActiveView(view)}
    >
      <Icon size={20} />
      {label}
    </Button>
  );

  const canAccessSettings = userRole === 'admin' || userRole === 'executive';

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    await logout();
    window.location.href = "/";
  };

  return (
    <div className={cn("flex flex-col h-full bg-card border-r py-6 px-4", className)}>
      <div className="mb-8 px-2 flex justify-center">
        <img src="https://docs.qozt.com.br/logo/op7/logo_azul_recorte.svg" alt="OP7 Performance" className="h-20 w-auto" />
      </div>

      <nav className="flex-1 space-y-2">
        <NavItem icon={ClipboardList} label="Resumo Gerencial" view="summary" />
        <NavItem icon={LayoutDashboard} label="Visão Gerencial" view="dashboard" />
        <NavItem icon={ArrowDown} label="Planejamento (Funil)" view="planning" />
        <NavItem icon={PieChart} label="Campanhas" view="campaigns" />
        <NavItem icon={LayoutGrid} label="Anúncios (Tabela)" view="ads" />
        <NavItem icon={Palette} label="Criativos (Galeria)" view="creatives" />
        <NavItem icon={Users} label="Públicos" view="demographics" />

        {canAccessSettings && (
          <NavItem icon={Settings} label="Configurações" view="settings" />
        )}
      </nav>

      <div className="mt-auto pt-6 border-t">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-xs font-medium text-foreground" title={userName}>
              {userName || 'Usuário Conectado'}
            </span>
            <span className="truncate text-[10px] text-muted-foreground" title={userEmail}>
              {userEmail || 'Sair do sistema'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors border border-transparent hover:border-destructive/20"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
