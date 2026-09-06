import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
