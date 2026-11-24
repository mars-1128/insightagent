import { z } from 'zod';
import pool from '../db/pool.js';
import { validateReadOnlySql, executeReadOnlyQuery } from '../utils/sqlGuard.js';

// ── Zod Schemas for Strict Tool Input Validation ──────────────────────────────
export const toolInputSchemas = {
  inspect_dataset_schema: z.object({
    include_distinct_values: z.boolean().optional().default(true)
  }),
  execute_readonly_sql: z.object({
    sql: z.string().min(6, 'SQL query cannot be empty.'),
    purpose: z.string().min(2).max(300)
  }),
  compute_statistics: z.object({
    numeric_column: z.string().min(1, 'numeric_column is required'),
    group_column: z.string().optional(),
    metric_label: z.string().optional()
  }),
  render_chart_and_table: z.object({
    chart_type: z.enum(['bar', 'line', 'area', 'pie', 'scatter', 'table']),
    title: z.string().min(2).max(160),
    subtitle: z.string().max(240).optional(),
    x_key: z.string().min(1),
    y_keys: z.array(z.string().min(1)).min(1).max(5),
    value_format: z.enum(['number', 'currency', 'percent']).optional().default('number'),
    kpis: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          trend: z.string().optional()
        })
      )
      .max(4)
      .optional()
      .default([])
  }),
  prepare_csv_export: z.object({
    filename: z.string().min(2).max(100),
    reason: z.string().min(3).max(300)
  }),
  request_clarification: z.object({
    question: z.string().min(5).max(400),
    options: z.array(z.string().min(1)).min(2).max(4),
    reasoning: z.string().max(300).optional()
  })
};

// ── Gemini Interactions API Tool Declarations ─────────────────────────────────
export const AGENT_TOOL_DECLARATIONS = [
  {
    type: 'function',
    name: 'inspect_dataset_schema',
    description:
      'Inspects the active dataset schema, column types, sample rows, and distinct values for text columns so SQL queries use exact table/column names and accurate filter literals.',
    parameters: {
      type: 'object',
      properties: {
        include_distinct_values: {
          type: 'boolean',
          description: 'Whether to fetch distinct categorical values for text columns (default true).'
        }
      }
    }
  },
  {
    type: 'function',
    name: 'execute_readonly_sql',
    description:
      'Executes a strictly read-only PostgreSQL SELECT (or WITH ... SELECT) query against the active dataset table. Use double quotes around column and table names if needed. Always aggregate or limit large outputs.',
    parameters: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'The valid PostgreSQL SELECT or WITH query targeting the active dataset table.'
        },
        purpose: {
          type: 'string',
          description: 'Short explanation of what analytical question this query answers.'
        }
      },
      required: ['sql', 'purpose']
    }
  },
  {
    type: 'function',
    name: 'compute_statistics',
    description:
      'Computes summary statistics (count, sum, mean, median, min, max, standard deviation, p25/p75, outliers, and growth trend) on a numeric column from the most recent SQL query result.',
    parameters: {
      type: 'object',
      properties: {
        numeric_column: {
          type: 'string',
          description: 'Exact column name from the latest SQL query result to analyze statistically.'
        },
        group_column: {
          type: 'string',
          description: 'Optional label/category column to identify top and bottom performers.'
        },
        metric_label: {
          type: 'string',
          description: 'Human-friendly label for the metric being analyzed.'
        }
      },
      required: ['numeric_column']
    }
  },
  {
    type: 'function',
    name: 'render_chart_and_table',
    description:
      'Configures the interactive chart, KPI cards, and table display in the UI using columns returned from the latest SQL query result.',
    parameters: {
      type: 'object',
      properties: {
        chart_type: {
          type: 'string',
          enum: ['bar', 'line', 'area', 'pie', 'scatter', 'table'],
          description: 'Best visualization type for the data (bar for categories, line/area for time series, pie for proportions <= 8 slices, scatter for two metrics, table for detailed records).'
        },
        title: { type: 'string', description: 'Concise chart title.' },
        subtitle: { type: 'string', description: 'Optional subtitle describing scope or units.' },
        x_key: { type: 'string', description: 'Exact column name from the latest SQL result for the X-axis / category.' },
        y_keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'One or more exact numeric column names from the latest SQL result for the Y-axis.'
        },
        value_format: {
          type: 'string',
          enum: ['number', 'currency', 'percent'],
          description: 'Display formatting hint for numeric values.'
        },
        kpis: {
          type: 'array',
          description: 'Up to 4 headline KPI summary cards derived strictly from observed query results.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              trend: { type: 'string' }
            },
            required: ['label', 'value']
          }
        }
      },
      required: ['chart_type', 'title', 'x_key', 'y_keys']
    }
  },
  {
    type: 'function',
    name: 'prepare_csv_export',
    description:
      'Prepares the latest query result as a downloadable CSV report. Requires explicit human approval before running.',
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Desired CSV filename (e.g., regional_profit_report.csv).'
        },
        reason: {
          type: 'string',
          description: 'Why this data export is being prepared for the user.'
        }
      },
      required: ['filename', 'reason']
    }
  },
  {
    type: 'function',
    name: 'request_clarification',
    description:
      'Asks the user a clarifying question with clickable options when their analytics request is genuinely ambiguous (e.g., unclear metric, timeframe, or grouping). Never guess when ambiguous.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Clear, concise question explaining what needs clarification.'
        },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: '2 to 4 concrete interpretations the user can click to answer immediately.'
        },
        reasoning: {
          type: 'string',
          description: 'Brief note on why clarification prevents an inaccurate query.'
        }
      },
      required: ['question', 'options']
    }
  }
];

