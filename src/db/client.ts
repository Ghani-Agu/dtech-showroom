import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>
}

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://noop:noop@localhost:5432/noop'

const client = globalForDb.client ?? postgres(connectionString, { max: 1 })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client
}

export const db = drizzle(client, { schema })
