import type { Room } from '../../../src/types.js';
import { AnalyzeRequest, AnalyzeResponse } from './types.js';

const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'deepseek-v4-pro';

export async function analyzeWithOllama(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const { plan, currentFloor } = request;

  const prompt = `
You are an expert Indian Architect and Vastu Shastra consultant.
Analyze the following floor plan (Floor ${currentFloor}) for a house in India.
Plot Size: ${plan.plotWidth} ft x ${plan.plotHeight} ft.
North is UP (Y=0 is North, Y=${plan.plotHeight} is South, X=0 is West, X=${plan.plotWidth} is East).

Rooms on this floor:
${plan.rooms
  .filter((r: Room) => r.floor === currentFloor)
  .map((r: Room) => `- ${r.type}: ${r.w}x${r.h} ft at (X:${r.x}, Y:${r.y})`)
  .join('\n')}

Provide a detailed analysis covering:
1. Vastu Compliance (Score out of 100, what's good, what's bad, and remedies).
2. Construction & Structural Guidance (tips on beams, columns, plumbing for bathrooms/kitchens, ventilation).
3. Room-level Intelligence (suggestions for ideal dimensions, orientations, and placements).

Format your response in clean Markdown with clear headings and bullet points.
`;

  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    response: string;
    prompt_eval_count?: number;
    eval_count?: number;
  };

  return {
    text: data.response || '',
    provider: 'ollama',
    model: MODEL,
    usage: {
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
    },
  };
}
