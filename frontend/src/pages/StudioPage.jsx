import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  ListChecks,
  Database,
  Loader2,
  PlusCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api, { streamAgentPost } from '../api/client';
import PlanEditorPanel from '../components/PlanEditorPanel';
import AgentTracePanel from '../components/AgentTracePanel';
import ChartPanel from '../components/ChartPanel';
import { ApprovalCard, ClarificationCard } from '../components/HumanGateCards';

export default function StudioPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [showSchema, setShowSchema] = useState(false);

  const [goal, setGoal] = useState('');
  const [currentRun, setCurrentRun] = useState(null);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [seedingSamples, setSeedingSamples] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preferredModel = localStorage.getItem('insightagent_model') || 'gemini-3.5-flash-lite';
  const defaultApprovalGate = localStorage.getItem('insightagent_sql_gate') === 'true';

  const loadDatasets = useCallback(async () => {
    try {
      setLoadingDatasets(true);
      const res = await api.get('/api/datasets');
      const list = res.data.datasets || [];
      setDatasets(list);
      if (list.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(list[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load datasets.');
    } finally {
      setLoadingDatasets(false);
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  // If navigated from HistoryPage with a runId or rerunGoal
  useEffect(() => {
    const state = location.state;
    if (state?.runId) {
      api
        .get(`/api/agent/runs/${state.runId}`)
        .then((res) => {
          setCurrentRun(res.data.run);
          if (res.data.run?.dataset_id) setSelectedDatasetId(res.data.run.dataset_id);
          if (res.data.run?.goal) setGoal(res.data.run.goal);
        })
        .catch(() => {});
    } else if (state?.rerunGoal) {
      setGoal(state.rerunGoal);
      if (state.datasetId) setSelectedDatasetId(state.datasetId);
    }
  }, [location.state]);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || null;

  const handleSeedSamples = async () => {
    try {
      setSeedingSamples(true);
      setError('');
      const res = await api.post('/api/datasets/seed-samples');
      const list = res.data.datasets || [];
      setDatasets(list);
      if (list.length > 0) setSelectedDatasetId(list[0].id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sample datasets.');
    } finally {
      setSeedingSamples(false);
    }
  };

  const attachSseHandlers = (runId) => ({
    plan: (updatedPlan) => {
      setCurrentRun((prev) => (prev && prev.id === runId ? { ...prev, plan: updatedPlan } : prev));
    },
    trace: (traceEvent) => {
      setCurrentRun((prev) =>
        prev && prev.id === runId
          ? { ...prev, trace: [...(prev.trace || []), traceEvent] }
          : prev
      );
    },
    approval_required: (updatedRun) => setCurrentRun(updatedRun),
    clarification_required: (updatedRun) => setCurrentRun(updatedRun),
    completed: (updatedRun) => setCurrentRun(updatedRun),
    stopped: (payload) => {
      setCurrentRun((prev) =>
        prev && prev.id === runId ? { ...prev, status: payload.status || 'stopped' } : prev
      );
    },
    failed: (payload) => {
      setError(payload.error || 'Agent execution failed.');
      if (payload.run) {
        setCurrentRun(payload.run);
      } else {
        setCurrentRun((prev) => (prev ? { ...prev, status: 'failed', error_message: payload.error } : prev));
      }
    }
  });

  const handlePlanOnly = async (e) => {
    e?.preventDefault();
    if (!selectedDatasetId || !goal.trim()) return;
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/api/agent/plan', {
        datasetId: selectedDatasetId,
        goal: goal.trim(),
        model: preferredModel,
        requireSqlApproval: defaultApprovalGate
      });
      setCurrentRun(res.data.run);
      return res.data.run;
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create plan.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleExecuteRun = async (runToRun) => {
    const target = runToRun || currentRun;
    if (!target) return;
    setError('');
    setBusy(true);
    setCurrentRun((prev) => (prev ? { ...prev, status: 'running' } : prev));
    try {
      await streamAgentPost(`/api/agent/runs/${target.id}/execute`, {}, attachSseHandlers(target.id));
    } catch (err) {
      setError(err.message || 'Execution failed.');
      setCurrentRun((prev) => (prev ? { ...prev, status: 'failed' } : prev));
    } finally {
      setBusy(false);
    }
  };

  const handleQuickAnalyze = async (e) => {
    e?.preventDefault();
    const planned = await handlePlanOnly();
    if (planned) {
      await handleExecuteRun(planned);
    }
  };

  const handleSavePlan = async (steps, requireSqlApproval) => {
    if (!currentRun) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.patch(`/api/agent/runs/${currentRun.id}/plan`, {
        steps,
        requireSqlApproval
      });
      setCurrentRun(res.data.run);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update plan.');
    } finally {
      setBusy(false);
    }
  };

  const handleRespondGate = async (payload) => {
    if (!currentRun) return;
    setBusy(true);
    setError('');
    setCurrentRun((prev) => (prev ? { ...prev, status: 'running', pending_action: null } : prev));
    try {
      await streamAgentPost(`/api/agent/runs/${currentRun.id}/respond`, payload, attachSseHandlers(currentRun.id));
    } catch (err) {
      setError(err.message || 'Failed to resume agent.');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (!currentRun) return;
    try {
      const res = await api.post(`/api/agent/runs/${currentRun.id}/stop`);
      setCurrentRun(res.data.run);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to stop agent.');
    }
  };

  const demoPrompts = useMemoPrompts(activeDataset);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Analytics Studio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ask questions in plain English. Inspect the agent&apos;s plan, SQL, statistical reasoning, and live charts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeedSamples}
            disabled={seedingSamples}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {seedingSamples ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5 text-indigo-500" />}
            Load Sample Datasets
          </button>
          <button
            onClick={() => navigate('/datasets')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            Upload CSV
          </button>
        </div>
      </div>

      {/* Empty Dataset Onboarding */}
      {!loadingDatasets && datasets.length === 0 && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Welcome! Load a sample dataset or upload your own CSV to start
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              One click adds 2 realistic business datasets (Retail Sales &amp; SaaS Marketing) directly into your PostgreSQL workspace.
            </p>
          </div>
          <button
            onClick={handleSeedSamples}
            disabled={seedingSamples}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            {seedingSamples ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Load Demo Datasets Now
          </button>
        </div>
      )}

      {/* Goal Input Card */}
      {datasets.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Dataset:</span>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows · {d.columns?.length || 0} cols)
                  </option>
                ))}
              </select>

              {activeDataset && (
                <button
                  type="button"
                  onClick={() => setShowSchema(!showSchema)}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  Schema ({activeDataset.columns?.length || 0} cols)
                  {showSchema ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
          </div>

          {showSchema && activeDataset && (
            <div className="mb-3 flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-3 dark:bg-slate-950">
              {(activeDataset.columns || []).map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{col}</span>
                  <span className="text-[10px] text-indigo-500">
                    {activeDataset.column_types?.[col] || 'TEXT'}
                  </span>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleQuickAnalyze} className="flex flex-col sm:flex-row gap-2.5">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ask a question (e.g., Compare revenue and profit by category, or ask an ambiguous question like 'Show me the best ones')..."
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePlanOnly}
                disabled={busy || !goal.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-500/20 disabled:opacity-50 dark:text-indigo-300"
              >
                <ListChecks className="h-4 w-4" />
                Plan Only
              </button>
              <button
                type="submit"
                disabled={busy || !goal.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-3 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Analyze Now
              </button>
            </div>
          </form>

          {/* Suggested Prompts */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Try:</span>
            {demoPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setGoal(p.text)}
                className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Human-in-the-loop Gate Cards */}
      {currentRun?.status === 'awaiting_approval' && (
        <ApprovalCard
          pending={currentRun.pending_action}
          busy={busy}
          onApprove={(decision) => handleRespondGate({ type: 'approval', ...decision })}
          onReject={(decision) => handleRespondGate({ type: 'approval', ...decision })}
        />
      )}

      {currentRun?.status === 'awaiting_clarification' && (
        <ClarificationCard
          pending={currentRun.pending_action}
          busy={busy}
          onAnswer={(answer) => handleRespondGate({ type: 'clarification', answer })}
        />
      )}

      {/* Main Split Workbench */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: Plan + Live Trace */}
        <div className="space-y-5 xl:col-span-5">
          {currentRun && (
            <PlanEditorPanel
              run={currentRun}
              busy={busy}
              onSavePlan={handleSavePlan}
              onExecute={() => handleExecuteRun()}
              onStop={handleStop}
            />
          )}
          <AgentTracePanel trace={currentRun?.trace || []} status={currentRun?.status} />
        </div>

        {/* Right: Charts, Stats, Insights & SQL */}
        <div className="xl:col-span-7">
          <ChartPanel result={currentRun?.result} />
        </div>
      </div>
    </div>
  );
}

function useMemoPrompts(dataset) {
  if (!dataset) return [];
  const name = dataset.name?.toLowerCase() || '';
  if (name.includes('saas') || name.includes('marketing')) {
    return [
      { label: '📊 MRR & CAC by Channel', text: 'Compare total MRR and average CAC across marketing channels' },
      { label: '📈 Monthly MRR Trend', text: 'Show the monthly MRR growth trend across months' },
      { label: '❓ Ambiguous Query (Clarify Demo)', text: 'Show me the best performing ones' },
      { label: '🛡️ Export Report (Approval Demo)', text: 'Calculate churn rate and MRR by plan tier and prepare a CSV export' }
    ];
  }
  if (name.includes('retail') || name.includes('sales')) {
    return [
      { label: '📊 Profit by Category', text: 'Which product category generated the highest total profit and revenue?' },
      { label: '📈 Monthly Revenue Trend', text: 'Show monthly revenue and profit trends over 2025' },
      { label: '❓ Ambiguous Query (Clarify Demo)', text: 'Show me the best ones' },
      { label: '🛡️ Export Report (Approval Demo)', text: 'Summarize revenue and profit by region and prepare a CSV export' }
    ];
  }
  const cols = dataset.columns || [];
  const numCol = cols.find((c) => dataset.column_types?.[c] === 'NUMERIC') || cols[1] || cols[0];
  const txtCol = cols.find((c) => dataset.column_types?.[c] !== 'NUMERIC') || cols[0];
  return [
    { label: `📊 ${numCol} by ${txtCol}`, text: `Summarize ${numCol} grouped by ${txtCol} and show a chart` },
    { label: '🔍 Top 10 Records', text: `Show the top 10 rows sorted by ${numCol}` },
    { label: '❓ Ambiguous Query', text: 'Show me the best performance' },
    { label: '🛡️ CSV Export (Approval)', text: `Summarize ${numCol} by ${txtCol} and prepare a CSV export` }
  ];
}
