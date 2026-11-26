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
  ChevronDown,
  ChevronUp,
  Search,
  Upload,
  Flame,
  SlidersHorizontal,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  Sigma,
  BarChart3,
  HelpCircle,
  Code2
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

  const [studioTab, setStudioTab] = useState('form'); // 'form' | 'history'
  const [datasets, setDatasets] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [showSchema, setShowSchema] = useState(false);

  const [goal, setGoal] = useState('');
  const [executionMode, setExecutionMode] = useState(() =>
    localStorage.getItem('insightagent_sql_gate') === 'true' ? 'safe' : 'auto'
  );
  const [currentRun, setCurrentRun] = useState(null);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [seedingSamples, setSeedingSamples] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [uploadBanner, setUploadBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preferredModel = localStorage.getItem('insightagent_model') || 'gemini-3.5-flash-lite';

  const loadDatasets = useCallback(async () => {
    try {
      setLoadingDatasets(true);
      const [dsRes, runsRes] = await Promise.all([
        api.get('/api/datasets'),
        api.get('/api/agent/runs')
      ]);
      const list = dsRes.data.datasets || [];
      setDatasets(list);
      setRecentRuns(runsRes.data.runs || []);
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
      setStudioTab('form');
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
      setUploadBanner(`Ready: ${created?.name || file.name} (${created?.row_count || 0} rows)`);
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
      api.get('/api/agent/runs').then((r) => setRecentRuns(r.data.runs || [])).catch(() => {});
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

  const demoPrompts = useMemoPrompts(activeDataset);

  return (
    <div className="space-y-8 pb-10">
      {/* Top Centered Mode Switcher Pill */}
      <div className="flex justify-center pt-1">
        <div className="glass-panel-subtle inline-flex items-center gap-1 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setStudioTab('form')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              studioTab === 'form'
                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/25'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Analytics Studio Form
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('history')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              studioTab === 'history'
                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/25'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Recent Analyses ({recentRuns.length})
          </button>
        </div>
      </div>

      {/* Centered Editorial Hero */}
      <div className="mx-auto max-w-3xl text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold text-violet-700 backdrop-blur-md dark:border-violet-400/30 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
          Autonomous Read-Only Data &amp; Analytics Agent
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-tight text-slate-900 dark:text-white">
          Ask a data question. Get verified charts &amp; insights.
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          InsightAgent inspects your dataset schema, writes strictly read-only PostgreSQL queries, runs statistical checks, asks before guessing, and generates live interactive visualizations.
        </p>
      </div>

      {/* Empty Dataset Onboarding */}
      {!loadingDatasets && datasets.length === 0 && (
        <div className="mx-auto max-w-4xl glass-panel glass-hover border-violet-500/35 bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-cyan-500/15 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Welcome! Load demo datasets or drop a CSV file below to begin
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              One click adds 2 realistic business datasets (Retail Sales &amp; SaaS Marketing) directly into PostgreSQL.
            </p>
          </div>
          <button
            onClick={handleSeedSamples}
            disabled={seedingSamples}
            className="aurora-btn shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          >
            {seedingSamples ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Load Demo Datasets Now
          </button>
        </div>
      )}

      {/* Tab 1: Hero Analytics Studio Card */}
      {studioTab === 'form' ? (
        <div className="mx-auto max-w-4xl glass-panel glass-hover p-5 sm:p-7 space-y-5">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="analytics-goal-input"
              className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
            >
              Data Question or Analytics Goal
            </label>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Press Enter to run · Strictly Read-Only SQL
            </span>
          </div>

          {/* Search-Style Goal Input */}
          <form onSubmit={handleSubmitGoal} className="space-y-4">
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-2xl border border-slate-300/80 bg-white/80 p-2 backdrop-blur-md transition-all focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/25 dark:border-white/15 dark:bg-[#090a19]/90">
              <div className="flex flex-1 items-center gap-2.5 pl-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-600 dark:text-violet-300">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  id="analytics-goal-input"
                  name="goal"
                  aria-label="Analytics goal or question"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ask any question (e.g., Compare revenue and profit by category, or try 'Show me the best ones')..."
                  className="w-full bg-transparent py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlanOnly}
                  disabled={busy || !goal.trim() || !selectedDatasetId}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/35 bg-violet-500/10 px-3.5 py-2.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-500/20 disabled:opacity-50 dark:text-violet-300"
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  Plan Only
                </button>
                <button
                  type="submit"
                  disabled={busy || !goal.trim() || !selectedDatasetId}
                  className="aurora-btn flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                  Analyze Now
                </button>
              </div>
            </div>

            {/* Quick Topics & Sample Prompts */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
                  <Flame className="h-3.5 w-3.5" />
                  Quick Topics:
                </span>
                {['Revenue & Profit', 'Monthly Trends', 'Top Performers', 'Clarification Demo', 'Approval Export'].map(
                  (topic, idx) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        const mapped = demoPrompts[idx % demoPrompts.length];
                        if (mapped) setGoal(mapped.text);
                      }}
                      className="prompt-chip"
                    >
                      {topic}
                    </button>
                  )
                )}
              </div>

              {demoPrompts.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-400">Try asking:</span>
                  {demoPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setGoal(p.text)}
                      className="prompt-chip text-[11px]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3-Column Studio Controls */}
            <div className="grid grid-cols-1 gap-3.5 pt-2 md:grid-cols-3">
              {/* Col 1: Active Dataset */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="active-dataset-select"
                    className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
                  >
                    Active Dataset
                  </label>
                  {activeDataset && (
                    <button
                      type="button"
                      onClick={() => setShowSchema(!showSchema)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-violet-600 hover:underline dark:text-cyan-400"
                    >
                      Schema ({activeDataset.columns?.length || 0})
                      {showSchema ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>
                <select
                  id="active-dataset-select"
                  name="datasetId"
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="glass-input w-full px-3 py-2.5 text-xs font-semibold"
                >
                  {datasets.length === 0 ? (
                    <option value="">No dataset loaded yet</option>
                  ) : (
                    datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.row_count} rows)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Col 2: Execution Mode */}
              <div>
                <label
                  htmlFor="execution-mode-select"
                  className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Execution Mode
                </label>
                <select
                  id="execution-mode-select"
                  value={executionMode}
                  onChange={(e) => setExecutionMode(e.target.value)}
                  className="glass-input w-full px-3 py-2.5 text-xs font-semibold"
                >
                  <option value="auto">Auto-Run (Plan &amp; Execute)</option>
                  <option value="plan">Editable Plan (Review First)</option>
                  <option value="safe">Safe SQL Gate (Approve Queries)</option>
                </select>
              </div>

              {/* Col 3: Inline CSV Upload */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  Attach CSV (Optional)
                </span>
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
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleInlineCsvUpload(e.dataTransfer.files?.[0]);
                  }}
                  disabled={uploadingCsv}
                  className="glass-input flex w-full items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold hover:border-violet-400"
                >
                  {uploadingCsv ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                      Indexing CSV...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 text-violet-500" />
                      Drop CSV or Browse
                    </>
                  )}
                </button>
              </div>
            </div>

            {uploadBanner && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {uploadBanner}
              </div>
            )}

            {/* Collapsible Schema Pills */}
            {showSchema && activeDataset && (
              <div className="flex flex-wrap gap-1.5 glass-panel-subtle p-3">
                {(activeDataset.columns || []).map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/80 px-2 py-1 font-mono text-[11px] dark:border-white/10 dark:bg-slate-900/70"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{col}</span>
                    <span className="text-[10px] text-violet-600 dark:text-cyan-400">
                      {activeDataset.column_types?.[col] || 'TEXT'}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Bottom Active Agent Capabilities Strip */}
            <div className="border-t border-slate-200/70 pt-4 dark:border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Autonomous Agent Tools (6 Active)
                </span>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  All read-only &amp; audited
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { icon: Database, label: 'Schema Inspect' },
                  { icon: Code2, label: 'Read-Only SQL' },
                  { icon: Sigma, label: 'Stats Engine' },
                  { icon: BarChart3, label: 'Live Charts' },
                  { icon: HelpCircle, label: 'Clarify Gate' },
                  { icon: ShieldCheck, label: 'CSV Approval' }
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="glass-panel-subtle glass-hover flex items-center justify-between gap-1.5 px-2.5 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-cyan-400" />
                      <span className="truncate">{label}</span>
                    </span>
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Tab 2: Conversational Recent Analyses Switcher */
        <div className="mx-auto max-w-4xl glass-panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Jump Back Into Any Recent Analysis
            </h2>
            <button
              type="button"
              onClick={() => setStudioTab('form')}
              className="text-xs font-semibold text-violet-600 hover:underline dark:text-cyan-400"
            >
              + Ask New Question
            </button>
          </div>
          {recentRuns.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No analyses run yet. Switch to Analytics Studio Form to ask your first question!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recentRuns.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setCurrentRun(r);
                    setGoal(r.goal);
                    if (r.dataset_id) setSelectedDatasetId(r.dataset_id);
                    setStudioTab('form');
                    scrollToResults();
                  }}
                  className="glass-panel-subtle glass-hover p-3.5 text-left"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{r.goal}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {r.dataset_name} · <span className="uppercase font-semibold text-violet-500">{r.status}</span>
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-4xl flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Human-in-the-loop Gate Cards */}
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

        {/* Active Plan, Trace & Visualization Workspace */}
        {(currentRun || datasets.length > 0) && (
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
        )}
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
      { label: '🏆 Top Plan Tiers', text: 'Which plan tier has the highest MRR and lowest churn rate?' },
      { label: '❓ Ambiguous Query (Clarify Demo)', text: 'Show me the best performing ones' },
      { label: '🛡️ Export Report (Approval Demo)', text: 'Calculate churn rate and MRR by plan tier and prepare a CSV export' }
    ];
  }
  if (name.includes('retail') || name.includes('sales')) {
    return [
      { label: '📊 Profit by Category', text: 'Which product category generated the highest total profit and revenue?' },
      { label: '📈 Monthly Revenue Trend', text: 'Show monthly revenue and profit trends over 2025' },
      { label: '🌍 Regional Performance', text: 'Compare total revenue, profit, and units sold across regions' },
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
