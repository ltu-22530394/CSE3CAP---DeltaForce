import { defineConfig } from '@playwright/test'
import path from 'node:path'
import os from 'node:os'

const testDirectory = path.join(os.tmpdir(), 'gap-browser-' + Date.now())

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5174',
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node server/server.js',
      url: 'http://localhost:4011/api/health',
      reuseExistingServer: false,
      env: {
        API_PORT: '4011',
        APP_ORIGIN: 'http://localhost:5174',
        EMAIL_MODE: 'preview',
        NODE_ENV: 'development',
        GAPS_DB_FILE: path.join(testDirectory, 'portal.sqlite'),
        BACKUP_DIR: path.join(testDirectory, 'backups'),
        BACKUP_ENABLED: 'false',
      },
    },
    {
      command:
        'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: 'http://localhost:4011' },
    },
  ],
})
