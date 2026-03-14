import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, String(value));
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  clear: vi.fn(() => {
    storage.clear();
  }),
  get length() {
    return storage.size;
  },
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();
