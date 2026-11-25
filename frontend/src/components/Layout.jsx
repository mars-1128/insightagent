import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BarChart3,
  Database,
  History,
  ShieldCheck,
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Activity,
  Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/studio', label: 'Analytics Studio', icon: BarChart3 },
  { to: '/datasets', label: 'Datasets & CSV', icon: Database },
  { to: '/history', label: 'Task History', icon: History },
  { to: '/audit', label: 'Audit & Security', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/welcome', label: 'App Overview', icon: Home }
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        {/* Brand */}
        <div className="flex items-center justify-between px-2 py-2 mb-6">
          <Link to="/studio" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">
                InsightAgent
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Read-Only SQL Agent
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-white/60 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Agent Capability Pill */}
        <div className="mt-8 glass-panel-subtle p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Activity className="h-3.5 w-3.5 text-cyan-500" />
            <span>Aurora Glass Pipeline</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Plan → Edit → Tool Selection → Read-Only SQL → Stats → Chart &amp; Insights with Human Approval Gates.
          </p>
        </div>
      </div>

      {/* Footer / User */}
      <div className="space-y-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/[0.08]"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-cyan-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
            {theme === 'dark' ? 'Dark Aurora Glass' : 'Light Frosted Glass'}
          </span>
          <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] dark:bg-white/10">Switch</span>
        </button>

        <div className="glass-panel-subtle flex items-center justify-between px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
              {user?.name || 'Analyst'}
            </p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-500"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="glass-canvas flex">
      {/* Subtle Ambient Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-12 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Desktop Floating Glass Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 p-3 pr-0 relative z-10">
        <div className="sticky top-3 h-[calc(100vh-1.5rem)] glass-panel">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-64 m-2 glass-panel">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Bar */}
        <header className="m-3 mb-0 flex items-center justify-between glass-panel px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-slate-900 dark:text-white">InsightAgent</span>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
