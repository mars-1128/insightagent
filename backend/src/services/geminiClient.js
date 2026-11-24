import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Ordered model chain: high-quota fast Gemini 3.x models first, daily-capped flagship last
export const SUPPORTED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

const modelCooldownUntil = new Map();
const TRANSIENT_COOLDOWN_MS = 60 * 1000;
const QUOTA_COOLDOWN_MS = 30 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaError(err) {
  const status = err?.status || err?.statusCode;
  const msg = String(err?.message || '').toLowerCase();
  return status === 429 || msg.includes('rate limit') || msg.includes('quota');
}

function isTransientError(err) {
  const status = err?.status || err?.statusCode;
  const msg = String(err?.message || '').toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    status === 502 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('high demand') ||
    msg.includes('service_unavailable') ||
    msg.includes('timeout') ||
    msg.includes('econnreset')
  );
}

/**
 * Prompt-injection defense: wraps untrusted user or CSV content in strict XML-style delimiters.
 */
export function fenceUntrustedText(label, text) {
  const cleaned = String(text ?? '')
    .replace(/<\/untrusted_/gi, '&lt;/untrusted_')
    .slice(0, 4000);
  return `<untrusted_${label}>\n${cleaned}\n</untrusted_${label}>`;
}

/**
 * Calls Gemini Interactions API with transient retry + automatic model fallback.
 */
export async function createInteractionWithFallback({
  preferredModel = 'gemini-3.5-flash-lite',
  input,
  system_instruction,
  tools,
  previous_interaction_id,
  response_format,
  store = true,
  timeoutMs = 15000,
  maxModelsToTry = 5
}) {
  const now = Date.now();
  const ordered = [
    preferredModel,
    ...SUPPORTED_MODELS.filter((m) => m !== preferredModel)
  ];

  const healthy = ordered.filter((m) => (modelCooldownUntil.get(m) || 0) <= now);
  const cooling = ordered.filter((m) => (modelCooldownUntil.get(m) || 0) > now);
  const candidates = [...healthy, ...cooling].slice(0, maxModelsToTry);

  let lastError = null;
  const fallbackEvents = [];

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    const maxAttemptsForModel = i === 0 ? 3 : 2;

    for (let attempt = 1; attempt <= maxAttemptsForModel; attempt++) {
      try {
        const payload = {
          model,
          input,
          store
        };
        if (system_instruction) payload.system_instruction = system_instruction;
        if (tools && tools.length > 0) payload.tools = tools;
        if (previous_interaction_id && i === 0 && model === preferredModel) {
          payload.previous_interaction_id = previous_interaction_id;
        }
        if (response_format) payload.response_format = response_format;

        const interaction = await ai.interactions.create(payload, {
          maxRetries: 0,
          timeout: timeoutMs
        });

        modelCooldownUntil.delete(model);

        return {
          interaction,
          modelUsed: model,
          fallbackEvents
        };
      } catch (err) {
        lastError = err;
        const errMsg = err?.message || 'Unknown Gemini error';
        console.warn(
          `⚠️ Gemini model "${model}" attempt ${attempt} failed (${err?.status || err?.statusCode || 'ERR'}): ${errMsg.slice(0, 140)}`
        );

        if (isQuotaError(err)) {
          // Daily or per-minute quota hit -> skip retrying this model immediately and fail over
          modelCooldownUntil.set(model, Date.now() + QUOTA_COOLDOWN_MS);
          fallbackEvents.push({
            failedModel: model,
            reason: errMsg.slice(0, 180)
          });
          if (previous_interaction_id && typeof input === 'string') {
            previous_interaction_id = undefined;
          }
          break;
        }

        if (isTransientError(err)) {
          if (attempt < maxAttemptsForModel) {
            await sleep(attempt === 1 ? 800 : 1800);
            continue;
          }
          modelCooldownUntil.set(model, Date.now() + TRANSIENT_COOLDOWN_MS);
          fallbackEvents.push({
            failedModel: model,
            reason: errMsg.slice(0, 180)
          });
          if (previous_interaction_id && typeof input === 'string') {
            previous_interaction_id = undefined;
          }
          break;
        }

        if (previous_interaction_id && String(errMsg).toLowerCase().includes('interaction')) {
          previous_interaction_id = undefined;
          continue;
        }
        throw err;
      }
    }
  }

  throw new Error(
    `All Gemini models temporarily unavailable. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

export default ai;
