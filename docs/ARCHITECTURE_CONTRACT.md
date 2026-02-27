# ECOMP Architecture Contract (A-lite)

## Stack (Locked)
- Next.js (App Router)
- TypeScript
- Prisma v6
- PostgreSQL (Docker)
- Monolithic repo
- No microservices

---

## Tenant Isolation (Mandatory)
- Every domain model must include tenantId.
- All queries must filter by tenantId.
- No cross-tenant joins without explicit filtering.
- Authorization is always enforced at API layer.

---

## State Machine Model
TaskState enum:
- NOT_STARTED
- IN_PROGRESS
- BLOCKED
- PENDING_APPROVAL
- DONE

Illegal state transitions are forbidden.

---

## Template Versioning
- Templates are immutable once published.
- Editing a template creates a new version.
- ECO instances bind permanently to a template version.
- Plan changes must create an auditable diff event.

---

## Approval Semantics
- Approval decisions are immutable.
- Rejection must capture reason.
- Re-approval required if required documents change.
- Approval events are append-only.

---

## Projection Rules
- Customer projection is computed, never manually set.
- Projection DONE only if all mapped internal tasks DONE.
- Projection WAITING if any mapped task WAITING on customer.
- Internal SLA data is never exposed in projection.

---

## Migration Discipline
- All schema changes require a Prisma migration.
- No direct DB edits.
- No destructive drops without explicit milestone review.

---

## Commit Discipline
- One task = one commit.
- No multi-feature commits.
- No direct commits to main branch.

---

## Testing Discipline
- Every phase must include a verify command.
- Build must pass.
- Lint must pass.
- DB migration must succeed.