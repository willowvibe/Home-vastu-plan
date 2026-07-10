import { FloorPlan } from '../../../src/types.js';

export interface AnalyzeRequest {
  plan: FloorPlan;
  currentFloor: number;
}

export interface AnalyzeResponse {
  text: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ImageEditResponse {
  imageUrl: string;
  provider: string;
  model: string;
}

export interface AiProvider {
  name: string;
  analyze(request: AnalyzeRequest): Promise<AnalyzeResponse>;
}
