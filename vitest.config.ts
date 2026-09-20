import { defineConfig } from 'vitest/config';
export default defineConfig({
	test: { environment: 'edge-runtime', include: ['convex-tests/**/*.test.ts'] }
});
