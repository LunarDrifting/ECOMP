# Phase UI-3: Operator Ergonomics (Why/Approve/Filter) - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning
**Source:** User-provided phase goal and constraints

<domain>
## Phase Boundary

Improve workflow operator usability in the existing command center through deterministic UI ergonomics and action affordances, without backend or schema behavior changes.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- No schema changes.
- Prefer no backend changes; consume existing projection + audit + approvals endpoints.
- UI must remain projection-driven.
- UI must not recompute completion eligibility logic.
- `canComplete` remains canonical source for completion actionability.
- “Why can’t I complete?” messaging must use only safe projection fields and simple precedence logic.
- Deterministic UI behavior only (no timing/random-driven behavior).
- Build must pass.
- Execution remains sequential.

### Filter & Search Scope
- Add UI-only filter controls over already-loaded projection tasks:
  - All / Ready / Blocked / Done
- Add optional search input filtering by task name/id.
- No additional server querying for filtering/search.

### Ineligibility Explanation Scope
When actor is present and `canComplete === false`, explanation text is derived from projection fields only in deterministic order:
1. `state === DONE` -> "Already done"
2. `state === BLOCKED` or `blockingTaskIds.length > 0` -> "Blocked by N tasks"
3. `requiresApproval === true` -> "Approval required"
4. `requiresPrecondition === true` -> "Precondition gate required"
5. fallback -> "Not eligible"

No attempt to infer or reproduce server-side approval/gate/dependency policy internals.

### Approval Actions Scope
- Task drawer includes Approve / Reject actions.
- Use existing endpoint: `POST /api/tasks/{taskId}/approvals`.
- Buttons enabled only when `actorId` is set.
- After approval attempt, refetch projection + audit timeline.
- Handle 403/409 deterministically in current UI message/toast mechanism.
- UI does not assume approval will make task completable.

### Blocker Inspection Scope
- Keep blockingTaskIds list in drawer.
- Add "copy IDs" utility for quick operator workflow.

### Visual Polish Scope
- Filter pills styled consistently with count badges.
- Disabled actions include clear hover explanation tooltip.

### Claude's Discretion
- Exact component split (`filters.tsx` extraction vs inline).
- Tooltip rendering method (title attribute or lightweight custom tooltip) as long as deterministic.

</decisions>

<specifics>
## Specific Ideas

- Introduce memoized filtered task list in command center using selected filter + search query.
- Centralize `getIneligibleReason(task)` helper in UI layer using allowed projection fields only.
- Reuse existing `createApproval(...)` API wrapper, extending only if optional comment support is needed.

</specifics>

<deferred>
## Deferred Ideas

- Server-driven search.
- Advanced explanation traces from backend decision internals.
- Bulk approval operations.
- Saved per-user UI filter preferences.

</deferred>

---
*Phase: UI-3-operator-ergonomics-why-approve-filter*
*Context gathered: 2026-03-01 from user constraints*
