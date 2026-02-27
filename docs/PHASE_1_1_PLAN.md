# Phase 1.1 — Role + UserRole Models

## Task 1
Files:
- prisma/schema.prisma

Action:
Add Role and UserRole models with tenant scoping.

Verify:
- npx prisma migrate dev --name add_role_models
- npx prisma generate

Done:
Migration succeeds and Prisma client generates without error.

---

## Task 2
Files:
- prisma/schema.prisma

Action:
Add relations between User, Role, and Tenant.

Verify:
- npx prisma migrate dev
- npx prisma generate

Done:
All relations valid and migration applies successfully.