import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import pool from '../db/pool.js';
import { SAMPLE_DATASETS } from '../services/sampleDatasets.js';
import { writeAuditLog } from '../services/auditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}.csv`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted.'));
    }
  }
});

function sanitizeTableName(id) {
  return `ds_${id.replace(/-/g, '_')}`;
}

function sanitizeColumnNames(rawCols) {
  const seen = new Map();
  return rawCols.map((raw, idx) => {
    let clean = String(raw || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
    if (!clean || /^\d/.test(clean)) clean = `col_${idx + 1}${clean ? '_' + clean : ''}`;
    const count = seen.get(clean) || 0;
    seen.set(clean, count + 1);
    return count === 0 ? clean : `${clean}_${count + 1}`;
  });
}

function parseNumericCandidate(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const s = String(val ?? '').trim();
  if (!s) return null;
  // Strip common currency symbols and thousand commas like $1,250.50 or 45%
  const cleaned = s.replace(/^[$€£₹]/, '').replace(/,/g, '').replace(/%$/, '').trim();
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function inferColumnType(values) {
  const nonEmpty = values.filter((v) => v !== '' && v !== null && v !== undefined);
  if (nonEmpty.length === 0) return 'TEXT';
  const allNumeric = nonEmpty.every((v) => parseNumericCandidate(v) !== null);
  return allNumeric ? 'NUMERIC' : 'TEXT';
}

/**
 * Shared helper to register dataset metadata, create its table, and batch-insert rows.
 */
async function createDatasetTableAndRows({
  client,
  userId,
  name,
  originalFilename,
  description = '',
  isSample = false,
  columns,
  columnTypes,
  rows
}) {
  const datasetResult = await client.query(
    `INSERT INTO datasets (user_id, name, original_filename, description, is_sample, row_count, columns, column_types)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      userId,
      name,
      originalFilename,
      description,
      isSample,
      rows.length,
      JSON.stringify(columns),
      JSON.stringify(columnTypes)
    ]
  );

  const dataset = datasetResult.rows[0];
  const tableName = sanitizeTableName(dataset.id);

  await client.query('UPDATE datasets SET table_name = $1 WHERE id = $2', [tableName, dataset.id]);

  const colDefs = columns
    .map((col) => `"${col.replace(/"/g, '""')}" ${columnTypes[col] || 'TEXT'}`)
    .join(', ');

  await client.query(`DROP TABLE IF EXISTS "${tableName}"`);
  await client.query(`CREATE TABLE "${tableName}" (${colDefs})`);

  // Multi-row batch insert for high performance on remote Supabase
  const colNamesSql = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');
  const batchSize = Math.max(1, Math.min(100, Math.floor(1500 / columns.length)));

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values = [];
    const valueTuples = [];
    let paramIndex = 1;

    for (const record of chunk) {
      const placeholders = [];
      for (const col of columns) {
        const raw = record[col];
        let val = null;
        if (raw !== '' && raw !== null && raw !== undefined) {
          val = columnTypes[col] === 'NUMERIC' ? parseNumericCandidate(raw) : String(raw);
        }
        values.push(val);
        placeholders.push(`$${paramIndex++}`);
      }
      valueTuples.push(`(${placeholders.join(', ')})`);
    }

    await client.query(
      `INSERT INTO "${tableName}" (${colNamesSql}) VALUES ${valueTuples.join(', ')}`,
      values
    );
  }

  return { ...dataset, table_name: tableName };
}

