import { execSync } from 'node:child_process'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const databaseUrlTest = process.env.DATABASE_URL_TEST

if (!databaseUrlTest) {
  throw new Error('DATABASE_URL_TEST is required for test runs')
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL !== databaseUrlTest) {
  throw new Error('Tests must not use DATABASE_URL when DATABASE_URL_TEST is set')
}

// Force application Prisma client usage onto dedicated test database.
process.env.DATABASE_URL = databaseUrlTest

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrlTest,
    },
  },
  log: ['error'],
})

export async function resetTestDatabase() {
  await testPrisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Dependency",
      "Approval",
      "Gate",
      "Task",
      "TemplateDependencyDefinition",
      "TemplateTaskDefinition",
      "ECOPlan",
      "AuditEvent",
      "TemplateVersion",
      "Template",
      "ECO",
      "UserRole",
      "Role",
      "User",
      "Tenant"
    RESTART IDENTITY CASCADE;
  `)
}

beforeAll(async () => {
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrlTest,
    },
  })

  await testPrisma.$connect()
  await resetTestDatabase()
})

beforeEach(async () => {
  await resetTestDatabase()
})

afterAll(async () => {
  await testPrisma.$disconnect()
})
