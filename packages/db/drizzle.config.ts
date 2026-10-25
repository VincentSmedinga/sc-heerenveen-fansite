import { defineConfig } from 'drizzle-kit'

// Only `pnpm db:generate` uses this: it writes a migration from the schema. Running the
// migrations doesn't need drizzle-kit (see src/migrate.ts), so the host can do it without
// development tools.
export default defineConfig({
  dialect: 'mysql',
  out: './drizzle',
  schema: './src/schema.ts',
})
