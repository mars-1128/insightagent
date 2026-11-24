import { useState } from 'react';
import {
  BrainCircuit,
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  ListChecks
} from 'lucide-react';

function TraceItem({ item }) {
  const [expanded, setExpanded] = useState(item.status === 'failed' || item.type === 'approval_request');

  const badgeConfig = {
    plan: { icon: ListChecks, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/25' },
    plan_edit: { icon: ListChecks, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/25' },
    thought: { icon: BrainCircuit, color: 'text-purple-500 bg-purple-500/10 border-purple-500/25' },
    fallback: { icon: RefreshCw, color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' },
    approval_request: { icon: ShieldAlert, color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' },
    approval_rejected: { icon: XCircle, color: 'text-rose-500 bg-rose-500/10 border-rose-500/25' },
    clarification: { icon: HelpCircle, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/25' },
    clarification_answer: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25' },
    complete: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25' },
    stopped: { icon: XCircle, color: 'text-slate-500 bg-slate-500/10 border-slate-500/25' },
    error: { icon: XCircle, color: 'text-rose-500 bg-rose-500/10 border-rose-500/25' },
    tool: {
      icon: item.status === 'failed' ? XCircle : Wrench,
      color:
        item.status === 'failed'
          ? 'text-rose-500 bg-rose-500/10 border-rose-500/25'
          : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25'
    }
  };

  const cfg = badgeConfig[item.type] || badgeConfig.tool;
  const Icon = cfg.icon;
  const hasPayload = Boolean(item.input || item.output);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${cfg.color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {item.title}
              </span>
              {item.toolName && (
                <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                  {item.toolName}
                </span>
              )}
              {typeof item.durationMs === 'number' && (
                <span className="flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <Clock className="h-2.5 w-2.5" />
                  {item.durationMs}ms
                </span>
              )}
            </div>
            {item.observation && (
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {item.observation}
              </p>
            )}
          </div>
        </div>

        {hasPayload && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      {expanded && hasPayload && (
        <div className="mt-2.5 space-y-2 border-t border-slate-200 pt-2.5 dark:border-slate-800">
          {item.input && (
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tool Input
              </span>
              <pre className="max-h-36 overflow-auto rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-cyan-300">
                {JSON.stringify(item.input, null, 2)}
              </pre>
            </div>
          )}
          {item.output && (
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tool Output
              </span>
              <pre className="max-h-44 overflow-auto rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-emerald-300">
                {JSON.stringify(item.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentTracePanel({ trace = [], status }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Agent Activity & Tool Trace
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {trace.length} event{trace.length === 1 ? '' : 's'}
        </span>
      </div>

      {trace.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
          Tool inputs, PostgreSQL queries, statistical observations, and replanning steps will stream here in real time.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {trace.map((item, idx) => (
            <TraceItem key={item.id || idx} item={item} />
          ))}
          {status === 'running' && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              Agent is reasoning and calling tools...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
