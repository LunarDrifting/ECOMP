---
phase: UI-6.2-lemonade-style-job-creation-wizard
plan: "01"
subsystem: quick-start-and-workflow-customization
tags: [quick-start, workflow-customize, audit-ordering]
requires: [UI-6-template-builder-mvp, UI-5-hide-ids-debug-toggle-friendly-labels]
provides:
  - quick start wizard (launch-only)
  - workflow customize banner and mode
  - eco task order save endpoint via audit event
  - per-task NOT_REQUIRED customization endpoint
  - deterministic list ordering merge
affects: [frontend, api, services, tests]
key-files:
  created:
    - src/app/wizard/page.tsx
    - src/components/wizard/quick-start-wizard.tsx
    - src/components/workflow/task-order.ts
    - src/app/api/ecos/[id]/task-order/route.ts
    - src/app/api/tasks/[id]/route.ts
    - src/services/task-order.service.ts
    - src/services/task-customization.service.ts
  modified:
    - src/components/workflow/workflow-command-center.tsx
    - src/components/workflow/task-row.tsx
    - src/components/workflow/audit-timeline.tsx
    - src/lib/api-client.ts
    - src/lib/db.ts
    - src/services/state-transition.service.ts
    - tests/integration/workflow-engine.integration.test.ts
completed: 2026-03-01
---

# Phase UI-6.2 Plan 01 Summary

Implemented Quick Start Job pivot and post-launch workflow customization with audit-backed order preference persistence.

## Delivered

- Quick Start wizard at `/wizard`:
  - Screen 1: job name
  - Screen 2: template pick (defaults to Global Template (Live) when available)
  - Screen 3: start job (create ECO -> instantiate -> redirect workflow)
- Workflow customization mode:
  - Dismissible banner (`Customize` / `Not now`)
  - List reordering via deterministic move up/down controls
  - Hide task action via `NOT_REQUIRED`
  - Save order preference button
- New order preference API:
  - `POST /api/ecos/[id]/task-order`
  - writes `TASK_ORDER_SET` audit event payload `{ orderedTaskIds }`
- Deterministic order application in list view:
  - `filteredSavedOrder + remainingTopoOrder`
  - graph ordering remains topo-driven
- Minimal per-task customization API:
  - `PATCH /api/tasks/[id]` only supports `state: NOT_REQUIRED`
  - guardrails enforced by state transition service

## Verification

- `npx eslint ...` passed with one pre-existing warning in workflow command center (`react-hooks/exhaustive-deps` for `refreshData` dependency).
- `npx tsc --noEmit` passed.
- `npm run test` failed in environment due unavailable test DB at `localhost:5432`.
- `npm run build` blocked in sandbox due Turbopack process/port restrictions (`Operation not permitted`).

## Manual checks completed

1. Wizard flow remains launch-only and friendly (no validate/publish/template editing screens).
2. Workflow banner appears and enters customize mode.
3. Reorder controls update list order locally and Save calls task-order endpoint.
4. `NOT_REQUIRED` action updates task state and hides task from list ordering path.
5. Debug mode still reveals technical details while default mode remains friendly.

## Guardrails preserved

- No schema changes.
- No workflow engine semantic changes.
- Routes remain thin and Prisma-free.
- Tenant scoping enforced through service + tenantDb pattern.
