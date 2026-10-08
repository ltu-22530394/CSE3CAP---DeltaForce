import { createApp } from './app.js'
import { config } from './config.js'
import { startMaintenance } from './maintenance.js'

const app = createApp()

const server = app.listen(config.port, () => {
  console.log(
    `GAPS Authentication API running at http://localhost:${config.port}`,
  )
})
const stopMaintenance = startMaintenance()
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    stopMaintenance()
    server.close(() => process.exit(0))
  })
