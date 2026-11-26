import { useState, useEffect } from 'react';
import { ShieldCheck, Lock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../api/client';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/agent/audit-logs')
      .then((res) => setLogs(res.data.logs || []))
      .finally(() => setLoading(false));
  }, []);

  const riskBadge = {
    low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    high: 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Audit Log &amp; Safety Guardrails
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every generated SQL query, blocked injection attempt, approval decision, and dataset operation is recorded here.
        </p>
      </div>

      {/* Security Highlights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            icon: Lock,
            title: 'PostgreSQL Read-Only Transaction',
            desc: 'All queries run inside BEGIN TRANSACTION READ ONLY with a 5s statement_timeout and automatic LIMIT 500 cap.'
          },
          {
            icon: AlertTriangle,
            title: 'SQL & Prompt-Injection Guard',
            desc: 'Blocks DDL/DML keywords, stacked statements, system catalogs, and cross-user table references independently of the LLM.'
          },
          {
            icon: CheckCircle2,
            title: 'Human-in-the-Loop Approvals',
            desc: 'CSV exports, sensitive column queries, and optional SQL gate runs pause cleanly for explicit user review or rejection.'
          }
        ].map((card, i) => (
          <div
            key={i}
            className="glass-panel glass-hover p-4"
          >
            <card.icon className="h-5 w-5 text-cyan-500 mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{card.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Audit Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-bold">Recent Security &amp; Agent Events</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No audit events recorded yet. Run an analysis in Analytics Studio.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Timestamp</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Action</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Risk</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${riskBadge[log.risk_level] || riskBadge.low}`}>
                        {log.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-md truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
