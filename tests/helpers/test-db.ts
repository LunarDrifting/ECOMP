import { afterAll, beforeAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const databaseUrlTest = process.env.DATABASE_URL_TEST

if (!databaseUrlTest) {
  throw new Error('DATABASE_URL_TEST is required for test runs')
}

// Force application Prisma client usage onto dedicated test database.
process.env.DATABASE_URL = databaseUrlTest

function getRedactedDbTarget(urlValue: string) {
  const parsed = new URL(urlValue)
  const dbName = parsed.pathname.replace(/^\//, '')
  return {
    dbName,
    redactedUrl: `${parsed.protocol}//${parsed.username}:***@${parsed.host}/${dbName}`,
  }
}

function assertSafeTestDatabaseUrl(urlValue: string) {
  const { dbName, redactedUrl } = getRedactedDbTarget(urlValue)

  console.log(`[test-db] Using DATABASE_URL_TEST: ${redactedUrl}`)

  if (!dbName) {
    throw new Error('DATABASE_URL_TEST must include a database name')
  }

  if (dbName === 'ecomp_db') {
    throw new Error(
      'DATABASE_URL_TEST points to primary database (ecomp_db); refusing to run tests'
    )
  }
}

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrlTest,
    },
  },
  log: ['error'],
})

type PublicTableRow = {
  tablename: string
}

export async function resetTestDatabase() {
  const tables = await testPrisma.$queryRaw<PublicTableRow[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `

  if (tables.length === 0) {
    return
  }

  const qualifiedTables = tables
    .map(({ tablename }) => `"public"."${tablename.replace(/"/g, '""')}"`)
    .join(', ')

  await testPrisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${qualifiedTables} RESTART IDENTITY CASCADE;`
  )
}

beforeAll(async () => {
  assertSafeTestDatabaseUrl(databaseUrlTest)

  await testPrisma.$connect()
  await resetTestDatabase()
})

beforeEach(async () => {
  await resetTestDatabase()
})

afterAll(async () => {
  await testPrisma.$disconnect()
})
