import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Carrega `.env.test` (e `.env`) sem sobrescrever variáveis já definidas no
// shell, para que `npm run test:e2e` funcione sem exportar nada na mão.
const fileEnv = loadEnv('test', process.cwd(), '');
const env = Object.fromEntries(
  Object.entries(fileEnv).filter(([key]) => process.env[key] === undefined),
);

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env,
    // As suítes compartilham o mesmo banco de testes e o recriam no setup,
    // então precisam rodar em sequência.
    fileParallelism: false,
  },
});