// POST /api/datasets/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  let filePath = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded.' });

    filePath = req.file.path;
    const fileContent = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');

    let rawRecords;
    try {
      rawRecords = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true
      });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid CSV file: ' + e.message });
    }

    if (!rawRecords.length) return res.status(400).json({ error: 'CSV file is empty.' });
    if (rawRecords.length > 10000) {
      return res.status(400).json({ error: 'CSV exceeds maximum 10,000 rows for free-tier workspace.' });
    }

    const rawColumns = Object.keys(rawRecords[0]);
    if (rawColumns.length === 0) return res.status(400).json({ error: 'CSV has no columns.' });

    const columns = sanitizeColumnNames(rawColumns);
    const records = rawRecords.map((row) => {
      const normalized = {};
      rawColumns.forEach((rawCol, i) => {
        normalized[columns[i]] = row[rawCol];
      });
      return normalized;
    });

    const columnTypes = {};
    for (const col of columns) {
      const sample = records.slice(0, 60).map((r) => r[col]);
      columnTypes[col] = inferColumnType(sample);
    }

    const datasetName = (req.body.name || req.file.originalname.replace(/\.csv$/i, '')).trim().slice(0, 120);
    const description = String(req.body.description || `Uploaded CSV (${records.length} rows, ${columns.length} columns)`).slice(0, 400);

    await client.query('BEGIN');
    const dataset = await createDatasetTableAndRows({
      client,
      userId: req.user.id,
      name: datasetName,
      originalFilename: req.file.originalname,
      description,
      isSample: false,
      columns,
      columnTypes,
      rows: records
    });
    await client.query('COMMIT');

    try { unlinkSync(filePath); } catch {}

    await writeAuditLog({
      userId: req.user.id,
      action: 'DATASET_UPLOADED',
      riskLevel: 'low',
      details: { datasetId: dataset.id, name: datasetName, rows: records.length, columns: columns.length }
    });

    res.status(201).json({
      message: 'Dataset uploaded successfully!',
      dataset
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (filePath) { try { unlinkSync(filePath); } catch {} }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process dataset: ' + error.message });
  } finally {
    client.release();
  }
});

// POST /api/datasets/seed-samples — creates 2 built-in demo datasets if not already present
router.post('/seed-samples', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const existing = await pool.query(
      'SELECT name FROM datasets WHERE user_id = $1 AND is_sample = TRUE',
      [req.user.id]
    );
    const existingNames = new Set(existing.rows.map((r) => r.name));
    const created = [];

    await client.query('BEGIN');
    for (const sample of SAMPLE_DATASETS) {
      if (existingNames.has(sample.name)) continue;
      const ds = await createDatasetTableAndRows({
        client,
        userId: req.user.id,
        name: sample.name,
        originalFilename: sample.originalFilename,
        description: sample.description,
        isSample: true,
        columns: sample.columns,
        columnTypes: sample.columnTypes,
        rows: sample.rows
      });
      created.push(ds);
    }
    await client.query('COMMIT');

    const allDatasets = await pool.query(
      `SELECT id, name, original_filename, description, is_sample, row_count, columns, column_types, table_name, created_at
       FROM datasets WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      message: created.length > 0 ? `Loaded ${created.length} sample dataset(s).` : 'Sample datasets already loaded.',
      datasets: allDatasets.rows
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed sample error:', error);
    res.status(500).json({ error: 'Failed to load sample datasets: ' + error.message });
  } finally {
    client.release();
  }
});

// GET /api/datasets
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, original_filename, description, is_sample, row_count, columns, column_types, table_name, created_at
       FROM datasets WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ datasets: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch datasets.' });
  }
});

// GET /api/datasets/:id (with 15-row preview)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM datasets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Dataset not found.' });

    const dataset = result.rows[0];
    const sample = await pool.query(`SELECT * FROM "${dataset.table_name}" LIMIT 15`);

    res.json({ dataset: { ...dataset, sample: sample.rows } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dataset.' });
  }
});

// DELETE /api/datasets/:id
router.delete('/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await pool.query(
      'SELECT * FROM datasets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Dataset not found.' });

    const { table_name, name } = result.rows[0];
    await client.query('BEGIN');
    await client.query(`DROP TABLE IF EXISTS "${table_name}"`);
    await client.query('DELETE FROM datasets WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    await writeAuditLog({
      userId: req.user.id,
      action: 'DATASET_DELETED',
      riskLevel: 'high',
      details: { datasetId: req.params.id, name }
    });

    res.json({ message: 'Dataset deleted successfully.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'Failed to delete dataset.' });
  } finally {
    client.release();
  }
});

export default router;
