import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Database,
  BarChart3,
  BrainCircuit,
  HelpCircle,
  CheckCircle2,
  Lock,
  Sun,
  Moon,
  Play,
  Users,
  TrendingUp,
  Code2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PREVIEW_SCENARIOS = [
  {
    id: 'profit',
    chip: '📊 Profit by Category',
    goal: 'Which product category generated the highest profit and revenue?',
    steps: [
      { label: 'Inspect schema & distinct categories', tool: 'inspect_dataset_schema' },
      { label: 'Run read-only PostgreSQL aggregation', tool: 'execute_readonly_sql' },
      { label: 'Compute category statistics & margins', tool: 'compute_statistics' },
      { label: 'Render interactive Bar chart & insights', tool: 'render_chart_and_table' }
    ],
    sql: 'SELECT category, SUM(revenue) AS revenue, SUM(profit) AS profit\nFROM retail_sales GROUP BY category ORDER BY profit DESC LIMIT 500;',
    bars: [
      { label: 'Software', pct: 95, val: '$565.7K', color: 'from-cyan-400 to-indigo-500' },
      { label: 'Electronics', pct: 72, val: '$395.8K', color: 'from-indigo-400 to-violet-500' },
      { label: 'Accessories', pct: 34, val: '$99.4K', color: 'from-emerald-400 to-cyan-500' },
      { label: 'Furniture', pct: 20, val: '$53.0K', color: 'from-amber-400 to-orange-500' }
    ],
    insight: 'Software leads total profit at $565,740 (79.9% margin), while Electronics drives peak top-line revenue at $1,139,400.'
  },
  {
    id: 'clarify',
    chip: '❓ Ambiguous Question',
    goal: 'Show me the best performing ones',
    steps: [
      { label: 'Detect ambiguous metric & grouping', tool: 'request_clarification' },
      { label: 'Pause and ask user clickable options', tool: 'awaiting_clarification' },
      { label: 'Resume with user-confirmed metric', tool: 'execute_readonly_sql' },
      { label: 'Deliver verified chart & KPIs', tool: 'render_chart_and_table' }
    ],
    sql: '-- Agent paused before running SQL:\n-- "Which metric defines best? [Revenue | Profit | Units Sold]"',
    bars: [
      { label: 'ProBook 16', pct: 92, val: '$188.6K', color: 'from-cyan-400 to-blue-500' },
      { label: 'DataShield', pct: 84, val: '$172.0K', color: 'from-indigo-400 to-purple-500' },
      { label: 'CloudSync', pct: 71, val: '$146.1K', color: 'from-emerald-400 to-teal-500' },
      { label: 'UltraView 4K', pct: 55, val: '$112.4K', color: 'from-pink-400 to-rose-500' }
    ],
    insight: 'Instead of guessing, InsightAgent asks the user to pick Revenue, Profit, or Units Sold before querying PostgreSQL.'
  },
  {
    id: 'approval',
    chip: '🛡️ Approval-Gated Export',
    goal: 'Summarize regional revenue and prepare a CSV export',
    steps: [
      { label: 'Aggregate revenue by region (Read-Only)', tool: 'execute_readonly_sql' },
      { label: 'Pause at Human Approval Gate (Medium Risk)', tool: 'prepare_csv_export' },
      { label: 'User reviews & approves export filename', tool: 'human_approved' },
      { label: 'Log action to Audit Trail & generate CSV', tool: 'audit_logs' }
    ],
    sql: 'SELECT region, SUM(revenue) AS total_revenue, SUM(profit) AS profit\nFROM retail_sales GROUP BY region ORDER BY total_revenue DESC LIMIT 500;',
    bars: [
      { label: 'North America', pct: 94, val: '$912.4K', color: 'from-emerald-400 to-cyan-500' },
      { label: 'Europe', pct: 74, val: '$701.8K', color: 'from-indigo-400 to-cyan-500' },
      { label: 'APAC', pct: 66, val: '$644.1K', color: 'from-violet-400 to-indigo-500' }
    ],
    insight: 'CSV export paused cleanly for explicit human approval, then recorded the approval decision in the security audit log.'
  }
];

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const scenario = PREVIEW_SCENARIOS[scenarioIdx];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % scenario.steps.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [scenario.steps.length, scenarioIdx]);

  return (
    <div className="glass-canvas relative overflow-hidden">
      {/* Ambient Floating Aurora Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl animate-pulse-glow" />
      </div>

      {/* Top Glass Header */}
      <header className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-5">
        <div className="glass-panel flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/30">
              <BarChart3 className="h-5 w-5 stroke-[2.3]" />
            </div>
            <div>
              <span className="block font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                Insight<span className="text-emerald-600 dark:text-emerald-400">Agent</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Autonomous Data Observatory
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="glass-panel-subtle flex h-9 w-9 items-center justify-center text-slate-600 hover:text-indigo-500 dark:text-slate-300"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>

            {user ? (
              <button
                onClick={() => navigate('/studio')}
                className="aurora-btn flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Open Studio
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="aurora-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  Launch Free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Left Pitch */}
          <div className="lg:col-span-6 space-y-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 backdrop-blur-md dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300">
              <BrainCircuit className="h-3.5 w-3.5" />
              Powered by Google Gemini Interactions API &amp; PostgreSQL
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white">
              Turn Raw Tables Into{' '}
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 bg-clip-text text-transparent">
                Live Visual Intelligence
              </span>
              .
            </h1>

            <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Upload any CSV spreadsheet or explore built-in business datasets. InsightAgent generates an{' '}
              <strong className="text-slate-900 dark:text-white">editable plan</strong>, runs strictly{' '}
              <strong className="text-slate-900 dark:text-white">read-only SQL</strong> on PostgreSQL, calculates verified statistics, and turns answers into live interactive charts.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => navigate(user ? '/studio' : '/signup')}
                className="aurora-btn flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold"
              >
                <Play className="h-4 w-4 fill-current" />
                {user ? 'Go to Analytics Studio' : 'Start Analyzing Free'}
              </button>

              <a
                href="#how-it-works"
                className="glass-panel-subtle flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-700 hover:border-indigo-400 dark:text-slate-200"
              >
                Explore Capabilities
              </a>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Lock, label: 'Read-Only SQL', sub: 'Zero data mutations' },
                { icon: HelpCircle, label: 'Asks Before Guessing', sub: 'Clarification gates' },
                { icon: ShieldCheck, label: 'Human Approval', sub: 'Full audit trail' }
              ].map(({ icon: Icon, label, sub }, i) => (
                <div key={i} className="glass-panel-subtle p-3">
                  <Icon className="h-4 w-4 text-cyan-500 mb-1.5" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Interactive Glass Showcase Card */}
          <div className="lg:col-span-6 animate-fade-up">
            <div className="glass-panel p-5 sm:p-6 relative overflow-hidden">
              {/* Scenario Switcher Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/70 dark:border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Interactive Agent Preview
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PREVIEW_SCENARIOS.map((sc, idx) => (
                    <button
                      key={sc.id}
                      onClick={() => {
                        setScenarioIdx(idx);
                        setActiveStep(0);
                      }}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        idx === scenarioIdx
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                          : 'glass-panel-subtle text-slate-600 hover:text-indigo-500 dark:text-slate-300'
                      }`}
                    >
                      {sc.chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Prompt Bubble */}
              <div className="mt-4 glass-panel-subtle px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-cyan-400">
                    Natural Language Goal
                  </span>
                  <p className="truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                    &ldquo;{scenario.goal}&rdquo;
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  LIVE TRACE
                </span>
              </div>

              {/* Animated 4-Step Pipeline */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scenario.steps.map((st, idx) => {
                  const done = idx < activeStep;
                  const current = idx === activeStep;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border px-3 py-2 text-xs transition-all ${
                        current
                          ? 'border-cyan-400/60 bg-cyan-500/10 shadow-sm'
                          : done
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-slate-200/60 bg-white/40 dark:border-white/[0.06] dark:bg-slate-950/35'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {idx + 1}. {st.label}
                        </span>
                        <CheckCircle2
                          className={`h-3.5 w-3.5 shrink-0 ${
                            current
                              ? 'text-cyan-400 animate-pulse'
                              : done
                                ? 'text-emerald-500'
                                : 'text-slate-400/50'
                          }`}
                        />
                      </div>
                      <span className="mt-0.5 block font-mono text-[10px] text-indigo-600 dark:text-indigo-300">
                        {st.tool}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Visual Chart Preview */}
              <div className="mt-4 glass-panel-subtle p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-cyan-500" />
                    Real-Time Chart Output
                  </span>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    READ ONLY SQL
                  </span>
                </div>

                <div className="space-y-2.5">
                  {scenario.bars.map((bar) => (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{bar.label}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{bar.val}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${bar.color} transition-all duration-700`}
                          style={{ width: `${bar.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini SQL & Insight */}
              <div className="mt-3 rounded-xl bg-slate-950/90 p-3 font-mono text-[11px] text-emerald-300 border border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                  <Code2 className="h-3 w-3 text-emerald-400" />
                  PostgreSQL Read-Only Query
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">{scenario.sql}</pre>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <strong className="text-indigo-600 dark:text-cyan-300">Insight: </strong>
                {scenario.insight}
              </p>
            </div>
          </div>
        </div>

        {/* Bento Feature Section */}
        <section id="how-it-works" className="mt-20 space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Built Like a Senior Data Analyst, Safe Like Enterprise Software
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Every step is visible, editable, and verified against your real PostgreSQL tables.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Database,
                title: 'Instant CSV to PostgreSQL',
                desc: 'Upload any CSV spreadsheet or start in 1 click with built-in Retail & SaaS datasets.'
              },
              {
                icon: BrainCircuit,
                title: 'Editable Plan & 6 Tools',
                desc: 'Modify steps before execution and watch Gemini call schema, SQL, stats, and chart tools.'
              },
              {
                icon: TrendingUp,
                title: 'Interactive Visual Charts',
                desc: 'Switch seamlessly between Bar, Line, Area, Pie, and sortable Table views with KPI strips.'
              },
              {
                icon: Users,
                title: 'Built for Every Team',
                desc: 'Ideal for business owners, marketing teams, educators, NGOs, and student projects.'
              }
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="glass-panel p-5 hover:-translate-y-0.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-indigo-600 dark:text-cyan-300 mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
