import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch for Ollama HTTP calls.
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
process.env.OLLAMA_MODEL = 'deepseek-v4-pro';

import { analyzeWithOllama } from '../ollama.js';
import { AnalyzeRequest } from '../types.js';

const PLAN: AnalyzeRequest = {
  plan: {
    plotWidth: 30,
    plotHeight: 40,
    northAngle: 0,
    roadDirection: 'N',
    unit: 'ft',
    setbacks: { top: 0, right: 0, bottom: 0, left: 0 },
    rooms: [
      {
        id: 'r1',
        type: 'Bedroom',
        x: 5,
        y: 5,
        w: 10,
        h: 12,
        floor: 0,
        wallThickness: 9,
      },
    ],
  },
  currentFloor: 0,
};

describe('analyzeWithOllama', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('returns text and usage from Ollama', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: '# Vastu Analysis\n\nGood.',
        prompt_eval_count: 80,
        eval_count: 40,
      }),
    });

    const result = await analyzeWithOllama(PLAN);

    expect(result.text).toBe('# Vastu Analysis\n\nGood.');
    expect(result.provider).toBe('ollama');
    expect(result.model).toBe('deepseek-v4-pro');
    expect(result.usage).toEqual({ inputTokens: 80, outputTokens: 40 });

    // Verify the fetch call shape.
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/generate');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('deepseek-v4-pro');
    expect(body.stream).toBe(false);
    expect(body.prompt).toContain('Vastu Shastra consultant');
  });

  it('throws on non-ok response from Ollama', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    await expect(analyzeWithOllama(PLAN)).rejects.toThrow('Ollama API error 503');
  });

  it('handles missing response field gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '' }),
    });

    const result = await analyzeWithOllama(PLAN);
    expect(result.text).toBe('');
  });
});
