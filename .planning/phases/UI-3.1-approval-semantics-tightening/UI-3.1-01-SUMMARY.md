---
phase: UI-3.1-approval-semantics-tightening
plan: "01"
subsystem: services-ui
tags: [approval-semantics, deterministic-errors, integration-tests]
requires: [UI-3-operator-ergonomics-why-approve-filter]
provides:
  - duplicate approval submission guard
  - tightened approved-only policy handling for SINGLE/PARALLEL/QUORUM
  - task drawer approved/rejected count split
  - integration tests for duplicate + rejected-only semantics
affects: [backend, frontend, tests]
tech-stack:
  added: []
  patterns: [deterministic error mapping, append-only audit preservation]
key-files:
  modified:
    - src/services/approval.service.ts
    - src/services/template-instantiation.service.ts
    - src/app/api/tasks/[id]/approvals/route.ts
    - src/components/workflow/task-drawer.tsx
    - tests/integration/workflow-engine.integration.test.ts
key-decisions:
  - "Duplicate approval submission is rejected by service before insert with canonical 409 message."
  - "Duplicate rejection preserves audit attempt + rejected event semantics."
  - "SINGLE/PARALLEL/QUORUM policy checks consume APPROVED decisions only; SEQUENTIAL remains rejection-sensitive."
  - "Drawer approval summary now shows separate approved and rejected counts for operator clarity."
requirements-completed:
  - UI31-DUPLICATE-APPROVAL-BLOCK
  - UI31-POLICY-APPROVED-ONLY-SEMANTICS
  - UI31-ROUTE-409-DUPLICATE-MAPPING
  - UI31-UI-APPROVED-REJECTED-COUNTS
  - UI31-INTEGRATION-TEST-COVERAGE
  - UI31-NO-SCHEMA-CHANGES
duration: 37min
completed: 2026-03-01
---

# Phase UI-3.1 Plan 01 Summary

Implemented deterministic approval semantics tightening with no schema changes.

## Accomplishments

- Added duplicate decision guard in approval creation service:
  - rejects existing `(tenantId, taskId, actorId)` decisions
  - deterministic error message: `Approval already submitted for task`
  - emits `APPROVAL_CREATE_ATTEMPT` + `APPROVAL_CREATE_REJECTED` (`DUPLICATE_SUBMISSION`)
  - performs no approval-row write on duplicate rejection
- Added approvals route 409 mapping for duplicate error while keeping route Prisma-free.
- Clarified policy evaluator semantics in completion flow:
  - SINGLE/PARALLEL/QUORUM rely on `APPROVED` set only
  - QUORUM uses distinct approved actor IDs
  - SEQUENTIAL unchanged: any reject blocks
- Updated task drawer approval section to show:
  - total
  - approved count
  - rejected count
- Added integration tests:
  - duplicate APPROVED submission by same actor returns 409 on second attempt
  - REJECTED-only decisions do not satisfy SINGLE/PARALLEL/QUORUM and completion remains 409 policy failure

## Verification

- `npx eslint src/services/approval.service.ts src/services/template-instantiation.service.ts src/app/api/tasks/[id]/approvals/route.ts src/components/workflow/task-drawer.tsx tests/integration/workflow-engine.integration.test.ts` passed.
- `npm run test` could not complete in this environment because the test DB server is not reachable at `localhost:5432`.
- `npm run build` remains blocked in this sandbox due Turbopack process restriction (`Operation not permitted` while processing CSS pipeline).

## Scope Guardrails Preserved

- No schema/model changes.
- Route layer remains thin and Prisma-free.
- Audit logging behavior remains append-only and deterministic.

---
*Phase: UI-3.1-approval-semantics-tightening*
*Completed: 2026-03-01*
