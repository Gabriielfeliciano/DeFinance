import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // O cache de módulos do Vitest não invalida quando só o templateUrl (.html) muda,
    // e os specs passam a rodar contra o template antigo.
    fsModuleCache: false,
  },
});
