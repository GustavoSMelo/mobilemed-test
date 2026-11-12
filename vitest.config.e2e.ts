import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // As suítes compartilham o mesmo banco de testes e o recriam no setup,
    // então precisam rodar em sequência.
    fileParallelism: false,
  },
});
