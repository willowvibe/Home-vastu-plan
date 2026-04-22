import { GoogleGenAI } from "@google/genai";
import { FloorPlan } from "../types";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    // Vite injects env vars via define; fall back to import.meta.env for standard Vite usage
    const key =
      (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY);
    if (!key) {
      throw new Error(
        "GEMINI_API_KEY not configured. Please set it in your environment or .env file.",
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
${plan.rooms.filter((r) => r.floor === currentFloor).map((r) => `- ${r.type}: ${r.w}x${r.h} ft at (X:${r.x}, Y:${r.y})`).join("\n")}

Provide a detailed analysis covering:
1. Vastu Compliance (Score out of 100, what's good, what's bad, and remedies).
2. Construction & Structural Guidance (tips on beams, columns, plumbing for bathrooms/kitchens, ventilation).
3. Room-level Intelligence (suggestions for ideal dimensions, orientations, and placements).

Format your response in clean Markdown with clear headings and bullet points.
`;

  const response = await getAI().models.generateContent({
    model: "gemini-2.5-pro-preview-03-25",
    contents: prompt,
  });

  return response.text || "";
}

export async function editFloorPlanImage(imageFile: File, promptText: string) {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(imageFile);
  });

  const response = await getAI().models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
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

  throw new Error("No image generated");
}
