# Phase UI-0: Workflow Command Center (Projection-Driven) - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning
**Source:** User-provided phase goal and constraints

<domain>
## Phase Boundary

Build a projection-driven workflow command center UI that renders ECO workflow state and task actionability directly from backend read models, with zero client-side recomputation of workflow engine logic.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- Do not change backend write-side behavior.
- UI source of truth is projection endpoint only.
- UI must not recompute dependency/approval/gate logic.
- After any write action, refetch projection.
- Keep deterministic and testable behavior.
- No Figma work in this phase.
- No schema changes.
- No background workers.
- Execution remains sequential.

### Backend Endpoints Used
- `GET /api/ecos/{ecoId}/projection?tenantId=...&actorId=...`
- `POST /api/tasks/{taskId}/complete`
- `POST /api/tasks/{taskId}/approvals` (optional action path)
- New in this phase (read-only):
  - `GET /api/ecos/{ecoId}/audit?tenantId=...`

### UI Requirements
1. Header:
   - ECO title/id
   - progress bar (`doneTasks / totalTasks`)
   - count badges (`total`, `done`, `blocked`, `ready`)
   - actor selector
2. Main list view:
   - render tasks in `tasksTopologicalOrder`
   - row data: state, name, upstream/downstream counts, blocking count tooltip, approval/precondition badges, canComplete indicator
   - row click opens right-side drawer with task metadata + blocking IDs + approval summary + gate summary
3. Actions:
   - show complete button only when `canComplete === true`
   - complete action calls backend and refetches projection
   - show deterministic toast/inline error for 409/403
   - add subtle row transition animation after refresh
4. Audit timeline:
   - read-only panel listing recent events (`eventType`, time, ids/counts)
   - no PII
5. Aesthetics:
   - Tailwind + shadcn/ui components
   - Framer Motion for subtle fade/slide interactions
   - command-center style visual hierarchy

### Read-Only Audit Endpoint Constraints
- Must be read-only and batched.
- Must enforce tenant isolation.
- Must not include PII.
- Must not require schema changes.

### Claude's Discretion
- Exact route segment choice for page location (`/workflow` or equivalent) as long as accessible and scoped.
- Specific component splitting and naming under `src/components/workflow`.
- Minimal UI primitive install strategy (shadcn CLI vs local reusable primitives), preserving project determinism.

</decisions>

<specifics>
## Specific Ideas

- Add a single API client module for projection/complete/audit calls.
- Keep UI state machine simple:
  - load projection + audit
  - optimistic busy state for actions
  - always server-refetch for final state
- Derive all task row actionability strictly from projection fields (`canComplete`, `blockingTaskIds`, badges).
- Build audit endpoint with bounded query (latest N events) and safe payload projection.

</specifics>

<deferred>
## Deferred Ideas

- Graph canvas mode.
- Advanced filtering/search.
- Role directory-backed actor selector.
- Pixel-level design-system theming and Figma handoff.

</deferred>

---