function computeStatsOnRows(rows, numericCol, groupCol) {
  const valid = [];
  for (const r of rows) {
    const val = Number(r[numericCol]);
    if (Number.isFinite(val)) {
      valid.push({ val, label: groupCol ? String(r[groupCol] ?? '') : null });
    }
  }
  if (valid.length === 0) {
    return { error: `No finite numeric values found in column "${numericCol}".` };
  }

  const values = valid.map((v) => v.val).sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  const median =
    count % 2 === 0
      ? (values[count / 2 - 1] + values[count / 2]) / 2
      : values[Math.floor(count / 2)];
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  const min = values[0];
  const max = values[count - 1];
  const p25 = values[Math.floor(count * 0.25)];
  const p75 = values[Math.floor(count * 0.75)];

  const sortedItems = [...valid].sort((a, b) => b.val - a.val);
  const topPerformer = sortedItems[0];
  const bottomPerformer = sortedItems[sortedItems.length - 1];

  // Detect statistical outliers (> 1.8 std deviations from mean)
  const outliers =
    stdDev > 0
      ? valid
          .filter((item) => Math.abs(item.val - mean) > 1.8 * stdDev)
          .slice(0, 5)
      : [];

  // Period change if >= 2 ordered rows
  const firstVal = valid[0].val;
  const lastVal = valid[valid.length - 1].val;
  const firstToLastChangePct =
    firstVal !== 0 ? Number((((lastVal - firstVal) / Math.abs(firstVal)) * 100).toFixed(2)) : null;

  return {
    column: numericCol,
    count,
    sum: Number(sum.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    p25: Number(p25.toFixed(2)),
    p75: Number(p75.toFixed(2)),
    topPerformer,
    bottomPerformer,
    outliers,
    firstToLastChangePct
  };
}

/**
 * Evaluates whether a tool call requires human-in-the-loop approval before running.
 */
export function evaluateToolApproval({ toolName, validatedArgs, dataset, requireSqlApproval }) {
  if (toolName === 'prepare_csv_export') {
    return {
      requiresApproval: true,
      riskLevel: 'medium',
      reason: `Preparing downloadable CSV export "${validatedArgs.filename}". Confirm before exporting query data.`
    };
  }

  if (toolName === 'execute_readonly_sql') {
    const check = validateReadOnlySql(
      validatedArgs.sql,
      dataset.table_name,
      dataset.columns || []
    );
    if (requireSqlApproval) {
      return {
        requiresApproval: true,
        riskLevel: check.riskLevel === 'low' ? 'medium' : check.riskLevel,
        reason: 'Safe SQL Approval Gate is enabled — review the generated SQL query before execution.',
        sanitizedSql: check.safeSql
      };
    }
    if (check.riskLevel !== 'low') {
      return {
        requiresApproval: true,
        riskLevel: check.riskLevel,
        reason: check.riskReason,
        sanitizedSql: check.safeSql
      };
    }
    return { requiresApproval: false, riskLevel: 'low', sanitizedSql: check.safeSql };
  }

  return { requiresApproval: false, riskLevel: 'low' };
}

/**
 * Executes a validated agent tool and returns structured output + human-readable observation.
 */
export async function executeAgentTool({ toolName, rawArgs, dataset, runContext }) {
  const schema = toolInputSchemas[toolName];
  if (!schema) {
    return {
      ok: false,
      output: { error: `Unknown tool "${toolName}".` },
      observation: `Tool "${toolName}" is not registered.`
    };
  }

  const parsed = schema.safeParse(rawArgs || {});
  if (!parsed.success) {
    const errMsg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return {
      ok: false,
      output: { error: `Invalid arguments: ${errMsg}` },
      observation: `Validation failed for ${toolName}: ${errMsg}. Fix arguments and retry.`
    };
  }

  const args = parsed.data;

  try {
    if (toolName === 'inspect_dataset_schema') {
      const columns = Array.isArray(dataset.columns) ? dataset.columns : [];
      const columnTypes = dataset.column_types || {};
      const sampleRes = await executeReadOnlyQuery(
        `SELECT * FROM "${dataset.table_name}" LIMIT 5`
      );

      const distinctValues = {};
      if (args.include_distinct_values) {
        const textCols = columns.filter((c) => columnTypes[c] !== 'NUMERIC').slice(0, 6);
        for (const col of textCols) {
          const safeCol = `"${col.replace(/"/g, '""')}"`;
          const dvRes = await executeReadOnlyQuery(
            `SELECT ${safeCol} AS val, COUNT(*) AS cnt FROM "${dataset.table_name}" WHERE ${safeCol} IS NOT NULL GROUP BY ${safeCol} ORDER BY cnt DESC LIMIT 12`
          );
          distinctValues[col] = dvRes.rows.map((r) => r.val);
        }
      }

      const output = {
        datasetName: dataset.name,
        tableName: dataset.table_name,
        rowCount: dataset.row_count,
        columns: columns.map((c) => ({ name: c, type: columnTypes[c] || 'TEXT' })),
        distinctValues,
        sampleRows: sampleRes.rows
      };

      return {
        ok: true,
        output,
        observation: `Inspected "${dataset.name}" (${dataset.row_count} rows, ${columns.length} columns). Found distinct values for ${Object.keys(distinctValues).length} categorical columns.`
      };
    }

    if (toolName === 'execute_readonly_sql') {
      const { safeSql, riskLevel } = validateReadOnlySql(
        args.sql,
        dataset.table_name,
        dataset.columns || []
      );
      const queryResult = await executeReadOnlyQuery(safeSql);

      runContext.lastSql = safeSql;
      runContext.lastResult = queryResult;

      if (queryResult.rowCount === 0) {
        return {
          ok: true,
          output: {
            sql: safeSql,
            riskLevel,
            rowCount: 0,
            columns: queryResult.columns,
            rows: [],
            executionTimeMs: queryResult.executionTimeMs,
            warning: 'Query executed cleanly but returned 0 rows.'
          },
          observation: `SQL executed in ${queryResult.executionTimeMs}ms but returned 0 rows. Consider checking filter literals with ILIKE or inspecting distinct values and replanning the query.`
        };
      }

      return {
        ok: true,
        output: {
          sql: safeSql,
          riskLevel,
          rowCount: queryResult.rowCount,
          columns: queryResult.columns,
          rows: queryResult.rows.slice(0, 100),
          truncatedToPreview: queryResult.rowCount > 100,
          executionTimeMs: queryResult.executionTimeMs
        },
        observation: `Read-only SQL executed in ${queryResult.executionTimeMs}ms returning ${queryResult.rowCount} rows across columns [${queryResult.columns.join(', ')}].`
      };
    }

    if (toolName === 'compute_statistics') {
      const rows = runContext.lastResult?.rows || [];
      if (rows.length === 0) {
        return {
          ok: false,
          output: { error: 'No SQL query result rows available yet. Run execute_readonly_sql first.' },
          observation: 'Cannot compute statistics because no SQL result rows are loaded yet.'
        };
      }

      const cols = runContext.lastResult.columns || Object.keys(rows[0] || {});
      const matchedNumCol =
        cols.find((c) => c === args.numeric_column) ||
        cols.find((c) => c.toLowerCase() === args.numeric_column.toLowerCase());

      if (!matchedNumCol) {
        return {
          ok: false,
          output: { error: `Column "${args.numeric_column}" not found in latest result columns: ${cols.join(', ')}` },
          observation: `Statistics column mismatch: "${args.numeric_column}" not in [${cols.join(', ')}].`
        };
      }

      const matchedGroupCol = args.group_column
        ? cols.find((c) => c.toLowerCase() === args.group_column.toLowerCase())
        : cols.find((c) => c !== matchedNumCol);

      const stats = computeStatsOnRows(rows, matchedNumCol, matchedGroupCol);
      if (stats.error) {
        return { ok: false, output: stats, observation: stats.error };
      }

      runContext.statistics = {
        ...stats,
        metricLabel: args.metric_label || matchedNumCol
      };

      return {
        ok: true,
        output: runContext.statistics,
        observation: `Computed stats on "${matchedNumCol}": sum=${stats.sum}, mean=${stats.mean}, min=${stats.min}, max=${stats.max}, stdDev=${stats.stdDev}.`
      };
    }

    if (toolName === 'render_chart_and_table') {
      const lastRes = runContext.lastResult;
      if (!lastRes || !lastRes.rows || lastRes.rows.length === 0) {
        return {
          ok: false,
          output: { error: 'No SQL query rows available to visualize. Execute a SQL query returning >= 1 row first.' },
          observation: 'Chart rendering blocked because there are no query rows yet.'
        };
      }

      const cols = lastRes.columns || Object.keys(lastRes.rows[0] || {});
      const resolveCol = (name) =>
        cols.find((c) => c === name) ||
        cols.find((c) => c.toLowerCase() === String(name).toLowerCase());

      const resolvedX = resolveCol(args.x_key) || cols[0];
      const resolvedY = args.y_keys
        .map(resolveCol)
        .filter(Boolean);

      if (resolvedY.length === 0) {
        const numericCols = cols.filter((c) => c !== resolvedX && typeof lastRes.rows[0][c] === 'number');
        if (numericCols.length > 0) resolvedY.push(numericCols[0]);
      }

      const chartConfig = {
        chartType: args.chart_type,
        title: args.title,
        subtitle: args.subtitle || '',
        xKey: resolvedX,
        yKeys: resolvedY,
        valueFormat: args.value_format || 'number',
        kpis: args.kpis || []
      };

      runContext.chartConfig = chartConfig;

      return {
        ok: true,
        output: chartConfig,
        observation: `Configured ${chartConfig.chartType} chart "${chartConfig.title}" (X: ${resolvedX}, Y: ${resolvedY.join(', ')}) with ${lastRes.rows.length} rows.`
      };
    }

    if (toolName === 'prepare_csv_export') {
      const lastRes = runContext.lastResult;
      if (!lastRes || !lastRes.rows || lastRes.rows.length === 0) {
        return {
          ok: false,
          output: { error: 'No query rows available to export.' },
          observation: 'CSV export skipped because no query rows exist.'
        };
      }

      const cols = lastRes.columns || Object.keys(lastRes.rows[0]);
      const escapeCell = (val) => {
        const s = val == null ? '' : String(val);
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csvLines = [
        cols.map(escapeCell).join(','),
        ...lastRes.rows.map((r) => cols.map((c) => escapeCell(r[c])).join(','))
      ];
      const csvContent = csvLines.join('\n');
      const safeFilename = args.filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/(\.csv)?$/i, '.csv');

      runContext.csvExport = {
        filename: safeFilename,
        rowCount: lastRes.rows.length,
        csvContent
      };

      return {
        ok: true,
        output: {
          filename: safeFilename,
          rowCount: lastRes.rows.length,
          ready: true
        },
        observation: `Prepared approved CSV export "${safeFilename}" with ${lastRes.rows.length} rows.`
      };
    }

    return {
      ok: false,
      output: { error: `Unhandled tool ${toolName}` },
      observation: `Tool ${toolName} could not be executed.`
    };
  } catch (err) {
    return {
      ok: false,
      output: { error: err.message },
      observation: `${toolName} failed with error: ${err.message}. Diagnose the cause and replan.`
    };
  }
}
