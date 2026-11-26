import { useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
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
  Home,
  Plus
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
  const [counts, setCounts] = useState({ datasets: 0, runs: 0 });

  const fetchCounts = useCallback(async () => {
    try {
      const [dsRes, runsRes] = await Promise.all([
        api.get('/api/datasets'),
        api.get('/api/agent/runs')
      ]);
      setCounts({
        datasets: dsRes.data?.datasets?.length || 0,
        runs: runsRes.data?.runs?.length || 0
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

  const userHandle = user?.email
    ? `@${user.email.split('@')[0]}`
    : '@analyst';

  const workspaceItems = [
    { to: '/studio', label: 'Analytics Studio', icon: BarChart3 },
    { to: '/datasets', label: 'Datasets & CSV', icon: Database, badge: counts.datasets },
    { to: '/history', label: 'Task History', icon: History, badge: counts.runs },
    { to: '/audit', label: 'Audit & Security', icon: ShieldCheck }
  ];

  const systemItems = [
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/welcome', label: 'App Overview', icon: Home }
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-4">
        {/* Top Brand */}
        <div className="flex items-center justify-between px-1">
          <Link to="/studio" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 text-white shadow-lg shadow-violet-500/30 transition-transform duration-200 group-hover:scale-105">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                InsightAgent{' '}
                <span className="bg-gradient-to-r from-violet-500 to-cyan-400 bg-clip-text text-transparent">
                  AI
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gemini AI
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

        {/* User Handle Pill */}
        <div className="glass-panel-subtle flex items-center gap-2.5 px-3 py-2">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
              {userHandle}
            </p>
            <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
              {user?.name || 'Analyst'}
            </p>
          </div>
        </div>

        {/* Primary "+ New Analysis" Pill */}
        <button
          onClick={handleNewAnalysis}
          className="aurora-btn flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          New Analysis
        </button>

        {/* WORKSPACE Nav */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Workspace
          </p>
          <nav className="space-y-1">
            {workspaceItems.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/25'
                      : 'text-slate-600 hover:translate-x-1 hover:bg-violet-500/10 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </span>
                    {typeof badge === 'number' && badge > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300'
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
      <div className="space-y-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          System
        </p>

        {/* Animated Switch Appearance Toggle */}
        <button
          onClick={toggleTheme}
          className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-violet-500/10 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform group-hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-violet-500 transition-transform group-hover:-rotate-12" />
            )}
            <span>Switch Appearance</span>
          </span>
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-violet-500 to-pink-500'
                : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-300 ${
                theme === 'dark' ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </span>
        </button>

        {systemItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-violet-500/15 text-violet-700 dark:bg-white/10 dark:text-white'
                  : 'text-slate-600 hover:translate-x-1 hover:bg-violet-500/10 hover:text-violet-700 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-500 transition-all hover:translate-x-1 hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="glass-canvas flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200/80 bg-white/80 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#090a1a]/90 relative z-10">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-64 bg-white/95 dark:bg-[#090a1a]/95 backdrop-blur-2xl border-r border-slate-200 dark:border-white/10 overflow-y-auto">
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
            <span className="font-bold text-slate-900 dark:text-white">InsightAgent AI</span>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Switch Appearance"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-violet-600" />}
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
