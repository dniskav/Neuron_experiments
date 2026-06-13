import { defineConfig } from 'vite'

// Config de Vite exclusiva para Ladle.
// Sobreescribe base:'/' para que Ladle sirva desde la raíz
// (el vite.config.ts principal usa /Neuron_experiments/ para el deploy).
// NO incluir plugins aquí — Ladle añade React internamente.
export default defineConfig({
  base: '/',
  resolve: {
    dedupe: ['react', 'react-dom', '@emotion/react']
  }
})
