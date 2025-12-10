import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the app to access process.env.API_KEY if strictly needed, 
    // though import.meta.env.VITE_API_KEY is preferred in Vite.
    'process.env': {}
  }
});