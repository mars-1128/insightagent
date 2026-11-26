import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Table2,
  Code2,
  Copy,
  Check,
  Download,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Sigma
} from 'lucide-react';

const PALETTE = ['#10b981', '#06b6d4', '#f59e0b', '#3b82f6', '#14b8a6', '#ec4899', '#8b5cf6'];

function formatValue(val, format = 'number') {
  if (val === null || val === undefined) return '—';
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val);
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  }
  if (format === 'percent') return `${num.toFixed(1)}%`;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
}

function SimpleInsightText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const formatInline = (str) =>
    str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={j} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={j} className="italic text-slate-800 dark:text-slate-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={j}
            className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs text-indigo-700 dark:bg-slate-800 dark:text-cyan-300"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        if (/^#{1,6}\s+/.test(trimmed)) {
          return (
            <h4 key={i} className="pt-2 text-sm font-bold text-slate-900 dark:text-white">
              {formatInline(trimmed.replace(/^#{1,6}\s+/, ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{formatInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={i}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

export default function ChartPanel({ result, onFollowUpClick }) {
  const chart = result?.chart;
  const rows = result?.rows || [];
  const columns = result?.columns || (rows[0] ? Object.keys(rows[0]) : []);
  const stats = result?.statistics;

  const [viewMode, setViewMode] = useState(chart?.chartType || 'bar');
  const [showSql, setShowSql] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(false);

  // Sync viewMode when a new run completes
  const activeType = useMemo(() => {
    if (viewMode && ['bar', 'line', 'area', 'pie', 'scatter', 'table'].includes(viewMode)) {
      return viewMode;
    }
    return chart?.chartType || 'bar';
  }, [viewMode, chart?.chartType]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''));
    });
  }, [rows, sortCol, sortAsc]);

  if (!result) {
    return (
      <div className="glass-panel border-dashed p-12 flex flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-indigo-500 dark:text-cyan-300">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          Charts &amp; Insights Will Appear Here
        </h3>
        <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Ask a question in plain English above. The agent will inspect your schema, run safe read-only SQL on PostgreSQL, compute statistics, and render interactive charts.
        </p>
      </div>
    );
  }

  const xKey = chart?.xKey || columns[0];
  const yKeys = chart?.yKeys?.length ? chart.yKeys : columns.slice(1, 2);
  const valueFormat = chart?.valueFormat || 'number';

  const handleCopySql = () => {
    if (!result.sql) return;
    navigator.clipboard.writeText(result.sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 1800);
  };

  const handleDownloadCsv = () => {
    if (result.csvExport?.csvContent) {
      const blob = new Blob([result.csvExport.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.csvExport.filename || 'insightagent_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (!rows.length) return;
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [columns.map(esc).join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      {chart?.kpis?.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {chart.kpis.map((kpi, idx) => (
            <div
              key={idx}
              className="glass-panel glass-hover p-4"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {kpi.value}
              </p>
              {kpi.trend && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {kpi.trend}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Visualization Card */}
      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {chart?.title || 'Query Results'}
            </h3>
            {chart?.subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chart.subtitle}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'bar', label: 'Bar', icon: BarChart3 },
              { id: 'line', label: 'Line', icon: LineIcon },
              { id: 'area', label: 'Area', icon: TrendingUp },
              { id: 'pie', label: 'Pie', icon: PieIcon },
              { id: 'table', label: 'Table', icon: Table2 }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  activeType === id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}

            {rows.length > 0 && (
              <button
                onClick={handleDownloadCsv}
                className={`ml-1 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  result.csvExport
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                {result.csvExport ? `Download ${result.csvExport.filename}` : 'CSV'}
              </button>
            )}
          </div>
        </div>

        {/* Chart Body */}
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Query returned 0 rows.</div>
        ) : activeType === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[380px]">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-100 sticky top-0 dark:bg-slate-900">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      className="cursor-pointer px-3.5 py-2.5 font-semibold text-slate-700 hover:text-indigo-500 dark:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        {col}
                        {sortCol === col && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {sortedRows.slice(0, 100).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {columns.map((col) => (
                      <td key={col} className="whitespace-nowrap px-3.5 py-2 text-slate-700 dark:text-slate-300">
                        {typeof row[col] === 'number' ? formatValue(row[col], 'number') : String(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeType === 'bar' ? (
                <BarChart data={rows} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatValue(v, valueFormat)} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(val) => formatValue(val, valueFormat)}
                  />
                  <Legend />
                  {yKeys.map((yk, idx) => (
                    <Bar key={yk} dataKey={yk} fill={PALETTE[idx % PALETTE.length]} radius={[6, 6, 0, 0]} />
                  ))}
                </BarChart>
              ) : activeType === 'line' ? (
                <LineChart data={rows} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatValue(v, valueFormat)} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(val) => formatValue(val, valueFormat)}
                  />
                  <Legend />
                  {yKeys.map((yk, idx) => (
                    <Line
                      key={yk}
                      type="monotone"
                      dataKey={yk}
                      stroke={PALETTE[idx % PALETTE.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              ) : activeType === 'area' ? (
                <AreaChart data={rows} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatValue(v, valueFormat)} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(val) => formatValue(val, valueFormat)}
                  />
                  <Legend />
                  {yKeys.map((yk, idx) => (
                    <Area
                      key={yk}
                      type="monotone"
                      dataKey={yk}
                      stroke={PALETTE[idx % PALETTE.length]}
                      fill={PALETTE[idx % PALETTE.length]}
                      fillOpacity={0.22}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              ) : activeType === 'pie' ? (
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(val) => formatValue(val, valueFormat)}
                  />
                  <Legend />
                  <Pie
                    data={rows.slice(0, 10)}
                    dataKey={yKeys[0]}
                    nameKey={xKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={115}
                    innerRadius={55}
                    paddingAngle={3}
                  >
                    {rows.slice(0, 10).map((_, idx) => (
                      <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey={xKey} name={xKey} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis dataKey={yKeys[0]} name={yKeys[0]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Scatter name={chart?.title || 'Points'} data={rows} fill="#6366f1" />
                </ScatterChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Statistical Summary Strip */}
      {stats && !stats.error && (
        <div className="glass-panel border-cyan-500/30 bg-cyan-500/10 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 mb-2.5">
            <Sigma className="h-4 w-4" />
            Computed Statistics ({stats.metricLabel || stats.column})
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
            {[
              { k: 'Mean', v: formatValue(stats.mean) },
              { k: 'Median', v: formatValue(stats.median) },
              { k: 'Min', v: formatValue(stats.min) },
              { k: 'Max', v: formatValue(stats.max) },
              { k: 'Std Dev', v: formatValue(stats.stdDev) },
              { k: 'Change', v: stats.firstToLastChangePct !== null ? `${stats.firstToLastChangePct}%` : '—' }
            ].map((item) => (
              <div key={item.k} className="glass-panel-subtle px-3 py-2">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">{item.k}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Written Insight Card */}
      {result.insight && (
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Executive Insights</h4>
          </div>
          <SimpleInsightText text={result.insight} />
        </div>
      )}

      {/* Read-Only SQL Inspector (Theme 9 Requirement #2) */}
      {result.sql && (
        <div className="glass-panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-white/10">
            <button
              onClick={() => setShowSql(!showSql)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <Code2 className="h-4 w-4 text-emerald-500" />
              <span>Generated Read-Only PostgreSQL Query</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                READ ONLY · {result.executionTimeMs || 0}ms · {result.rowCount || rows.length} rows
              </span>
            </button>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedSql ? 'Copied' : 'Copy'}
            </button>
          </div>
          {showSql && (
            <pre className="overflow-x-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">
              {result.sql}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
