---
phase: UI-5-hide-ids-debug-toggle-friendly-labels
plan: "01"
subsystem: ui
tags: [debug-mode, friendly-labels, id-hiding]
requires: [UI-4-eco-intake-workflow-launch]
provides:
  - persisted debug mode toggle
  - default internal-id hiding in normal mode
  - friendly audit labels/messages in normal mode
  - debug-mode raw visibility restoration
affects: [frontend]
tech-stack:
  added: []
  patterns: [localStorage UI preference, conditional debug rendering]
key-files:
  created:
    - src/components/workflow/debug-mode.ts
  modified:
    - src/components/workflow/workflow-command-center.tsx
    - src/components/workflow/task-row.tsx
    - src/components/workflow/task-drawer.tsx
    - src/components/workflow/node-card.tsx
    - src/components/workflow/graph-view.tsx
    - src/components/workflow/audit-timeline.tsx
key-decisions:
  - "Debug mode is a client-only display preference persisted in localStorage."
  - "Normal mode hides raw IDs and shows friendly labels/messages without backend changes."
  - "Debug mode reveals troubleshooting details including IDs and audit payload summaries."
requirements-completed:
  - UI5-DEBUG-TOGGLE-PERSISTED
  - UI5-HIDE-IDS-NORMAL-MODE
  - UI5-REVEAL-IDS-DEBUG-MODE
  - UI5-FRIENDLY-LABELS
  - UI5-FRIENDLY-AUDIT-MESSAGES
  - UI5-ECO-SELECTOR-NORMAL-MODE
  - UI5-NO-BACKEND-CHANGES
  - UI5-NO-SCHEMA-CHANGES
duration: 36min
completed: 2026-03-01
---

# Phase UI-5 Plan 01 Summary

Implemented user-friendly ID hiding by default with an operator debug toggle, without backend/schema changes.

## Accomplishments

- Added persistent debug mode helper (`localStorage`):
  - default OFF
  - restores on reload
- Updated workflow header UX:
  - debug toggle in top-right
  - normal mode shows friendly ECO title
  - normal mode hides tenant/eco raw id inputs
  - debug mode reveals raw troubleshooting inputs
- Updated task views:
  - list rows hide task ids in normal mode
  - drawer hides raw task id/blocker ids in normal mode and shows friendly blocker names/counts
  - graph nodes hide task ids in normal mode
  - debug mode restores raw id visibility and copy affordances
- Updated audit timeline rendering:
  - normal mode: friendly event message + timestamp only
  - debug mode: raw eventType + event id + payload summary

## Verification

- `npx eslint src/components/workflow/workflow-command-center.tsx src/components/workflow/task-row.tsx src/components/workflow/task-drawer.tsx src/components/workflow/node-card.tsx src/components/workflow/audit-timeline.tsx src/components/workflow/graph-view.tsx src/components/workflow/debug-mode.ts` passed with one existing warning in command center (`react-hooks/exhaustive-deps`).
- `npm run build` remains blocked in this sandbox by Turbopack process restrictions (`Operation not permitted` while processing CSS pipeline).

## Manual mode-toggle checks

1. Debug OFF:
- tenantId/ecoId raw inputs hidden
- task ids hidden in list/drawer/graph
- audit shows friendly event text without raw id fields
- complete/approve/reject/filter/list/graph actions still function

2. Debug ON:
- tenantId/ecoId troubleshooting inputs visible
- task ids visible again in list/drawer/graph
- copy blocker IDs button visible
- audit shows raw eventType/id/payload summary

## Scope Guardrails Preserved

- No backend behavior changes.
- No schema/model changes.
- No endpoint contract changes.

---
*Phase: UI-5-hide-ids-debug-toggle-friendly-labels*
*Completed: 2026-03-01*
