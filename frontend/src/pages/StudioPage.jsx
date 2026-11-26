import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  Play,
  ListChecks,
  Database,
  Loader2,
  PlusCircle,
  AlertCircle,
  Upload,
  ShieldCheck,
  Sigma,
  BarChart3,
  HelpCircle,
  Code2,
  CheckCircle2,
  Terminal,
  TrendingUp,
  Layers,
  MousePointerClick
} from 'lucide-react';
import api, { streamAgentPost } from '../api/client';
import PlanEditorPanel from '../components/PlanEditorPanel';
import AgentTracePanel from '../components/AgentTracePanel';
import ChartPanel from '../components/ChartPanel';
import { ApprovalCard, ClarificationCard } from '../components/HumanGateCards';

export default function StudioPage() {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [goal, setGoal] = useState('');
  const [executionMode, setExecutionMode] = useState(() =>
    localStorage.getItem('insightagent_sql_gate') === 'true' ? 'safe' : 'auto'
  );
  const [currentRun, setCurrentRun] = useState(null);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [seedingSamples, setSeedingSamples] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadBanner, setUploadBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preferredModel = localStorage.getItem('insightagent_model') || 'gemini-3.5-flash-lite';

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

  useEffect(() => {
    const state = location.state;
    if (state?.newAnalysisAt) {
      setCurrentRun(null);
      setGoal('');
      setError('');
      return;
    }
    if (state?.runId) {
      api
        .get(`/api/agent/runs/${state.runId}`)
        .then((res) => {
          setCurrentRun(res.data.run);
          if (res.data.run?.dataset_id) setSelectedDatasetId(res.data.run.dataset_id);
          if (res.data.run?.goal) setGoal(res.data.run.goal);
        })
        .catch(() => {});
    } else if (state?.rerunGoal !== undefined) {
      setGoal(state.rerunGoal);
      if (state.datasetId) setSelectedDatasetId(state.datasetId);
    }
  }, [location.state]);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || null;
  const columns = activeDataset?.columns || [];
  const numericCols = columns.filter((c) => activeDataset?.column_types?.[c] === 'NUMERIC');
  const textCols = columns.filter((c) => activeDataset?.column_types?.[c] !== 'NUMERIC');
  const numericRatio = columns.length ? Math.round((numericCols.length / columns.length) * 100) : 50;

  const notifyCountsChanged = () => {
    window.dispatchEvent(new Event('insightagent:counts-changed'));
  };

  const handleSeedSamples = async () => {
    try {
      setSeedingSamples(true);
      setError('');
      const res = await api.post('/api/datasets/seed-samples');
      const list = res.data.datasets || [];
      setDatasets(list);
      if (list.length > 0) setSelectedDatasetId(list[0].id);
      notifyCountsChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sample datasets.');
    } finally {
      setSeedingSamples(false);
    }
  };

  const handleInlineCsvUpload = async (file) => {
    if (!file) return;
    setError('');
    setUploadBanner('');
    setUploadingCsv(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/api/datasets/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const created = res.data.dataset;
      await loadDatasets();
      if (created?.id) setSelectedDatasetId(created.id);
      setUploadBanner(`Indexed "${created?.name || file.name}" (${created?.row_count || 0} rows)`);
      notifyCountsChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'CSV upload failed.');
    } finally {
      setUploadingCsv(false);
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
    completed: (updatedRun) => {
      setCurrentRun(updatedRun);
      notifyCountsChanged();
    },
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

  const scrollToResults = () => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

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
        requireSqlApproval: executionMode === 'safe'
      });
      setCurrentRun(res.data.run);
      notifyCountsChanged();
      scrollToResults();
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
    scrollToResults();
    try {
      await streamAgentPost(`/api/agent/runs/${target.id}/execute`, {}, attachSseHandlers(target.id));
    } catch (err) {
      setError(err.message || 'Execution failed.');
      setCurrentRun((prev) => (prev ? { ...prev, status: 'failed' } : prev));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitGoal = async (e) => {
    e?.preventDefault();
    const planned = await handlePlanOnly();
    if (planned && executionMode !== 'plan') {
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

  const handleColumnClick = (colName, isNum) => {
    const dim = textCols[0] || 'category';
    const met = numericCols[0] || 'value';
    if (isNum) {
      setGoal(`Compare total and average ${colName} grouped by ${dim} and highlight top performers`);
    } else {
      setGoal(`Break down ${met} by ${colName} and show a visual chart`);
    }
  };

  const intentCards = buildIntentCards(activeDataset);
  const pipelineStages = computePipelineStages(currentRun);

  return (
    <div className="space-y-6 pb-10">
      {/* Asymmetric Observatory Hero: Left Command Composer + Right Live Dataset Telemetry */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left 7 Cols: Command Composer */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleInlineCsvUpload(e.dataTransfer.files?.[0]);
          }}
          className={`xl:col-span-7 glass-panel p-5 sm:p-6 flex flex-col justify-between transition-all ${
            dragActive ? 'border-2 border-dashed border-emerald-400 ring-4 ring-emerald-500/15' : ''
          }`}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Terminal className="h-3.5 w-3.5" />
                AUTONOMOUS SQL &amp; CHART ENGINE
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Drag &amp; drop any <code className="font-mono text-teal-600 dark:text-cyan-300">.csv</code> anywhere here
              </span>
            </div>

            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Turn raw tables into{' '}
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 bg-clip-text text-transparent">
                  live visual intelligence.
                </span>
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Describe what you want to discover. InsightAgent plans steps, queries PostgreSQL read-only, runs statistics, and draws charts—while asking before guessing.
              </p>
            </div>

            {/* Execution Mode Segmented Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'auto', label: '⚡ Auto-Analyze' },
                { id: 'plan', label: '✏️ Edit Plan First' },
                { id: 'safe', label: '🛡️ Safe SQL Gate' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setExecutionMode(mode.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    executionMode === mode.id
                      ? 'bg-emerald-500/20 text-teal-800 border border-emerald-500/50 dark:text-emerald-300'
                      : 'glass-panel-subtle text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Prompt Bar */}
            <form onSubmit={handleSubmitGoal} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="analytics-goal-input"
                  name="goal"
                  aria-label="Analytics goal or question"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ask your dataset anything (e.g., Compare profit margin by category, or try 'Show me the best ones')..."
                  className="glass-input flex-1 px-4 py-3 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePlanOnly}
                    disabled={busy || !goal.trim() || !selectedDatasetId}
                    className="glass-panel-subtle flex items-center justify-center gap-1.5 px-3.5 py-3 text-xs font-semibold text-teal-700 hover:border-teal-500 disabled:opacity-50 dark:text-cyan-300"
                  >
                    <ListChecks className="h-4 w-4" />
                    Plan
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !goal.trim() || !selectedDatasetId}
                    className="aurora-btn flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-xs"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                    {executionMode === 'plan' ? 'Generate Plan' : 'Analyze'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* 4 Interactive Intent Cards */}
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {intentCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGoal(card.prompt)}
                  className="glass-panel-subtle glass-hover group flex items-start gap-3 p-3 text-left"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.badgeBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900 group-hover:text-teal-700 dark:text-white dark:group-hover:text-emerald-300">
                      {card.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {card.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Live Dataset Telemetry & Clickable Schema */}
        <div className="xl:col-span-5 glass-panel p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-cyan-300">
                <Database className="h-4 w-4 text-emerald-500" />
                Active Dataset Telemetry
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleInlineCsvUpload(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCsv}
                  className="prompt-chip inline-flex items-center gap-1 py-1 text-[11px]"
                >
                  {uploadingCsv ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Upload CSV
                </button>
                <button
                  type="button"
                  onClick={handleSeedSamples}
                  disabled={seedingSamples}
                  className="prompt-chip inline-flex items-center gap-1 py-1 text-[11px]"
                >
                  {seedingSamples ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3 w-3" />}
                  Demo Data
                </button>
              </div>
            </div>

            {uploadBanner && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {uploadBanner}
              </div>
            )}

            {loadingDatasets ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
                Loading datasets...
              </div>
            ) : datasets.length === 0 ? (
              <div className="glass-panel-subtle p-5 text-center space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  No dataset selected yet
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Load our 2 sample business tables or drop any CSV file to inspect columns.
                </p>
                <button
                  onClick={handleSeedSamples}
                  disabled={seedingSamples}
                  className="aurora-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Load Demo Datasets Now
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="active-dataset-select" className="sr-only">
                    Active Dataset
                  </label>
                  <select
                    id="active-dataset-select"
                    name="datasetId"
                    value={selectedDatasetId}
                    onChange={(e) => setSelectedDatasetId(e.target.value)}
                    className="glass-input w-full px-3.5 py-2.5 text-xs font-bold"
                  >
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.row_count} rows · {d.columns?.length || 0} cols)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Numeric vs Categorical Composition Bar */}
                {activeDataset && (
                  <div className="glass-panel-subtle p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {numericCols.length} Numeric Metrics
                      </span>
                      <span className="text-cyan-600 dark:text-cyan-400">
                        {textCols.length} Text Dimensions
                      </span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${numericRatio}%` }}
                      />
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-500"
                        style={{ width: `${100 - numericRatio}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Clickable Column Chips -> Smart Prompt Builder */}
                {activeDataset && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <MousePointerClick className="h-3.5 w-3.5 text-emerald-500" />
                        Click any column to build a query:
                      </span>
                      <span className="font-mono text-[10px]">{activeDataset.row_count} rows</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {columns.map((col) => {
                        const isNum = activeDataset.column_types?.[col] === 'NUMERIC';
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => handleColumnClick(col, isNum)}
                            title={`Click to analyze "${col}"`}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-all duration-150 hover:-translate-y-0.5 ${
                              isNum
                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:border-emerald-400 dark:text-emerald-300'
                                : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-700 hover:border-cyan-400 dark:text-cyan-300'
                            }`}
                          >
                            <span className="font-semibold">{col}</span>
                            <span className="text-[9px] opacity-75">{isNum ? 'NUM' : 'TXT'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/70 pt-3 text-[11px] text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Read-Only PG Sandbox
            </span>
            <span className="font-mono text-[10px]">LIMIT 500 · 5s timeout</span>
          </div>
        </div>
      </div>

      {/* Live 4-Stage Agent Pipeline Rail */}
      <div className="glass-panel p-3.5">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {pipelineStages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs transition-all ${
                  stage.state === 'done'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : stage.state === 'running'
                      ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 shadow-sm'
                      : stage.state === 'waiting'
                        ? 'border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200/70 bg-white/50 text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${stage.state === 'running' ? 'animate-pulse' : ''}`} />
                <div className="min-w-0">
                  <span className="block truncate font-semibold">
                    {idx + 1}. {stage.label}
                  </span>
                  <span className="block text-[10px] opacity-75 uppercase font-mono">{stage.state}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Human-in-the-loop Gate Cards + Results Split */}
      <div ref={resultsRef} className="space-y-6">
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
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

          <div className="xl:col-span-7">
            <ChartPanel result={currentRun?.result} />
          </div>
        </div>
      </div>
    </div>
  );
}

function computePipelineStages(run) {
  const trace = run?.trace || [];
  const hasTool = (name) => trace.some((t) => t.toolName === name && t.status === 'done');
  const isWaiting = run?.status === 'awaiting_approval' || run?.status === 'awaiting_clarification';
  const isRunning = run?.status === 'running';
  const isDone = run?.status === 'completed';

  return [
    {
      id: 'schema',
      label: 'Inspect Schema',
      icon: Layers,
      state: hasTool('inspect_dataset_schema') || isDone ? 'done' : isRunning ? 'running' : 'idle'
    },
    {
      id: 'sql',
      label: 'Read-Only SQL',
      icon: Code2,
      state: hasTool('execute_readonly_sql') || isDone
        ? 'done'
        : isWaiting
          ? 'waiting'
          : isRunning
            ? 'running'
            : 'idle'
    },
    {
      id: 'stats',
      label: 'Compute Stats',
      icon: Sigma,
      state: hasTool('compute_statistics') || isDone ? 'done' : isRunning ? 'running' : 'idle'
    },
    {
      id: 'chart',
      label: 'Chart & Insight',
      icon: BarChart3,
      state: isDone ? 'done' : isRunning ? 'running' : 'idle'
    }
  ];
}

function buildIntentCards(dataset) {
  const name = dataset?.name?.toLowerCase() || '';
  if (name.includes('saas') || name.includes('marketing')) {
    return [
      {
        title: 'Compare Channels',
        subtitle: 'MRR vs CAC across acquisition channels',
        prompt: 'Compare total MRR and average CAC across marketing channels',
        icon: BarChart3,
        badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
      },
      {
        title: 'Growth Trajectory',
        subtitle: 'Track monthly MRR progression over time',
        prompt: 'Show the monthly MRR growth trend across months',
        icon: TrendingUp,
        badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
      },
      {
        title: 'Clarification Demo',
        subtitle: 'Ask a vague prompt to see the Clarify Gate',
        prompt: 'Show me the best performing ones',
        icon: HelpCircle,
        badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
      },
      {
        title: 'Approval CSV Export',
        subtitle: 'Generate report with human approval gate',
        prompt: 'Calculate churn rate and MRR by plan tier and prepare a CSV export',
        icon: ShieldCheck,
        badgeBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
      }
    ];
  }

  const cols = dataset?.columns || [];
  const numCol = cols.find((c) => dataset?.column_types?.[c] === 'NUMERIC') || 'profit';
  const txtCol = cols.find((c) => dataset?.column_types?.[c] !== 'NUMERIC') || 'category';
  const isRetail = name.includes('retail') || name.includes('sales') || cols.includes('category');

  return [
    {
      title: isRetail ? 'Category Profit Breakdown' : `Compare ${numCol} by ${txtCol}`,
      subtitle: isRetail ? 'Highest total profit and revenue by category' : `Aggregate ${numCol} across ${txtCol}`,
      prompt: isRetail
        ? 'Which product category generated the highest total profit and revenue?'
        : `Summarize ${numCol} grouped by ${txtCol} and show a chart`,
      icon: BarChart3,
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
    },
    {
      title: isRetail ? 'Monthly Revenue Trend' : `Top 10 by ${numCol}`,
      subtitle: isRetail ? 'Revenue & profit trend across 2025' : `Find top performers by ${numCol}`,
      prompt: isRetail
        ? 'Show monthly revenue and profit trends over 2025'
        : `Show the top 10 records sorted by ${numCol}`,
      icon: TrendingUp,
      badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
    },
    {
      title: 'Clarification Demo',
      subtitle: 'Watch the agent ask before guessing',
      prompt: 'Show me the best ones',
      icon: HelpCircle,
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
    },
    {
      title: 'Approval CSV Export',
      subtitle: 'Pause for approval before generating CSV',
      prompt: isRetail
        ? 'Summarize revenue and profit by region and prepare a CSV export'
        : `Summarize ${numCol} by ${txtCol} and prepare a CSV export`,
      icon: ShieldCheck,
      badgeBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
    }
  ];
}
