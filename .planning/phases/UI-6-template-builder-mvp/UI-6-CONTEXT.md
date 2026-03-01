# Phase UI-6: Template Builder MVP (Draft -> Validate -> Publish) - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning
**Source:** User-provided phase goal and constraints

<domain>
## Phase Boundary

Deliver a minimal but real Template Builder UI and API surface so operators can create templates, manage draft/published versions, edit blueprint task/dependency definitions, validate graph integrity server-side, publish validated versions, and launch ECO workflow instantiation without dev seed routes.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- No schema changes.
- No workflow engine semantic changes.
- Routes must remain thin and Prisma-free.
- Service layer + tenantDb wrapper only for data access/business enforcement.
- Deterministic behavior throughout API and UI.
- Integrate with existing instantiation and projection flow.

### Required Backend Surface
- Templates:
  - `GET /api/templates?tenantId=...`
  - `POST /api/templates`
- Template versions:
  - `GET /api/templates/[id]/versions?tenantId=...`
  - `POST /api/templates/[id]/versions`
  - `POST /api/template-versions/[id]/publish`
  - `POST /api/template-versions/[id]/validate`
- Template task definitions:
  - `GET /api/template-versions/[id]/tasks?tenantId=...`
  - `POST /api/template-versions/[id]/tasks`
  - `PATCH /api/template-tasks/[id]`
  - `DELETE /api/template-tasks/[id]`
- Template dependency definitions:
  - `GET /api/template-versions/[id]/dependencies?tenantId=...`
  - `POST /api/template-versions/[id]/dependencies`
  - `DELETE /api/template-dependencies/[id]`
- Roles:
  - `GET /api/roles?tenantId=...`

### Service Enforcement Rules
- All endpoints tenant-scoped.
- Validation endpoint must reject:
  - self-edge blueprint dependencies
  - cycles
  - dependency endpoints not in selected templateVersionId
- Publish must require successful validation.
- Publish idempotent behavior: already published returns deterministic ok/noop.
- UI-side self-edge prevention is required but does not replace server validation.

### UI Scope
- `/templates`: template list per tenant.
- `/templates/[templateId]`: version manager (draft/published, create draft).
- `/templates/[templateId]/versions/[templateVersionId]`: task+dependency editor + validate/publish.
- Launch shortcut from version page: create ECO + instantiate + redirect to `/workflow`.

### Testing Scope
- Minimal integration coverage:
  - validation rejects cycle
  - publish blocked when validation fails
  - publish succeeds when validation passes
  - tasks/dependencies list endpoints are tenant-scoped

### Claude's Discretion
- Component breakdown within `src/components/templates/*`.
- Exact draft version label strategy (`versionLabel` handling).
- Exact error payload detail shape beyond required `ok/errors` contract.

</decisions>

<specifics>
## Specific Ideas

- Add a dedicated `template-builder.service.ts` to centralize validate/publish/editor operations and keep routes thin.
- Reuse existing cycle detection patterns from instantiation graph validation for consistency.
- Keep editor UX table-based for MVP: deterministic lists/forms over complex drag-and-drop.
- Reuse existing intake/instantiate flow by adding a launch action that orchestrates create ECO -> instantiate -> redirect.

</specifics>

<deferred>
## Deferred Ideas

- Advanced graph editing UI/visual DAG builder.
- Version diffing and clone-from-version flows.
- Audit event requirements for template-builder operations.
- Rich policy-aware authoring assistance.

</deferred>

---
*Phase: UI-6-template-builder-mvp*
*Context gathered: 2026-03-01 from user constraints*
