import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Library build. React, MUI and Emotion are NOT bundled: the app that uses this library
// (Sevida Lite, the Leap Metrics app) supplies them, so there is only ever one copy of each.
const external = [/^react($|\/)/, /^react-dom($|\/)/, /^@mui\//, /^@emotion\//];

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'sevida-ui.js', cssFileName: 'sevida-ui' },
    rollupOptions: { external },
    sourcemap: true,
  },
});
