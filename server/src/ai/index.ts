import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { analyzeWithGemini, editImageWithGemini } from './gemini.js';
import { analyzeWithOllama } from './ollama.js';
import { AnalyzeRequest } from './types.js';

const router = Router();

// Multer for multipart image uploads (edit-image endpoint).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All AI routes require authentication.
router.use(authenticate as any);

const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

/**
 * POST /api/ai/analyze
 * Body: { plan: FloorPlan, currentFloor: number }
 * Returns: { text: string }
 */
router.post('/analyze', async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { plan, currentFloor } = req.body as AnalyzeRequest & { currentFloor: number };
  if (!plan || currentFloor === undefined) {
    res.status(400).json({ error: 'plan and currentFloor are required' });
    return;
  }

  const start = Date.now();
  let status: 'success' | 'error' = 'success';
  let errorMessage: string | null = null;
  let model = '';
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    let result;
    if (PROVIDER === 'ollama') {
      model = process.env.OLLAMA_MODEL || 'deepseek-v4-pro';
      result = await analyzeWithOllama({ plan, currentFloor });
    } else {
      model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      result = await analyzeWithGemini({ plan, currentFloor });
    }

    inputTokens = result.usage?.inputTokens;
    outputTokens = result.usage?.outputTokens;

    // Log usage to DB (fire-and-forget).
    query(
      `INSERT INTO public.ai_usage (user_id, plan_id, endpoint, provider, model, status, input_tokens, output_tokens, duration_ms)
       VALUES ($1, $2, 'analyze', $3, $4, 'success', $5, $6, $7)`,
      [
        userId,
        (plan as any).id || null,
        PROVIDER,
        model,
        inputTokens,
        outputTokens,
        Date.now() - start,
      ]
    ).catch((err) => console.error('Failed to log AI usage:', err));

    res.json({ text: result.text });
  } catch (err: any) {
    status = 'error';
    errorMessage = err.message || 'Unknown error';

    // Log error to DB.
    query(
      `INSERT INTO public.ai_usage (user_id, plan_id, endpoint, provider, model, status, error_message, duration_ms)
       VALUES ($1, $2, 'analyze', $3, $4, 'error', $5, $6)`,
      [userId, (plan as any).id || null, PROVIDER, model, errorMessage, Date.now() - start]
    ).catch(() => {});

    console.error('AI analyze error:', err);
    const statusCode =
      err.message?.includes('unavailable') || err.message?.includes('503')
        ? 502
        : err.message?.includes('quota')
          ? 429
          : 500;

    res.status(statusCode).json({
      error:
        statusCode === 502
          ? 'AI service unavailable'
          : statusCode === 429
            ? 'AI service quota exceeded'
            : 'AI analysis failed',
      provider: PROVIDER,
    });
  }
});

/**
 * POST /api/ai/edit-image
 * Body: multipart/form-data with "image" (file) and "prompt" (text)
 * Returns: { imageUrl: string }
 */
router.post('/edit-image', upload.single('image'), async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Image editing is Gemini-only.
  if (PROVIDER !== 'gemini') {
    res.status(501).json({
      error: 'Image editing requires Gemini',
      configured_provider: PROVIDER,
    });
    return;
  }

  const imageFile = req.file;
  const promptText = req.body?.prompt;

  if (!imageFile) {
    res.status(400).json({ error: 'image file is required' });
    return;
  }
  if (!promptText) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const start = Date.now();
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash';

  try {
    const imageBase64 = imageFile.buffer.toString('base64');
    const mimeType = imageFile.mimetype || 'image/png';

    const result = await editImageWithGemini(imageBase64, mimeType, promptText);

    // Log usage.
    query(
      `INSERT INTO public.ai_usage (user_id, endpoint, provider, model, status, duration_ms)
       VALUES ($1, 'edit-image', 'gemini', $2, 'success', $3)`,
      [userId, model, Date.now() - start]
    ).catch((err) => console.error('Failed to log AI usage:', err));

    res.json({ imageUrl: result.imageUrl });
  } catch (err: any) {
    query(
      `INSERT INTO public.ai_usage (user_id, endpoint, provider, model, status, error_message, duration_ms)
       VALUES ($1, 'edit-image', 'gemini', $2, 'error', $3, $4)`,
      [userId, model, err.message || 'Unknown error', Date.now() - start]
    ).catch(() => {});

    console.error('AI edit-image error:', err);
    res.status(500).json({ error: 'Image editing failed', provider: 'gemini' });
  }
});

export default router;
