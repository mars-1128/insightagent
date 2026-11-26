import { useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
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
  Home,
  Plus,
  TerminalSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState({ datasets: 0, runs: 0, totalRows: 0 });

  const fetchCounts = useCallback(async () => {
    try {
      const [dsRes, runsRes] = await Promise.all([
        api.get('/api/datasets'),
        api.get('/api/agent/runs')
      ]);
      const dsList = dsRes.data?.datasets || [];
      setStats({
        datasets: dsList.length,
        runs: runsRes.data?.runs?.length || 0,
        totalRows: dsList.reduce((acc, d) => acc + Number(d.row_count || 0), 0)
      });
    } catch {
      // Ignore transient sidebar count fetch issues
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const handler = () => fetchCounts();
    window.addEventListener('insightagent:counts-changed', handler);
    return () => window.removeEventListener('insightagent:counts-changed', handler);
  }, [fetchCounts, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNewAnalysis = () => {
    setMobileOpen(false);
    navigate('/studio', { state: { newAnalysisAt: Date.now() } });
  };

  const workspaceItems = [
    { to: '/studio', label: 'Data Studio', icon: TerminalSquare },
    { to: '/datasets', label: 'Datasets & CSV', icon: Database, badge: stats.datasets },
    { to: '/history', label: 'Run History', icon: History, badge: stats.runs },
    { to: '/audit', label: 'SQL Audit Log', icon: ShieldCheck }
  ];

  const systemItems = [
    { to: '/settings', label: 'Preferences', icon: Settings },
    { to: '/welcome', label: 'Product Tour', icon: Home }
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-4">
        {/* Top Brand */}
        <div className="flex items-center justify-between px-1">
          <Link to="/studio" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/25 transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3">
              <BarChart3 className="h-5 w-5 stroke-[2.3]" />
            </div>
            <div>
              <span className="block font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Insight<span className="text-emerald-600 dark:text-emerald-400">Agent</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-teal-700 dark:text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                PG Read-Only
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

        {/* New Query Button */}
        <button
          onClick={handleNewAnalysis}
          className="aurora-btn flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          New Data Query
        </button>

        {/* Live Data Pulse Widget */}
        <div className="glass-panel-subtle glass-hover p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-cyan-300/80">
            <span>Workspace Pulse</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">LIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-100/80 px-2.5 py-1.5 dark:bg-white/[0.04]">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Tables</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.datasets}</span>
            </div>
            <div className="rounded-lg bg-slate-100/80 px-2.5 py-1.5 dark:bg-white/[0.04]">
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">Indexed Rows</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{stats.totalRows}</span>
            </div>
          </div>
        </div>

        {/* WORKSPACE Nav */}
        <div>
          <p className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Observatory
          </p>
          <nav className="space-y-1">
            {workspaceItems.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-teal-800 dark:text-emerald-300 shadow-sm'
                      : 'border border-transparent text-slate-600 hover:translate-x-1 hover:bg-teal-500/10 hover:text-teal-800 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                      <span>{label}</span>
                    </span>
                    {typeof badge === 'number' && badge > 0 && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-cyan-300'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* SYSTEM Bottom Section */}
      <div className="space-y-2.5 border-t border-slate-200/80 pt-3.5 dark:border-white/10">
        {/* Segmented Light / Dark Appearance Switch */}
        <div className="glass-panel-subtle p-1 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => theme === 'dark' && toggleTheme()}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
              theme === 'light'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            Daylight
          </button>
          <button
            type="button"
            onClick={() => theme === 'light' && toggleTheme()}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Moon className="h-3.5 w-3.5 text-cyan-400" />
            Obsidian
          </button>
        </div>

        <div className="space-y-0.5">
          {systemItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-800 dark:bg-white/10 dark:text-white'
                    : 'text-slate-600 hover:translate-x-1 hover:bg-teal-500/10 hover:text-teal-800 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Signed-in User Card */}
        <div className="glass-panel-subtle flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-[11px] font-bold text-slate-950">
                {(user?.name || 'A')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{user?.name || 'Analyst'}</p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-500"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="glass-canvas flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-teal-900/10 bg-white/80 backdrop-blur-2xl dark:border-cyan-400/[0.1] dark:bg-[#061018]/90 relative z-10">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-64 bg-white/95 dark:bg-[#061018]/95 backdrop-blur-2xl border-r border-teal-900/10 dark:border-cyan-400/15 overflow-y-auto">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Workspace */}
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
            <span className="font-display font-bold text-slate-900 dark:text-white">InsightAgent</span>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Switch Appearance"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-teal-600" />}
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1460px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
