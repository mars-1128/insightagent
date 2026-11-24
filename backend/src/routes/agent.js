import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import pool from '../db/pool.js';
import {
  createExecutionPlan,
  updateExecutionPlan,
  executeAgentRun,
  resumeAgentRun,
  stopAgentRun
} from '../services/agentEngine.js';
import { SUPPORTED_MODELS } from '../services/geminiClient.js';

const router = express.Router();

const planSchema = z.object({
  datasetId: z.string().uuid('Valid datasetId is required'),
  goal: z.string().min(3, 'Please enter an analytics goal or question').max(1000),
  model: z.string().optional(),
  requireSqlApproval: z.boolean().optional().default(false)
});

const editPlanSchema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(2).max(120),
        description: z.string().max(300).optional().default(''),
        toolHint: z.string().optional().default('execute_readonly_sql'),
        requiresApproval: z.boolean().optional().default(false)
      })
    )
    .min(1)
    .max(10),
  requireSqlApproval: z.boolean().optional().default(false)
});

const respondSchema = z.object({
  type: z.enum(['approval', 'clarification']),
  approved: z.boolean().optional(),
  editedSql: z.string().optional(),
  editedFilename: z.string().optional(),
  reason: z.string().max(500).optional(),
  answer: z.string().max(500).optional()
});

function setupSse(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  return (event, data) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
}

// GET /api/agent/models
router.get('/models', authenticate, (req, res) => {
  res.json({
    models: SUPPORTED_MODELS.map((id) => ({
      id,
      recommended: id === 'gemini-3.8-flash' || id === 'gemini-3.5-flash-lite'
    }))
  });
});

// POST /api/agent/plan — generates an editable execution plan
router.post('/plan', authenticate, async (req, res) => {
  try {
    const { datasetId, goal, model, requireSqlApproval } = planSchema.parse(req.body);
    const preferredModel = model && SUPPORTED_MODELS.includes(model) ? model : 'gemini-3.5-flash-lite';

    const run = await createExecutionPlan({
      userId: req.user.id,
      datasetId,
      goal,
      preferredModel,
      requireSqlApproval
    });

    res.status(201).json({ run });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Plan creation error:', error);
    res.status(400).json({ error: error.message || 'Failed to create plan.' });
  }
});

// PATCH /api/agent/runs/:id/plan — edit steps before execution
router.patch('/runs/:id/plan', authenticate, async (req, res) => {
  try {
    const { steps, requireSqlApproval } = editPlanSchema.parse(req.body);
    const run = await updateExecutionPlan({
      runId: req.params.id,
      userId: req.user.id,
      steps,
      requireSqlApproval
    });
    res.json({ run });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message || 'Failed to update plan.' });
  }
});

// POST /api/agent/runs/:id/execute — runs plan via SSE stream (or JSON when ?stream=false)
router.post('/runs/:id/execute', authenticate, async (req, res) => {
  const useStream = req.query.stream !== 'false';

  if (!useStream) {
    let finalPayload = null;
    try {
      await executeAgentRun({
        runId: req.params.id,
        userId: req.user.id,
        emit: (event, data) => {
          if (['completed', 'approval_required', 'clarification_required', 'failed', 'stopped'].includes(event)) {
            finalPayload = { event, data };
          }
        }
      });
      const latest = await pool.query('SELECT * FROM agent_runs WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user.id
      ]);
      return res.json({ run: latest.rows[0], lastEvent: finalPayload });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  const sendEvent = setupSse(res);
  try {
    await executeAgentRun({
      runId: req.params.id,
      userId: req.user.id,
      emit: sendEvent
    });
  } catch (error) {
    sendEvent('failed', { error: error.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// POST /api/agent/runs/:id/respond — approve/reject/clarify and resume via SSE stream
router.post('/runs/:id/respond', authenticate, async (req, res) => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const useStream = req.query.stream !== 'false';
  if (!useStream) {
    try {
      await resumeAgentRun({
        runId: req.params.id,
        userId: req.user.id,
        decision: parsed.data,
        emit: () => {}
      });
      const latest = await pool.query('SELECT * FROM agent_runs WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user.id
      ]);
      return res.json({ run: latest.rows[0] });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  const sendEvent = setupSse(res);
  try {
    await resumeAgentRun({
      runId: req.params.id,
      userId: req.user.id,
      decision: parsed.data,
      emit: sendEvent
    });
  } catch (error) {
    sendEvent('failed', { error: error.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// POST /api/agent/runs/:id/stop — stops an active or paused run
router.post('/runs/:id/stop', authenticate, async (req, res) => {
  try {
    const run = await stopAgentRun({ runId: req.params.id, userId: req.user.id });
    res.json({ run });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/agent/runs — list task history
router.get('/runs', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, dataset_id, dataset_name, goal, status, model, require_sql_approval,
              plan, trace, pending_action, result, error_message, created_at, updated_at
       FROM agent_runs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ runs: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load task history.' });
  }
});

// GET /api/agent/runs/:id
router.get('/runs/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM agent_runs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Run not found.' });
    res.json({ run: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load run.' });
  }
});

// DELETE /api/agent/runs/:id
router.delete('/runs/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM agent_runs WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    res.json({ message: 'Run removed from history.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete run.' });
  }
});

// GET /api/agent/audit-logs
router.get('/audit-logs', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, run_id, action, risk_level, details, created_at
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({ logs: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

export default router;
