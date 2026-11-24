import pool from '../db/pool.js';

const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE',
  'REPLACE', 'MERGE', 'UPSERT', 'GRANT', 'REVOKE', 'COPY', 'CALL', 'DO',
  'EXECUTE', 'PREPARE', 'DEALLOCATE', 'VACUUM', 'ANALYZE', 'REINDEX',
  'CLUSTER', 'LOCK', 'SET', 'RESET', 'SHOW', 'BEGIN', 'COMMIT', 'ROLLBACK',
  'SAVEPOINT', 'COMMENT', 'SECURITY', 'OWNER', 'EXTENSION', 'FUNCTION',
  'PROCEDURE', 'TRIGGER', 'POLICY', 'ROLE', 'USER', 'DATABASE', 'SCHEMA',
  'PG_SLEEP', 'PG_TERMINATE_BACKEND', 'PG_CANCEL_BACKEND', 'DBLINK',
  'LO_IMPORT', 'LO_EXPORT', 'PG_READ_FILE', 'PG_LS_DIR', 'PG_STAT_ACTIVITY'
];

const INTERNAL_TABLES = new Set([
  'users', 'datasets', 'query_history', 'agent_runs', 'audit_logs',
  'pg_catalog', 'information_schema', 'pg_toast'
]);

const SENSITIVE_COLUMN_HINTS = [
  'email', 'phone', 'mobile', 'ssn', 'password', 'secret', 'token',
  'salary', 'wage', 'credit_card', 'card_number', 'address', 'dob'
];

/**
 * Strips SQL comments and string literals safely for structural validation.
 */
function stripLiteralsAndComments(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    // Line comment --
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      out += ' ';
      continue;
    }
    // Block comment /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      out += ' ';
      continue;
    }
    // Single-quoted string literal
    if (sql[i] === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      out += " 'STR' ";
      continue;
    }
    // Dollar-quoted strings $$...$$ (block them entirely as unsafe in analytics SQL)
    if (sql[i] === '$' && sql[i + 1] === '$') {
      throw new Error('Dollar-quoted SQL strings are not permitted.');
    }
    out += sql[i];
    i++;
  }
  return out;
}

/**
 * Extracts CTE names defined via WITH ... AS (...) so they aren't mistaken for external tables.
 */
function extractCteNames(strippedSql) {
  const ctes = new Set();
  const cteRegex = /(?:WITH|,)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi;
  let m;
  while ((m = cteRegex.exec(strippedSql)) !== null) {
    ctes.add(m[1].toLowerCase());
  }
  return ctes;
}

/**
 * Validates and rewrites a read-only analytics SQL query against authorized user tables.
 */
