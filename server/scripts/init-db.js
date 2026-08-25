import { config } from '../config.js'
import { closeDatabase, getDatabase, initializeDatabase } from '../database/db.js'

initializeDatabase(getDatabase())
closeDatabase()

console.log(`SQLite database initialized at ${config.dbFile}`)
