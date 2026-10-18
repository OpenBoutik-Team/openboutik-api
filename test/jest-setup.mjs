import { jest } from '@jest/globals';

// Polyfill global jest in ESM mode for Jest 30 compatibility
if (typeof globalThis.jest === 'undefined') {
  globalThis.jest = jest;
}