export function validateReadOnlySql(rawSql, authorizedTableName, columns = []) {
  if (!rawSql || typeof rawSql !== 'string') {
    throw new Error('SQL query must be a non-empty string.');
  }

  let sql = rawSql.trim();
  // Remove trailing semicolon if single statement
  sql = sql.replace(/;+\s*$/, '').trim();

  if (!sql) {
    throw new Error('SQL query is empty.');
  }

  const stripped = stripLiteralsAndComments(sql);

  // Block stacked queries / semicolons inside query
  if (stripped.includes(';')) {
    throw new Error('Multiple SQL statements are strictly forbidden.');
  }

  // Must start with SELECT or WITH
  if (!/^\s*(SELECT|WITH)\b/i.test(stripped)) {
    throw new Error('Only read-only SELECT or WITH queries are allowed.');
  }

  // Reject any forbidden DDL/DML/admin keywords
  const upperTokens = stripped.toUpperCase().match(/\b[A-Z_][A-Z0-9_]*\b/g) || [];
  for (const token of upperTokens) {
    if (FORBIDDEN_KEYWORDS.includes(token)) {
      throw new Error(`Forbidden SQL keyword detected: ${token}. Read-only analytics queries only.`);
    }
  }

  // Block access to system schemas or internal app tables
  const lowerStripped = stripped.toLowerCase();
  for (const internal of INTERNAL_TABLES) {
    const internalRegex = new RegExp(`\\b${internal}\\b`, 'i');
    if (internalRegex.test(lowerStripped)) {
      throw new Error(`Access to internal or system table "${internal}" is forbidden.`);
    }
  }
  if (/\bpg_[a-z0-9_]+\b/i.test(lowerStripped) || /\binformation_schema\b/i.test(lowerStripped)) {
    throw new Error('Access to PostgreSQL system tables is forbidden.');
  }

  // Replace friendly alias `dataset` if the model used FROM dataset or FROM "dataset"
  const safeTable = `"${authorizedTableName}"`;
  sql = sql.replace(
    /\b(FROM|JOIN)\s+(?:"dataset"|dataset)\b/gi,
    `$1 ${safeTable}`
  );

  // Re-strip after optional rewrite and validate every referenced table in FROM / JOIN
  const rewrittenStripped = stripLiteralsAndComments(sql);
  const cteNames = extractCteNames(rewrittenStripped);

  const tableRefRegex = /\b(?:FROM|JOIN)\s+(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_.]*))/gi;
  const referencedTables = [];
  let match;
  while ((match = tableRefRegex.exec(rewrittenStripped)) !== null) {
    const tableIdent = (match[1] || match[2] || '').trim();
    if (!tableIdent || tableIdent.startsWith('(')) continue;
    // Ignore SQL functions like FROM generate_series(...) or EXTRACT(MONTH FROM date_col)
    const afterMatch = rewrittenStripped.slice(match.index + match[0].length);
    if (/^\s*\(/.test(afterMatch)) continue;
    // Check if inside EXTRACT(... FROM col) or SUBSTRING(... FROM ...)
    const beforeMatch = rewrittenStripped.slice(Math.max(0, match.index - 40), match.index);
    if (/\b(?:EXTRACT|SUBSTRING|TRIM|OVERLAY)\s*\([^)]*$/i.test(beforeMatch)) continue;

    referencedTables.push(tableIdent);
  }

  for (const tbl of referencedTables) {
    const lowerTbl = tbl.toLowerCase();
    if (cteNames.has(lowerTbl)) continue;
    if (lowerTbl !== authorizedTableName.toLowerCase()) {
      throw new Error(
        `Unauthorized table reference "${tbl}". Queries may only access the active dataset table "${authorizedTableName}".`
      );
    }
  }

  if (!referencedTables.some((t) => t.toLowerCase() === authorizedTableName.toLowerCase())) {
    throw new Error(
      `Query must select from the active dataset table "${authorizedTableName}".`
    );
  }

  // Ensure outer LIMIT <= 500 to prevent unbounded data dumps
  const hasLimit = /\bLIMIT\s+\d+\b/i.test(rewrittenStripped);
  let finalSql = sql;
  if (!hasLimit) {
    finalSql = `${sql}\nLIMIT 500`;
  } else {
    finalSql = sql.replace(/\bLIMIT\s+(\d+)\b/gi, (_, num) => {
      const n = parseInt(num, 10);
      return `LIMIT ${Math.min(isNaN(n) ? 500 : n, 500)}`;
    });
  }

  // Assess risk level for human-in-the-loop awareness
  const hasAggregation = /\b(SUM|COUNT|AVG|MIN|MAX|GROUP\s+BY)\b/i.test(rewrittenStripped);
  const selectsAll = /\bSELECT\s+\*/i.test(rewrittenStripped);
  const touchesSensitiveCol = columns.some(
    (col) =>
      SENSITIVE_COLUMN_HINTS.some((hint) => col.toLowerCase().includes(hint)) &&
      (selectsAll || new RegExp(`\\b${col.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(rewrittenStripped))
  );

  let riskLevel = 'low';
  let riskReason = 'Read-only aggregated analytics query.';
  if (touchesSensitiveCol) {
    riskLevel = 'medium';
    riskReason = 'Query accesses potentially sensitive columns (e.g., email/phone/salary/address).';
  } else if (selectsAll && !hasAggregation && !hasLimit) {
    riskLevel = 'medium';
    riskReason = 'Broad SELECT * query without aggregation or explicit row limit.';
  }

  return {
    safeSql: finalSql,
    riskLevel,
    riskReason
  };
}

/**
 * Executes a validated read-only query inside a PostgreSQL READ ONLY transaction with timeout.
 */
export async function executeReadOnlyQuery(safeSql) {
  const client = await pool.connect();
  const startedAt = Date.now();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5000'");
    const result = await client.query(safeSql);
    await client.query('COMMIT');

    // Normalize numeric strings / BigInt counts returned by pg for clean JSON & Recharts rendering
    const rows = result.rows.map((row) => {
      const normalized = {};
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) && v.trim().length <= 16) {
          const num = Number(v);
          normalized[k] = Number.isFinite(num) ? num : v;
        } else {
          normalized[k] = v;
        }
      }
      return normalized;
    });

    const columns = result.fields ? result.fields.map((f) => f.name) : [];
    return {
      rows,
      columns,
      rowCount: rows.length,
      executionTimeMs: Date.now() - startedAt
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
