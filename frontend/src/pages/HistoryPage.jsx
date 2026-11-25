import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, RotateCcw, Eye, Trash2, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '../api/client';

export default function HistoryPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadRuns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/agent/runs');
      setRuns(res.data.runs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleDelete = async (id) => {
    await api.delete(`/api/agent/runs/${id}`);
    setRuns((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Task History
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review previous autonomous analyses, inspect full tool traces, or re-run any goal.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-14 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="glass-panel border-dashed p-12 text-center">
          <History className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-semibold">No agent runs yet</p>
          <p className="mt-1 text-xs text-slate-500">Run a question in Analytics Studio to see full history here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {run.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : run.status === 'failed' ? (
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {run.goal}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {run.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Dataset: <span className="font-medium text-slate-700 dark:text-slate-200">{run.dataset_name}</span> · Model: <span className="font-mono">{run.model}</span> · {new Date(run.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate('/studio', { state: { runId: run.id } })}
                  className="glass-panel-subtle flex items-center gap-1 px-3 py-1.5 text-xs font-semibold hover:border-indigo-400"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Inspect
                </button>
                <button
                  onClick={() => navigate('/studio', { state: { rerunGoal: run.goal, datasetId: run.dataset_id } })}
                  className="aurora-btn flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Re-run
                </button>
                <button
                  onClick={() => handleDelete(run.id)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
