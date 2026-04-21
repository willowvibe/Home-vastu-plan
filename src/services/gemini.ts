import { GoogleGenAI } from "@google/genai";
import { FloorPlan } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeFloorPlan(plan: FloorPlan, currentFloor: number) {
  const prompt = `
You are an expert Indian Architect and Vastu Shastra consultant.
Analyze the following floor plan (Floor ${currentFloor}) for a house in India.
Plot Size: ${plan.plotWidth} ft x ${plan.plotHeight} ft.
North is UP (Y=0 is North, Y=${plan.plotHeight} is South, X=0 is West, X=${plan.plotWidth} is East).

Rooms on this floor:
${plan.rooms.filter(r => r.floor === currentFloor).map(r => `- ${r.type}: ${r.w}x${r.h} ft at (X:${r.x}, Y:${r.y})`).join('\n')}

Provide a detailed analysis covering:
1. Vastu Compliance (Score out of 100, what's good, what's bad, and remedies).
2. Construction & Structural Guidance (tips on beams, columns, plumbing for bathrooms/kitchens, ventilation).
3. Room-level Intelligence (suggestions for ideal dimensions, orientations, and placements).

Format your response in clean Markdown with clear headings and bullet points.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text;
}

export async function editFloorPlanImage(imageFile: File, promptText: string) {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
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
