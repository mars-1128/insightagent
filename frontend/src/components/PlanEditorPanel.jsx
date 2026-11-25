import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Play,
  Square,
  Pencil,
  Save
} from 'lucide-react';

const STATUS_STYLE = {
  pending: { icon: Circle, label: 'Pending', cls: 'text-slate-400' },
  running: { icon: Loader2, label: 'Running', cls: 'text-indigo-500 animate-spin' },
  waiting_approval: { icon: ShieldAlert, label: 'Needs Approval', cls: 'text-amber-500' },
  done: { icon: CheckCircle2, label: 'Done', cls: 'text-emerald-500' },
  failed: { icon: XCircle, label: 'Failed / Replan', cls: 'text-rose-500' }
};

export default function PlanEditorPanel({
  run,
  onSavePlan,
  onExecute,
  onStop,
  busy
}) {
  const [editing, setEditing] = useState(false);
  const [steps, setSteps] = useState(run?.plan || []);
  const [requireSqlApproval, setRequireSqlApproval] = useState(Boolean(run?.require_sql_approval));

  useEffect(() => {
    setSteps(run?.plan || []);
    setRequireSqlApproval(Boolean(run?.require_sql_approval));
    setEditing(false);
  }, [run?.id, run?.plan, run?.require_sql_approval]);

  if (!run) return null;

  const canEdit = ['planned', 'failed', 'stopped'].includes(run.status);
  const isRunning = run.status === 'running';
  const isPaused = ['awaiting_approval', 'awaiting_clarification'].includes(run.status);

  const moveStep = (index, dir) => {
    const next = [...steps];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
  };

  const updateStepField = (index, field, val) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: val } : s)));
  };

  const removeStep = (index) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        title: 'Additional analysis step',
        description: 'Run an additional verification or breakdown query.',
        toolHint: 'execute_readonly_sql',
        requiresApproval: false,
        status: 'pending'
      }
    ]);
  };

  const handleSave = async () => {
    await onSavePlan(steps, requireSqlApproval);
    setEditing(false);
  };

  const handleToggleApprovalGate = async (checked) => {
    setRequireSqlApproval(checked);
    if (canEdit) {
      await onSavePlan(steps, checked);
    }
  };

  return (
    <div className="glass-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Execution Plan
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Status: <span className="font-semibold uppercase text-indigo-500">{run.status.replace('_', ' ')}</span> · Model: <span className="font-mono">{run.model}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              disabled={busy}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Plan
            </button>
          )}

          {editing && (
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500"
            >
              <Save className="h-3.5 w-3.5" />
              Save Plan
            </button>
          )}

          {canEdit && (
            <button
              onClick={async () => {
                if (editing) await handleSave();
                onExecute();
              }}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {run.status === 'planned' ? 'Execute Plan' : 'Re-run Plan'}
            </button>
          )}

          {(isRunning || isPaused) && (
            <button
              onClick={onStop}
              className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
            >
              <Square className="h-3.5 w-3.5" />
              Stop Agent
            </button>
          )}
        </div>
      </div>

      {/* SQL Approval Gate Toggle */}
      {canEdit && (
        <label className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60 cursor-pointer">
          <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            Require my approval before executing SQL queries
          </span>
          <input
            type="checkbox"
            checked={requireSqlApproval}
            onChange={(e) => handleToggleApprovalGate(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>
      )}

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const st = STATUS_STYLE[step.status] || STATUS_STYLE.pending;
          const Icon = st.icon;
          return (
            <div
              key={step.id || idx}
              className="glass-panel-subtle p-2.5"
            >
              {editing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <input
                      value={step.title}
                      onChange={(e) => updateStepField(idx, 'title', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                    />
                    <button onClick={() => moveStep(idx, -1)} className="p-1 text-slate-400 hover:text-slate-700">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveStep(idx, 1)} className="p-1 text-slate-400 hover:text-slate-700">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeStep(idx)} className="p-1 text-rose-400 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    value={step.description}
                    onChange={(e) => updateStepField(idx, 'description', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  />
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${st.cls}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {idx + 1}. {step.title}
                      </span>
                      {step.toolHint && (
                        <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {step.toolHint}
                        </span>
                      )}
                      {step.requiresApproval && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          Approval Gate
                        </span>
                      )}
                    </div>
                    {step.description && (
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <button
          onClick={addStep}
          className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Custom Step
        </button>
      )}
    </div>
  );
}
