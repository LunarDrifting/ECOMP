# Phase UI-4: ECO Intake + Workflow Launch (End-to-End Flow) - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning
**Source:** User-provided phase goal and constraints

<domain>
## Phase Boundary

Deliver an end-to-end operator flow from ECO creation through template selection/instantiation into workflow command center auto-load, without changing workflow engine semantics or schema.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- No schema changes.
- No workflow engine semantic changes.
- Routes must remain thin and Prisma-free.
- Service layer + tenantDb wrapper usage is required.
- Deterministic behavior and explicit refetch patterns.

### Backend Endpoint Scope (Minimal)
1) `GET /api/ecos?tenantId=...`
- Returns tenant-scoped ECO list: `{ id, title, createdAt }`.

2) `POST /api/ecos`
- Body: `{ tenantId, title }`.
- Creates tenant-scoped ECO and returns `{ ecoId }`.

3) `GET /api/template-versions?tenantId=...`
- Returns published template versions for tenant, including template name:
  `{ id, templateId, templateName, version, isPublished, createdAt }`.

### UI Scope
- New `/intake` page:
  - tenantId input
  - actorId input/selector (for downstream launch)
  - ECO title input + create action
  - template version dropdown (published only)
  - instantiate action via existing `POST /api/ecos/{id}/instantiate`
  - success redirect to `/workflow?tenantId=...&ecoId=...&actorId=...`

- `/workflow` auto-load enhancement:
  - read query params on initial load
  - auto-fetch projection/audit when required params are present

- Optional UX:
  - ECO selector in workflow header via `GET /api/ecos`

### Safety
- All reads/writes tenant-scoped.
- No PII beyond existing user-facing fields.
- No audit behavior changes required.

### Test Scope
- Minimal integration extensions:
  - create ECO endpoint returns new eco id and persisted row
  - template-versions endpoint returns tenant-scoped published list
  - instantiate endpoint already covered (retain existing coverage)

### Claude's Discretion
- Whether optional workflow header ECO selector lands in this phase or deferred if time-risky.
- UI composition split between intake page and shared components.

</decisions>

<specifics>
## Specific Ideas

- Add `eco.service.ts` for list/create operations and keep `templateVersion` listing in a small template service or db helper wrapper.
- Reuse existing `api-client` patterns for request wrappers.
- Keep `/intake` interaction deterministic with explicit loading/error/success states.

</specifics>

<deferred>
## Deferred Ideas

- Multi-step wizard with saved drafts.
- Actor discovery endpoint refinements beyond current setup.
- Advanced ECO search/sorting/pagination.

</deferred>

---
*Phase: UI-4-eco-intake-workflow-launch*
*Context gathered: 2026-03-01 from user constraints*
