import { GoogleGenAI } from '@google/genai';
import type { Room } from '../../../src/types.js';
import { AnalyzeRequest, AnalyzeResponse, ImageEditResponse } from './types.js';

const API_KEY = process.env.GEMINI_API_KEY;
const ANALYZE_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash';

function getClient(): GoogleGenAI {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey: API_KEY });
}

export async function analyzeWithGemini(
  request: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const { plan, currentFloor } = request;
  const ai = getClient();

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

  const response = await ai.models.generateContent({
    model: ANALYZE_MODEL,
    contents: prompt,
  });

  const text = response.text || '';

  return {
    text,
    provider: 'gemini',
    model: ANALYZE_MODEL,
    usage: response.usageMetadata
      ? {
          inputTokens: response.usageMetadata.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
        }
      : undefined,
  };
}

export async function editImageWithGemini(
  imageBase64: string,
  mimeType: string,
  promptText: string
): Promise<ImageEditResponse> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
        { inlineData: { data: imageBase64, mimeType } },
        { text: promptText },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return {
        imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        provider: 'gemini',
        model: IMAGE_MODEL,
      };
    }
  }

  throw new Error('Gemini did not return an edited image');
}
