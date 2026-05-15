import { defineConfig } from 'drizzle-kit'

try {
  process.loadEnvFile?.('.env.local')
} catch {
  // .env.local may not exist; rely on shell env in that case
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://noop:noop@localhost:5432/noop',
  },
  strict: true,
  verbose: true,
})
