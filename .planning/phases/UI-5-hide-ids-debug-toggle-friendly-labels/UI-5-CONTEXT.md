# Phase UI-5: Hide Internal IDs + Debug Toggle + Friendly Labels - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning
**Source:** User-provided phase goal and constraints

<domain>
## Phase Boundary

Improve UI friendliness for normal users by hiding internal identifiers by default, while preserving a deterministic operator/developer debug mode that reveals IDs and raw details when explicitly enabled.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- No backend changes.
- No schema changes.
- No projection/audit endpoint behavior changes.
- Deterministic UI behavior only (no timing/random logic).
- Existing workflow actions must remain intact (complete, approve/reject, graph/list, filters).

### Debug Mode Behavior
- Add header toggle (`Debug mode`) default OFF.
- Persist toggle state in `localStorage` and initialize from storage on client load.

When OFF (normal mode):
- Hide `tenantId` input.
- Hide direct `ecoId` input and rely on ECO selector/title.
- Hide task IDs in list rows, drawer, graph nodes.
- Hide templateVersionId and internal IDs/raw payload fields in audit timeline.

When ON (debug mode):
- Show tenant/eco inputs for troubleshooting.
- Show task IDs and ID copy affordances.
- Show audit IDs, raw eventType, and payload preview.

### Friendly Label Rules
Normal mode should prefer names/titles and human strings:
- Header: `ECO: <title>`.
- Task list rows: name + state + badges, no task id text.
- Drawer blockers: `Blocking Tasks (N)` and friendly task names when available.
  - If only IDs available, show count-only in normal mode.
  - Show raw IDs only in debug mode.

### Friendly Audit Rules (Normal Mode)
Map known event types to human-friendly strings, e.g.:
- `INSTANTIATE_SUCCESS` -> `Workflow instantiated`
- `TASK_COMPLETE_SUCCESS` -> `Task completed`
- `CASCADE_RESOLVE` -> `Dependencies resolved`
- `APPROVAL_CREATE_SUCCESS` -> `Approval recorded`
Display timestamp.
Do not display raw IDs in normal mode.

Debug mode keeps current low-level style available.

### ECO Selection UX
- In normal mode, ECO selector drives eco choice.
- `ecoId` free-form input remains debug-only.

### Claude's Discretion
- Exact helper placement for debug mode persistence wrapper (`debug-mode.ts` optional).
- Exact friendly-event mapping fallback text for unknown event types.

</decisions>

<specifics>
## Specific Ideas

- Introduce a small `useDebugMode` hook/helper (or component wrapper) to centralize localStorage read/write.
- Keep one rendering path with conditional ID fields rather than duplicate components.
- Add a small audit formatter helper for friendly labels with deterministic fallback.

</specifics>

<deferred>
## Deferred Ideas

- Per-user server-persisted display preferences.
- Role-based forced debug permissions.
- Rich natural-language audit narratives.

</deferred>

---
*Phase: UI-5-hide-ids-debug-toggle-friendly-labels*
*Context gathered: 2026-03-01 from user constraints*
