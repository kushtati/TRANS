// src/config/gemini.ts
// Shared Gemini AI client — single instance used by all modules

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { env } from './env.js';
import { log } from './logger.js';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

let _model: GenerativeModel | null = null;
let _modelName = GEMINI_MODELS[0];
let _initDone = false;
let _initPromise: Promise<void> | null = null;

/**
 * Initialize: test models in order, pick first working one.
 * Safe to call multiple times — runs once.
 */
async function doInit(): Promise<void> {
  if (_initDone || !genAI) return;
  _initDone = true;

  for (const m of GEMINI_MODELS) {
    try {
      const testModel = genAI.getGenerativeModel({ model: m });
      await testModel.generateContent('test');
      _model = testModel;
      _modelName = m;
      log.info(`AI model selected: ${m}`);
      return;
    } catch (e: any) {
      log.warn(`AI model ${m} unavailable: ${e.message?.substring(0, 80)}`);
    }
  }
}

/** Kick off init once at import time (non-blocking). */
export function startGeminiInit(): void {
  if (!_initPromise && genAI) {
    _initPromise = doInit().catch(() => {});
  }
}

/** Wait for init to finish (for routes that need the model right away). */
export async function ensureGeminiReady(): Promise<void> {
  if (_initPromise) await _initPromise;
}

/** Get the active Gemini model (null if unavailable). */
export function getGeminiModel(): GenerativeModel | null {
  return _model;
}

/** Get the active model name. */
export function getGeminiModelName(): string {
  return _modelName;
}

// Auto-start init on first import
startGeminiInit();
