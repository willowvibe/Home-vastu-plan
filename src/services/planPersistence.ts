import { FloorPlan } from '../types';

export interface PersistedPlan {
  id: string;
  name: string;
  plan: FloorPlan;
  timestamp: number;
  version: string;
}

type PlanMessageType = 'SAVE_PLAN' | 'LOAD_PLAN' | 'LIST_PLANS' | 'DELETE_PLAN';

interface SwMessage {
  type: PlanMessageType;
  requestId: string;
  payload?: Record<string, unknown>;
}

interface SwResponse {
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

const AUTOSAVE_ID = 'autosave';
let requestCounter = 0;

function getServiceWorker(): ServiceWorker | null {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return null;
  return navigator.serviceWorker.controller;
}

function sendMessage(sw: ServiceWorker, message: SwMessage): Promise<SwResponse> {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${++requestCounter}`;
    const handler = (event: MessageEvent) => {
      const data = event.data as SwResponse | undefined;
      if (data?.requestId === requestId) {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(data);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    sw.postMessage({ ...message, requestId });
    // Safety timeout in case the SW never replies.
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener('message', handler);
      reject(new Error('Service worker did not respond to plan persistence message'));
    }, 5000);
  });
}

export async function savePlanToIndexedDB(
  plan: FloorPlan,
  options: { id?: string; name?: string; version?: string } = {}
): Promise<void> {
  const sw = getServiceWorker();
  if (!sw) return;
  const id = options.id ?? AUTOSAVE_ID;
  const name = options.name ?? 'Autosave';
  const version = options.version ?? '0.1.1';
  const response = await sendMessage(sw, {
    type: 'SAVE_PLAN',
    requestId: '',
    payload: { id, name, plan, version },
  });
  if (!response.ok) {
    throw new Error(response.error || 'Failed to save plan');
  }
}

export async function loadPlanFromIndexedDB(
  id: string = AUTOSAVE_ID
): Promise<PersistedPlan | null> {
  const sw = getServiceWorker();
  if (!sw) return null;
  const response = await sendMessage(sw, {
    type: 'LOAD_PLAN',
    requestId: '',
    payload: { id },
  });
  if (!response.ok || !response.data) return null;
  return response.data as PersistedPlan;
}

export async function listPersistedPlans(): Promise<PersistedPlan[]> {
  const sw = getServiceWorker();
  if (!sw) return [];
  const response = await sendMessage(sw, {
    type: 'LIST_PLANS',
    requestId: '',
  });
  if (!response.ok || !Array.isArray(response.data)) return [];
  return response.data as PersistedPlan[];
}

export async function deletePersistedPlan(id: string = AUTOSAVE_ID): Promise<void> {
  const sw = getServiceWorker();
  if (!sw) return;
  const response = await sendMessage(sw, {
    type: 'DELETE_PLAN',
    requestId: '',
    payload: { id },
  });
  if (!response.ok) {
    throw new Error(response.error || 'Failed to delete plan');
  }
}

export { AUTOSAVE_ID };
