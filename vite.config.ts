import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), {
    name: 'github-pages-route-fallback',
    writeBundle(options) {
      const directory = resolve(options.dir ?? 'dist');
      copyFileSync(resolve(directory, 'index.html'), resolve(directory, '404.html'));
    },
  }],
  base: '/mp2/',
});
