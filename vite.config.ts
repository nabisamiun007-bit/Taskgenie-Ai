import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  // Check multiple common variable names for the API key to ensure it is picked up
  const apiKey = env.API_KEY || env.VITE_API_KEY || env.VITE_GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the browser
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});