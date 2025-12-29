import { promises } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'esnext',
  outDir: 'dist',
  shims: true,
  async onSuccess() {
    await promises.cp(
      join('src', 'stockfish-17.1-8e4d048.cjs'),
      join('dist', 'stockfish-17.1-8e4d048.cjs')
    );
    await promises.cp(
      join('src', 'stockfish-17.1-8e4d048.wasm'),
      join('dist', 'stockfish-17.1-8e4d048.wasm')
    );
  },
});
