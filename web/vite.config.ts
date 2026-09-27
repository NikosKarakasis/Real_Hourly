import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { aiPlugin } from './server/ai.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Reads ANTHROPIC_API_KEY from web/.env (server-side only, never sent to the browser).
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), aiPlugin(env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)],
  }
})
