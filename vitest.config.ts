import { defineConfig } from 'vitest/config';
import path from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,js}'],
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    // Univer 相关模块依赖 canvas/worker，jsdom 中无法运行，统一 mock
    server: {
      deps: {
        inline: ['@univerjs/presets', '@univerjs/preset-sheets-core', '@univerjs/ui-adapter-vue3']
      }
    }
  }
});
