import React from 'react';
import { LayoutDashboard, PieChart, Users, Settings, LogOut, Palette, LayoutGrid, ClipboardList, ArrowDown, TrendingUp, Table } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/src/auth/useAuth';
import { useUserAccess } from '@/src/auth/useUserAccess';

type ActiveView = 'dashboard' | 'settings' | 'campaigns' | 'creatives' | 'executive' | 'demographics' | 'ads' | 'summary' | 'planning';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isDemoMode: boolean;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  className?: string;
}

// Mapeamento estático de todas as rotas do sidebar
const NAV_ITEMS: { icon: any; label: string; view: ActiveView; moduleIds: string[] }[] = [
  { icon: ClipboardList, label: 'Resumo Gerencial',   view: 'summary',      moduleIds: ['meta_ads_summary'] },
  { icon: LayoutDashboard, label: 'Visão Gerencial',  view: 'dashboard',    moduleIds: ['meta_ads_dashboard'] },
  { icon: TrendingUp,    label: 'Visão Executiva',    view: 'executive',    moduleIds: ['meta_ads_executive'] },
  { icon: ArrowDown,     label: 'Planejamento',       view: 'planning',     moduleIds: ['planning'] },
  { icon: PieChart,      label: 'Campanhas',          view: 'campaigns',    moduleIds: ['meta_ads_campaigns'] },
  { icon: Table,         label: 'Anúncios',           view: 'ads',          moduleIds: ['meta_ads_ads'] },
  { icon: Palette,       label: 'Criativos',          view: 'creatives',    moduleIds: ['meta_ads_creatives'] },
  { icon: Users,         label: 'Públicos',           view: 'demographics', moduleIds: ['meta_ads_demographics'] },
  { icon: Settings,      label: 'Configurações',      view: 'settings',     moduleIds: ['settings'] },
];

// Fallback legado por role quando módulos ainda não foram carregados
const LEGACY_VISIBLE: Record<string, ActiveView[]> = {
  superadmin: ['summary', 'dashboard', 'executive', 'planning', 'campaigns', 'ads', 'creatives', 'demographics', 'settings'],
  admin:      ['summary', 'dashboard', 'executive', 'planning', 'campaigns', 'ads', 'creatives', 'demographics', 'settings'],
  manager:    ['summary', 'dashboard', 'executive', 'campaigns', 'ads', 'creatives', 'demographics'],
  client:     ['summary', 'dashboard'],
  viewer:     ['summary'],
};

export function Sidebar({ className, activeView, setActiveView, isDemoMode, userRole, userName, userEmail }: SidebarProps) {
  const { logout, userProfile } = useAuth();
  const { canAccessModule, allowedRoutes } = useUserAccess(userProfile ?? null);

  const isVisible = (item: typeof NAV_ITEMS[0]): boolean => {
    // Se há permissões de módulo carregadas, usa elas
    if (userProfile?.module_permissions?.length) {
      return item.moduleIds.some(mid => canAccessModule(mid));
    }
    // Fallback legado
    const role = userRole ?? 'viewer';
    return (LEGACY_VISIBLE[role] ?? []).includes(item.view);
  };

  const NavItem = ({ icon: Icon, label, view }: { icon: any; label: string; view: ActiveView }) => (
    <Button
      variant={activeView === view ? 'secondary' : 'ghost'}
      className={cn('w-full justify-start gap-3', activeView === view && 'bg-secondary text-primary font-semibold')}
      onClick={() => setActiveView(view)}
    >
      <Icon size={20} />
      {label}
    </Button>
  );

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    await logout();
    window.location.href = '/';
  };

  return (
    <div className={cn('flex flex-col h-full bg-card border-r py-6 px-4', className)}>
      <div className="mb-8 px-2 flex justify-center">
        <img src="https://docs.qozt.com.br/logo/op7/logo_azul_recorte.svg" alt="OP7 Performance" className="h-20 w-auto" />
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.filter(isVisible).map(item => (
          <NavItem key={item.view} icon={item.icon} label={item.label} view={item.view} />
        ))}
      </nav>

      {isDemoMode && (
        <div className="mx-2 mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Modo demonstração ativo
        </div>
      )}

      <div className="mt-auto pt-6 border-t">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-xs font-medium text-foreground" title={userName}>
              {userName || 'Usuário Conectado'}
            </span>
            <span className="truncate text-[10px] text-muted-foreground" title={userEmail}>
              {userEmail || ''}
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
