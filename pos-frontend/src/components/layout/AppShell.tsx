import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LogOut,
  Store,
  ShoppingBag,
  Users,
  Settings,
  Package,
  Receipt,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Store;
  roles?: Role[]; // si se omite, visible para todos los roles autenticados
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Punto de Venta', icon: ShoppingBag },
  { to: '/inventory', label: 'Inventario', icon: Package, roles: ['ADMIN', 'MANAGER'] },
  { to: '/sales', label: 'Ventas', icon: Receipt, roles: ['ADMIN', 'MANAGER'] },
  { to: '/reports', label: 'Reportes', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { to: '/analytics', label: 'Asistente IA', icon: Sparkles, roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Usuarios', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { to: '/settings', label: 'Configuración', icon: Settings, roles: ['ADMIN'] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className="flex h-screen flex-col bg-surface">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-panel px-6 py-3">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-register-glow">
              <Store className="h-4 w-4" />
            </div>
            <p className="hidden font-display text-sm font-semibold leading-none text-ink xl:block">
              Sistema POS
            </p>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {visibleItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                title={label}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-ink text-white' : 'text-ink/55 hover:bg-surface hover:text-ink'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none text-ink">{user?.name}</p>
            <p className="mt-1 text-xs leading-none capitalize text-ink/40">
              {user?.role.toLowerCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink/60 transition hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
