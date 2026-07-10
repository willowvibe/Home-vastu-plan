import { FloorPlan } from '../types';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabase) {
    throw new Error('Supabase is not configured. AI features require authentication.');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Authentication required for AI features');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function analyzeFloorPlan(
  plan: FloorPlan,
  currentFloor: number
): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/ai/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ plan, currentFloor }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI analysis failed');
  }

  const data = await res.json();
  return data.text;
}

export async function editFloorPlanImage(
  imageFile: File,
  promptText: string
): Promise<string | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured. AI features require authentication.');
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error('Authentication required for AI features');
  }

  const form = new FormData();
  form.append('image', imageFile);
  form.append('prompt', promptText);

  const res = await fetch(`${API_URL}/api/ai/edit-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Image editing failed');
  }

  const data = await res.json();
  return data.imageUrl || null;
}
