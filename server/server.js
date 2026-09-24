import { createApp } from './app.js'
import { config } from './config.js'
import { createMailTransport, deliverPendingMail } from './services/mail.js'

const app = createApp()
// Mail delivery is opt-in so local development never contacts real recipients accidentally.
const transport =
  process.env.MAIL_WORKER_ENABLED === 'true' ? createMailTransport() : null
let working = false
async function deliver() {
  if (!transport || working) return
  working = true
  try {
    await deliverPendingMail(transport)
  } catch {
    console.error('Mail worker failed; check database and mail configuration.')
  } finally {
    working = false
  }
}
const server = app.listen(config.port, () => {
  console.log(`GAPS API running at http://localhost:${config.port}`)
  void deliver()
})
const timer = transport ? setInterval(deliver, 30000) : null
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    if (timer) clearInterval(timer)
    server.close()
  })
