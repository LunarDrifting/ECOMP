---
phase: UI-3-operator-ergonomics-why-approve-filter
plan: "01"
subsystem: ui
tags: [workflow-ui, operator-ergonomics, approvals, filtering]
requires: [UI-2-graph-visual-upgrade-motion-polish]
provides:
  - deterministic task filters and search
  - safe ineligible completion explanations from projection fields
  - in-drawer approve/reject actions with refetch
  - blocker id copy utility
affects: [frontend]
tech-stack:
  added: []
  patterns: [projection-only actionability, post-write refetch, deterministic UI filtering]
key-files:
  created:
    - src/components/workflow/filters.tsx
  modified:
    - src/components/workflow/workflow-command-center.tsx
    - src/components/workflow/task-row.tsx
    - src/components/workflow/task-drawer.tsx
    - src/lib/api-client.ts
    - src/components/workflow/graph-view.tsx
    - src/components/workflow/node-card.tsx
key-decisions:
  - "Ineligibility reason text follows fixed precedence using only task projection fields."
  - "Approval actions are server-authoritative; UI always refetches projection/audit after attempts."
  - "Filtering/search are applied on already-loaded task projection data only."
requirements-completed:
  - UI3-FILTERS-SEARCH
  - UI3-INELIGIBLE-WHY-EXPLANATION
  - UI3-APPROVE-REJECT-DRAWER-ACTIONS
  - UI3-BLOCKER-COPY-UTILITY
  - UI3-DISABLED-ACTION-TOOLTIPS
  - UI3-PROJECTION-ONLY-ACTIONABILITY
  - UI3-NO-BACKEND-CHANGES
  - UI3-NO-SCHEMA-CHANGES
duration: 42min
completed: 2026-03-01
---

# Phase UI-3 Plan 01 Summary

Implemented operator ergonomics improvements without backend/schema changes.

## Accomplishments

- Added deterministic filter/search controls:
  - filter pills: All / Ready / Blocked / Done
  - search by task id/name on loaded projection tasks
- Added safe "why can't I complete?" explanations based on projection fields only:
  - Already done
  - Blocked by N tasks
  - Approval required
  - Precondition gate required
  - Not eligible
- Added approval actions in task drawer:
  - Approve / Reject buttons call existing approvals endpoint
  - actions enabled only when actor is selected
  - post-action refetch of projection + audit timeline
  - graceful message handling for 403/409 failures
- Added blocker copy utility in drawer:
  - copy blocker task ids to clipboard
- Added disabled-action tooltip explanations to list and graph complete buttons.

## Verification

Automated:
- `npx eslint src/components/workflow/workflow-command-center.tsx src/components/workflow/task-row.tsx src/components/workflow/task-drawer.tsx src/components/workflow/filters.tsx src/lib/api-client.ts src/components/workflow/graph-view.tsx src/components/workflow/node-card.tsx` passed (with existing hook warning only).

Manual deterministic verification steps:
1. Load projection and switch filter pills; verify visible tasks update deterministically.
2. Type search text and verify task rows/graph nodes filter by id/name.
3. On task with disabled completion, hover button and verify explanation text matches precedence rules.
4. Open drawer and click Approve/Reject with actor selected; verify status message and refreshed projection/audit panel.
5. Open drawer for blocked task, click "Copy IDs", verify clipboard content includes blocker ids.
6. Confirm completion enablement still tracks projection `canComplete` only.

Build:
- `npm run build` remains blocked in this sandbox by Turbopack process restriction (`Operation not permitted` while processing CSS pipeline).

## Scope Guardrails Preserved

- No backend behavior changes.
- No schema/model changes.
- No client-side recomputation of server approval/gate/dependency policy semantics.
- Deterministic UI behavior based on projection data and explicit user interaction.

---
*Phase: UI-3-operator-ergonomics-why-approve-filter*
*Completed: 2026-03-01*
