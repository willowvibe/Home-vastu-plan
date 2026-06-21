import { afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';
import { webcrypto } from 'node:crypto';

expect.extend(matchers);

// Polyfill Web Crypto for jsdom so share-link encryption and other subtle
// operations can run in unit tests. jsdom exposes `crypto` but not
// `crypto.subtle`, and the property is read-only, so we patch the subtle
// object directly rather than replacing the whole `crypto` global.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis.crypto, 'subtle', {
    value: webcrypto.subtle,
    writable: true,
    configurable: true,
  });
}

// Mock localStorage for tests. The full Storage interface (length, key)
// isn't used by the codebase, so a minimal cast is fine here.
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
globalThis.localStorage = localStorageMock as unknown as Storage;

// Mock FileReader for tests
const fileReaderMock = {
  readAsText: vi.fn(),
  onload: null as any,
  onerror: null as any,
  result: null as string | ArrayBuffer | null,
};
globalThis.FileReader = class FileReader {
  static EMPTY = 0;
  static LOADING = 1;
  static DONE = 2;
  readonly EMPTY = 0;
  readonly LOADING = 1;
  readonly DONE = 2;
  onerror: ((e: Event) => void) | null = null;
  onload: ((e: Event) => void) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsText(file: File) {
    fileReaderMock.readAsText(file);
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: fileReaderMock.result } } as any);
      }
    }, 0);
  }

  readAsDataURL(file: File) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: `data:${file.type};base64,dGVzdA==` } } as any);
      }
    }, 0);
  }

  abort() {}
} as unknown as typeof globalThis.FileReader;

// Mock IntersectionObserver for tests
globalThis.IntersectionObserver = class IntersectionObserver {
  root: Element | Document | null = null;
  rootMargin = '0px';
  thresholds: ReadonlyArray<number> = [];
  takeRecords = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as unknown as typeof globalThis.IntersectionObserver;

// Mock ResizeObserver for tests
globalThis.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as unknown as typeof globalThis.ResizeObserver;

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Clear localStorage after all tests
afterAll(() => {
  localStorageMock.clear.mockClear();
});
