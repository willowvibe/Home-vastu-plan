import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

// Mock localStorage for tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
globalThis.localStorage = localStorageMock;

// Mock FileReader for tests
const fileReaderMock = {
  readAsText: vi.fn(),
  onload: null as any,
  onerror: null as any,
};
globalThis.FileReader = class FileReader {
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
};

// Mock IntersectionObserver for tests
globalThis.IntersectionObserver = class IntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock ResizeObserver for tests
globalThis.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Clear localStorage after all tests
afterAll(() => {
  localStorageMock.clear.mockClear();
});
