import { GoogleGenAI } from '@google/genai';
import { FloorPlan } from '../types';

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    // Q-25: prefer import.meta.env.VITE_GEMINI_API_KEY (Vite's standard
    // client-side env var). Fall back to process.env.GEMINI_API_KEY (set via
    // Vite's `define` in vite.config.ts) and then to a non-prefixed
    // VITE_GEMINI_API_KEY on process.env (older convention) for compat.
    const key =
      import.meta.env.VITE_GEMINI_API_KEY ||
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY);
    if (!key) {
      throw new Error(
        'VITE_GEMINI_API_KEY not configured. Set it in your .env file (see .env.example).'
      );
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

export async function analyzeFloorPlan(plan: FloorPlan, currentFloor: number) {
  const prompt = `
You are an expert Indian Architect and Vastu Shastra consultant.
Analyze the following floor plan (Floor ${currentFloor}) for a house in India.
Plot Size: ${plan.plotWidth} ft x ${plan.plotHeight} ft.
North is UP (Y=0 is North, Y=${plan.plotHeight} is South, X=0 is West, X=${plan.plotWidth} is East).

Rooms on this floor:
${plan.rooms
  .filter((r) => r.floor === currentFloor)
  .map((r) => `- ${r.type}: ${r.w}x${r.h} ft at (X:${r.x}, Y:${r.y})`)
  .join('\n')}

Provide a detailed analysis covering:
1. Vastu Compliance (Score out of 100, what's good, what's bad, and remedies).
2. Construction & Structural Guidance (tips on beams, columns, plumbing for bathrooms/kitchens, ventilation).
3. Room-level Intelligence (suggestions for ideal dimensions, orientations, and placements).

Format your response in clean Markdown with clear headings and bullet points.
`;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || '';
}

export async function editFloorPlanImage(imageFile: File, promptText: string) {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(imageFile);
  });

  const response = await getAI().models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: imageFile.type,
          },
        },
        {
          text: promptText,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  // Fallback: if no image was generated, return null so the UI can show a message
  return null;
}
