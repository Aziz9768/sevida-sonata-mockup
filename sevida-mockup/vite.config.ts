import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * The mockup uses the component library straight from its source folder (../sevida-ui/src),
 * so any change you make in sevida-ui shows up here immediately, with no rebuild.
 * To use the built package instead, install it ("sevida-ui": "file:../sevida-ui") and delete the two `sevida-ui` aliases.
 */
const lib = path.resolve(__dirname, '../sevida-ui');

export default defineConfig({
  // Relative asset paths, so the build works from any address (GitHub Pages serves it from /<repo-name>/). The app uses HashRouter, so there are no server routes to break.
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'sevida-ui/fonts.css', replacement: path.join(lib, 'fonts.css') },
      { find: /^sevida-ui$/, replacement: path.join(lib, 'src/index.ts') },
    ],
    // One copy of React / MUI / Emotion only, even though the library folder has its own node_modules. The export packages are resolved from this folder too, so a plain "npm install" here is enough.
    dedupe: ['react', 'react-dom', '@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled', 'write-excel-file', 'jspdf', 'jspdf-autotable'],
  },
  // Never let the browser reuse an old copy of a file while you are working.
  server: { fs: { allow: [path.resolve(__dirname, '..')] }, headers: { 'Cache-Control': 'no-store' } },
  preview: { headers: { 'Cache-Control': 'no-store' } },
});
