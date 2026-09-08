import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/CSE3CAP---DeltaForce/' : '/',
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
