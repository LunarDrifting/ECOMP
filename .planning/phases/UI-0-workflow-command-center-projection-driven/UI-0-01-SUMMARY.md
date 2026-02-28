---
phase: UI-0-workflow-command-center-projection-driven
plan: "01"
subsystem: ui
tags: [workflow-ui, command-center, projection-driven, audit-timeline]
requires: []
provides:
  - projection-driven workflow command center page
  - read-only tenant-scoped audit timeline endpoint
  - shared UI API client wrappers for projection/write/read flows
affects: [frontend, read-api]
tech-stack:
  added: []
  patterns: [server-refetch after writes, projection-as-truth, read-only audit feed]
key-files:
  created:
    - src/app/api/ecos/[id]/audit/route.ts
    - src/services/audit.service.ts
    - src/lib/api-client.ts
    - src/app/workflow/page.tsx
    - src/components/workflow/workflow-command-center.tsx
  modified:
    - src/services/workflow-projection.service.ts
    - tests/integration/workflow-engine.integration.test.ts
key-decisions:
  - "UI actionability strictly uses projection fields (`canComplete`, `tasksTopologicalOrder`, counts) with no client-side eligibility recomputation."
  - "Complete action always refetches projection and audit feed after request completion."
  - "Audit endpoint is read-only and returns only safe event summary data (type/time/safe payload keys)."
patterns-established:
  - "Command center layout: header metrics + ordered task list + task detail drawer + audit timeline panel."
  - "Shared API client wrappers for projection, completion, approval, and audit timeline."
requirements-completed:
  - UI0-PROJECTION-SOURCE-OF-TRUTH
  - UI0-COMMAND-CENTER-LIST-VIEW
  - UI0-COMPLETE-ACTION-REFETCH
  - UI0-AUDIT-TIMELINE-ENDPOINT
  - UI0-NO-CLIENT-RECOMPUTATION
  - UI0-DETERMINISTIC-INTERACTIONS
  - UI0-NO-BACKEND-BEHAVIOR-DRIFT
  - UI0-NO-SCHEMA-CHANGES
duration: 52min
completed: 2026-02-28
---

# Phase UI-0 Plan 01 Summary

**Implemented a projection-driven workflow command center UI and read-only audit timeline endpoint without changing backend business behavior.**

## Accomplishments

- Added read-only audit API:
  - `GET /api/ecos/{id}/audit?tenantId=...`
  - tenant-scoped via service + wrapper
  - sanitized payload output for UI timeline
- Added UI API client wrapper module:
  - projection fetch
  - complete action
  - approval action
  - audit timeline fetch
- Added command center UI:
  - header with ECO id, progress, and count badges
  - actor selector + manual load inputs
  - tasks rendered in `tasksTopologicalOrder`
  - per-row state, dependency counts, blockers, badges, complete action gating via `canComplete`
  - right-side task drawer and audit timeline panel
  - deterministic message feedback and refetch-on-write behavior
- Extended integration test coverage for audit endpoint:
  - verifies endpoint returns event timeline and avoids basic PII keys in payload output

## Task Commits

1. **Task 1: audit feed endpoint + api client** - `19fcfbf` (feat)
2. **Task 2: command center UI** - `3ad566e` (feat)
3. **Task 3: audit endpoint verification test** - `6a5dfeb` (test)

## Verification Evidence

- Lint passed for newly added/modified UI and route/service files.
- Build command in this sandbox remains blocked by Turbopack process restrictions (`Operation not permitted` while processing CSS), so full runtime build verification must be run outside sandbox.
- No schema files were modified.

## Scope Guardrails Preserved

- Backend write-side business logic unchanged.
- UI uses projection endpoint as source of truth.
- No client-side recomputation of dependency/approval/gate eligibility.
- No background workers.
- No schema changes.

---
*Phase: UI-0-workflow-command-center-projection-driven*
*Completed: 2026-02-28*
