import { defineConfig } from 'vitest/config';

// Unit tests for the pure logic (env time-system, scoring, stores, utils, hooks).
// jsdom gives the store/hook tests matchMedia + localStorage. Tests import their
// helpers from 'vitest' explicitly, so no global types are needed in tsconfig.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
