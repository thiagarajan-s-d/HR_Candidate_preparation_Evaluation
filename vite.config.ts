import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 8080,
    strictPort: true, // Exit if port is already in use
  },
  preview: {
    host: '0.0.0.0', // Allow external connections for production preview
    port: 8080,
    strictPort: true,
  },
});
