import { useState, useEffect } from 'react';
import { Settings, Cpu, ShieldAlert, Sun, Moon, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';

const MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Recommended · Ultra-fast & reliable)' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Flagship Agentic · Auto-failover enabled)' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' }
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [model, setModel] = useState(() => localStorage.getItem('insightagent_model') || 'gemini-3.5-flash-lite');
  const [sqlGate, setSqlGate] = useState(() => localStorage.getItem('insightagent_sql_gate') === 'true');
  const [health, setHealth] = useState(null);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealth(res.data))
      .catch(() => setHealth({ status: 'offline', database: 'disconnected' }));
  }, []);

  const handleModelChange = (val) => {
    setModel(val);
    localStorage.setItem('insightagent_model', val);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 1800);
  };

  const handleGateToggle = (checked) => {
    setSqlGate(checked);
    localStorage.setItem('insightagent_sql_gate', String(checked));
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 1800);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Settings &amp; Configuration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure AI model selection, human approval gates, and appearance.
          </p>
        </div>
        {savedBanner && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
            Saved!
          </span>
        )}
      </div>

      {/* System Health */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4 text-indigo-500" />
          Backend &amp; Database Connectivity
        </h2>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            {health?.status === 'ok' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-500" />
            )}
            <span>API Server: <strong>{health?.status || 'Checking...'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            {health?.database === 'connected' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-500" />
            )}
            <span>Supabase PostgreSQL: <strong>{health?.database || 'Checking...'}</strong></span>
          </div>
        </div>
      </div>

      {/* Model Config */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-500" />
          Preferred Gemini Model
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Automatic circuit-breaker failover switches seamlessly to healthy fallback models if a model experiences temporary 503 high demand.
        </p>
        <select
          value={model}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Human Approval Gate */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Default Safe SQL Approval Gate
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              When enabled, the agent pauses before running any generated SQL query so you can inspect, edit, or approve it first. (CSV exports and sensitive columns always require approval.)
            </p>
          </div>
          <input
            type="checkbox"
            checked={sqlGate}
            onChange={(e) => handleGateToggle(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600"
          />
        </label>
      </div>

      {/* Theme */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-sm font-bold mb-3">Interface Theme</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold border ${
              theme === 'dark'
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-400'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <Moon className="h-4 w-4" />
            Dark Mode
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold border ${
              theme === 'light'
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-600'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <Sun className="h-4 w-4" />
            Light Mode
          </button>
        </div>
      </div>
    </div>
  );
}
