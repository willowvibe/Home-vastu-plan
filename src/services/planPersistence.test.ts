import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  savePlanToIndexedDB,
  loadPlanFromIndexedDB,
  listPersistedPlans,
  deletePersistedPlan,
  AUTOSAVE_ID,
} from './planPersistence';
import { FloorPlan } from '../types';

const basePlan: FloorPlan = {
  plotWidth: 30,
  plotHeight: 40,
  northAngle: 0,
  roadDirection: 'N',
  unit: 'ft',
  setbacks: { top: 0, right: 0, bottom: 0, left: 0 },
  rooms: [],
};

function createMockController(): ServiceWorker {
  return {
    postMessage: vi.fn(),
  } as unknown as ServiceWorker;
}

describe('planPersistence', () => {
  let controller: ServiceWorker;
  let listeners: Array<(event: MessageEvent) => void> = [];

  beforeEach(() => {
    controller = createMockController();
    listeners = [];
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller,
        addEventListener: (_type: string, handler: (event: MessageEvent) => void) => {
          listeners.push(handler);
        },
        removeEventListener: (_type: string, handler: (event: MessageEvent) => void) => {
          listeners = listeners.filter((l) => l !== handler);
        },
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true,
      writable: true,
    });
  });

  function replyWith(response: { ok: boolean; data?: unknown; error?: string }) {
    setTimeout(() => {
      const lastCall = (controller.postMessage as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      const message = lastCall?.[0] as { requestId?: string } | undefined;
      listeners.forEach((listener) =>
        listener(
          new MessageEvent('message', {
            data: { ...response, requestId: message?.requestId },
          })
        )
      );
    }, 10);
  }

  it('returns null when no service worker controller is available', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true,
      writable: true,
    });
    const result = await loadPlanFromIndexedDB();
    expect(result).toBeNull();
  });

  it('sends a SAVE_PLAN message to the service worker', async () => {
    replyWith({ ok: true });
    await savePlanToIndexedDB(basePlan, { name: 'My plan' });
    expect(controller.postMessage).toHaveBeenCalledTimes(1);
    const message = (controller.postMessage as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(message.type).toBe('SAVE_PLAN');
    expect(message.payload.id).toBe(AUTOSAVE_ID);
    expect(message.payload.name).toBe('My plan');
    expect(message.payload.plan).toEqual(basePlan);
  });

  it('loads a persisted plan from the service worker', async () => {
    const persisted = {
      id: AUTOSAVE_ID,
      name: 'Autosave',
      plan: basePlan,
      timestamp: 1,
      version: '0.1.1',
    };
    replyWith({ ok: true, data: persisted });
    const result = await loadPlanFromIndexedDB();
    expect(result).toEqual(persisted);
  });

  it('lists persisted plans', async () => {
    const persisted = [
      { id: 'p1', name: 'Plan 1', plan: basePlan, timestamp: 1, version: '0.1.1' },
    ];
    replyWith({ ok: true, data: persisted });
    const result = await listPersistedPlans();
    expect(result).toEqual(persisted);
  });

  it('deletes a persisted plan', async () => {
    replyWith({ ok: true });
    await deletePersistedPlan('p1');
    const message = (controller.postMessage as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(message.type).toBe('DELETE_PLAN');
    expect(message.payload.id).toBe('p1');
  });

  it('throws when the service worker replies with an error', async () => {
    replyWith({ ok: false, error: 'DB blocked' });
    await expect(savePlanToIndexedDB(basePlan)).rejects.toThrow('DB blocked');
  });

  it('returns an empty list when the service worker is unavailable', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true,
      writable: true,
    });
    const result = await listPersistedPlans();
    expect(result).toEqual([]);
  });
});
