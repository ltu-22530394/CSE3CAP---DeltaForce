import { initializeDatabase, closeDatabase } from '../database/db.js'
import { deliverPendingMail } from '../services/mail.js'
initializeDatabase()
try {
  console.log(JSON.stringify(await deliverPendingMail()))
} finally {
  closeDatabase()
}
