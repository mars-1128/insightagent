import { useState, useEffect } from 'react';
import { ShieldAlert, HelpCircle, Check, X, Send } from 'lucide-react';

export function ApprovalCard({ pending, onApprove, onReject, busy }) {
  const [editedSql, setEditedSql] = useState(pending?.sanitizedSql || pending?.arguments?.sql || '');
  const [editedFilename, setEditedFilename] = useState(pending?.arguments?.filename || 'export.csv');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setEditedSql(pending?.sanitizedSql || pending?.arguments?.sql || '');
    setEditedFilename(pending?.arguments?.filename || 'export.csv');
    setRejectReason('');
  }, [pending?.callId]);

  if (!pending || pending.type !== 'approval') return null;

  const isSql = pending.toolName === 'execute_readonly_sql';
  const isExport = pending.toolName === 'prepare_csv_export';

  return (
    <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-50/90 p-5 shadow-lg dark:bg-amber-950/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Human Approval Required
              </h3>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                {pending.riskLevel || 'medium'} risk
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{pending.reason}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="text-xs text-slate-700 dark:text-slate-300">
          Tool: <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono dark:bg-slate-800">{pending.toolName}</code>
        </div>

        {isSql && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Review or edit SQL query before running:
            </label>
            <textarea
              rows={4}
              value={editedSql}
              onChange={(e) => setEditedSql(e.target.value)}
              className="w-full rounded-xl border border-amber-400/50 bg-slate-950 p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

        {isExport && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Export Filename:
            </label>
            <input
              value={editedFilename}
              onChange={(e) => setEditedFilename(e.target.value)}
              className="w-full rounded-xl border border-amber-400/50 bg-white px-3 py-2 text-xs font-mono dark:bg-slate-900"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={() =>
              onApprove({
                approved: true,
                ...(isSql ? { editedSql } : {}),
                ...(isExport ? { editedFilename } : {})
              })
            }
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Approve & Continue
          </button>

          <div className="flex flex-1 gap-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Optional feedback for agent if rejecting..."
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              onClick={() =>
                onReject({
                  approved: false,
                  reason: rejectReason || 'User rejected this step. Please try another approach.'
                })
              }
              disabled={busy}
              className="flex items-center gap-1 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Reject & Replan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClarificationCard({ pending, onAnswer, busy }) {
  const [customAnswer, setCustomAnswer] = useState('');

  if (!pending || pending.type !== 'clarification') return null;

  return (
    <div className="rounded-2xl border-2 border-cyan-500/60 bg-cyan-50/90 p-5 shadow-lg dark:bg-cyan-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Clarification Needed Before Querying
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
            {pending.question}
          </p>
          {pending.reasoning && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{pending.reasoning}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {(pending.options || []).map((opt, idx) => (
              <button
                key={idx}
                disabled={busy}
                onClick={() => onAnswer(opt)}
                className="rounded-xl border border-cyan-500/40 bg-white px-3.5 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 dark:bg-slate-900 dark:text-cyan-300 dark:hover:bg-cyan-900/50 disabled:opacity-50"
              >
                {opt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customAnswer.trim()) onAnswer(customAnswer.trim());
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={customAnswer}
              onChange={(e) => setCustomAnswer(e.target.value)}
              placeholder="Or type your own clarification..."
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="submit"
              disabled={busy || !customAnswer.trim()}
              className="flex items-center gap-1 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Answer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
