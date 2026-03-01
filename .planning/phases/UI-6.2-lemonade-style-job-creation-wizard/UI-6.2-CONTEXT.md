# Phase UI-6.2: Quick Start Job (Lemonade-Style) - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning
**Source:** User-provided phase pivot and constraints

<domain>
## Phase Boundary

Deliver a low-friction, Lemonade-style Quick Start Job wizard for launching jobs from a live global template, then enable job-specific customization inside `/workflow`.

UI-6.2 is not template authoring. Full template authoring remains in `/templates`.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- No schema changes.
- Primary wizard flow is launch-only (not blueprint authoring).
- Wizard must be one question per screen, friendly, and low-friction.
- Template editing/authoring is out of scope in wizard and remains in `/templates`.
- Post-launch customization is ECO-specific runtime task editing inside `/workflow`.
- Hide technical IDs/labels by default; reveal in debug mode only.

### Quick Start Wizard Flow (Primary Happy Path)
1. Screen 1: “What are we calling this job?” (job title input)
2. Screen 2: “Pick a template” (default: `Global Template (Live)`)
3. Screen 3: “Start job”:
   - `POST /api/ecos`
   - `POST /api/ecos/{ecoId}/instantiate`
   - redirect `/workflow?tenantId=...&ecoId=...&actorId=...`

### Removed from UI-6.2 Wizard Scope
- No template task/dependency authoring.
- No validate/publish actions in wizard.
- No template version management in wizard.

### Post-Launch Workflow Customization (Inside /workflow)
After redirect to `/workflow`, show dismissible banner:
- “Want to customize tasks for this job?”
- Buttons: `Customize` / `Not now`

Customization applies to runtime tasks for current ECO only:
- Reorder tasks via drag-and-drop in list view (primary)
- Hide/remove task by setting `state = NOT_REQUIRED` (no deletion)
- Explicit Save action to persist changes

### ECO-Level Order Preference Persistence
Runtime reorder persistence must not depend on a `Task.sortOrder` field.

Add tenant-scoped endpoint:
- `POST /api/ecos/[id]/task-order`
- body: `{ tenantId, actorId, orderedTaskIds: string[] }`
- route remains thin and Prisma-free
- service writes `AuditEvent`:
  - `eventType: "TASK_ORDER_SET"`
  - payload: `{ orderedTaskIds }` (size bounded)

Workflow loading behavior:
- Read latest `TASK_ORDER_SET` from existing audit feed (or tiny dedicated read endpoint if needed)
- Apply ordering to list view only using deterministic merge:
  - `filteredSavedOrder`: keep only taskIds that currently exist for this ECO (and optionally exclude `NOT_REQUIRED`)
  - `remainingTopoOrder`: all other existing taskIds in `tasksTopologicalOrder`
  - `finalOrder = filteredSavedOrder + remainingTopoOrder`
- Keep graph view topo-driven

Rules:
- Route thin and Prisma-free.
- Service-layer enforcement.
- Tenant-scoped checks mandatory.
- Preserve state-transition guardrails.
- `NOT_REQUIRED` remains the only per-task persisted customization in this phase.
- No workflow-engine semantic changes.

### Friendly Copy Mapping
- ECO -> Job
- Task -> Task
- Instantiate -> Start job
- Global Template -> Global Template (Live)

### Template Builder Placement
Wizard must include low-emphasis link:
- “Need a brand-new template?” -> `/templates`

### Debug Mode Rules
- Default mode: no raw IDs, no backend terminology, no raw backend errors.
- Debug mode ON: show raw IDs, technical labels, raw backend error details.

### Test Requirements
- Quick Start wizard creates ECO and instantiates selected template.
- Order save creates `TASK_ORDER_SET` event and can be retrieved/applied deterministically.
- `NOT_REQUIRED` action hides task in UI while record remains persisted.
- No Playwright required.

### Claude's Discretion
- Exact drag-and-drop library/mechanics with deterministic ordering.
- Whether latest order preference read uses audit feed parsing or a tiny dedicated read endpoint.

</decisions>

<specifics>
## Specific Ideas

- Reuse existing intake/template version APIs for template selection.
- Preselect Global Template (Live) if present; otherwise deterministic first published option.
- Add workflow list-mode customization state machine (`view` vs `customize`) with explicit Save/Cancel.
- Persist ordering as ECO-level preference (`TASK_ORDER_SET`) and apply deterministically in list rendering.

</specifics>

<deferred>
## Deferred Ideas

- Full visual dependency editor in workflow customization.
- Multi-user collaborative customization.
- Template drafting from wizard.
- Background autosave.

</deferred>

---
*Phase: UI-6.2-lemonade-style-job-creation-wizard*
*Context gathered: 2026-03-01 from user constraints*
