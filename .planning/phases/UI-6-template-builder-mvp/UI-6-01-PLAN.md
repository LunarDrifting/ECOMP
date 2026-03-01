---
phase: UI-6-template-builder-mvp
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/db.ts
  - src/services/template-builder.service.ts
  - src/app/api/templates/route.ts
  - src/app/api/templates/[id]/versions/route.ts
  - src/app/api/template-versions/[id]/publish/route.ts
  - src/app/api/template-versions/[id]/validate/route.ts
  - src/app/api/template-versions/[id]/tasks/route.ts
  - src/app/api/template-versions/[id]/dependencies/route.ts
  - src/app/api/template-tasks/[id]/route.ts
  - src/app/api/template-dependencies/[id]/route.ts
  - src/app/api/roles/route.ts
  - src/app/templates/page.tsx
  - src/app/templates/[templateId]/page.tsx
  - src/app/templates/[templateId]/versions/[templateVersionId]/page.tsx
  - src/components/templates/*
  - src/lib/api-client.ts
  - tests/integration/workflow-engine.integration.test.ts
autonomous: true
requirements:
  - UI6-NO-SCHEMA-CHANGES
  - UI6-THIN-PRISMA-FREE-ROUTES
  - UI6-TENANT-SCOPED-ENDPOINTS
  - UI6-DRAFT-VALIDATE-PUBLISH-FLOW
  - UI6-TEMPLATE-TASK-EDITOR
  - UI6-TEMPLATE-DEPENDENCY-EDITOR
  - UI6-SERVER-SIDE-GRAPH-VALIDATION
  - UI6-PUBLISH-IDEMPOTENT
  - UI6-LAUNCH-FROM-TEMPLATE
  - UI6-MINIMAL-INTEGRATION-TESTS
user_setup: []
must_haves:
  truths:
    - "No schema/model files are modified."
    - "Workflow engine semantics are unchanged."
    - "All new routes are thin and do not use Prisma directly."
    - "All reads/writes use service layer + tenantDb wrapper with strict tenant scoping."
    - "Validation endpoint returns deterministic report: { ok, errors[] }."
    - "Validation rejects self-edges, cycles, and dependency endpoints outside the selected templateVersion."
    - "Publish is blocked when validation fails."
    - "Publish is idempotent when version is already published."
    - "Template editor supports create/update/delete for task definitions."
    - "Dependency editor supports create/delete and UI-side self-edge prevention."
    - "Launch-from-template path creates ECO, instantiates selected version, then redirects to workflow."
    - "Published versions become available to intake flow via existing template version listing behavior."
    - "Execution remains sequential."
  artifacts:
    - "New template builder service with validate/publish/create/update/delete orchestration."
    - "Tenant-scoped db helpers for template/version/task/dependency operations."
    - "Templates UI pages/components for list, versions, and editor."
    - "Integration tests for validate/publish and tenant-scoped list endpoints."
  key_links:
    - "Graph validation logic is server-enforced before publish."
    - "UI may prevent obvious invalid input (self-edge) but backend remains source of truth."
    - "Launch shortcut reuses existing instantiate and workflow projection flow."
---

<objective>
Deliver Template Builder MVP enabling operators to author blueprint data without dev seed routes.

Purpose:
Provide a deterministic draft -> validate -> publish -> launch workflow that plugs into existing engine flows.

Output:
Tenant-scoped template builder APIs, UI pages, validation/publish controls, and minimal integration tests.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@docs/ARCHITECTURE_CONTRACT.md
@src/lib/db.ts
@src/lib/api-client.ts
@src/services
@src/app/api
@src/app/templates
@tests/integration/workflow-engine.integration.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add tenant-scoped template builder db/service layer</name>
  <files>src/lib/db.ts, src/services/template-builder.service.ts</files>
  <action>
Add tenantDb-backed helpers and service methods for:
- templates list/create
- template versions list/create draft
- task definition list/create/update/delete
- dependency definition list/create/delete
- roles list for dropdowns
- blueprint validation report generation
- publish action with pre-publish validation gate and idempotent noop behavior
Keep all operations tenant-scoped and deterministic.
  </action>
  <verify>
    <automated>npx eslint src/lib/db.ts src/services/template-builder.service.ts</automated>
  </verify>
  <done>Service layer encapsulates all template builder behavior with tenant isolation and no schema changes.</done>
</task>

<task type="auto">
  <name>Task 2: Add thin tenant-scoped API routes</name>
  <files>src/app/api/templates/route.ts, src/app/api/templates/[id]/versions/route.ts, src/app/api/template-versions/[id]/publish/route.ts, src/app/api/template-versions/[id]/validate/route.ts, src/app/api/template-versions/[id]/tasks/route.ts, src/app/api/template-versions/[id]/dependencies/route.ts, src/app/api/template-tasks/[id]/route.ts, src/app/api/template-dependencies/[id]/route.ts, src/app/api/roles/route.ts</files>
  <action>
Implement new endpoint surface exactly as specified.
Keep routes thin:
- parse/validate inputs
- call service methods only
- map deterministic validation failures to stable HTTP responses
Ensure no direct Prisma usage in route files.
  </action>
  <verify>
    <automated>npx eslint src/app/api/templates/route.ts src/app/api/templates/[id]/versions/route.ts src/app/api/template-versions/[id]/publish/route.ts src/app/api/template-versions/[id]/validate/route.ts src/app/api/template-versions/[id]/tasks/route.ts src/app/api/template-versions/[id]/dependencies/route.ts src/app/api/template-tasks/[id]/route.ts src/app/api/template-dependencies/[id]/route.ts src/app/api/roles/route.ts</automated>
  </verify>
  <done>API layer exposes full Template Builder MVP contracts with service-only orchestration.</done>
</task>

<task type="auto">
  <name>Task 3: Build Template Builder MVP UI pages and editor components</name>
  <files>src/app/templates/page.tsx, src/app/templates/[templateId]/page.tsx, src/app/templates/[templateId]/versions/[templateVersionId]/page.tsx, src/components/templates/*, src/lib/api-client.ts</files>
  <action>
Create deterministic MVP UI:
- template list page (tenant-scoped)
- version manager (draft/published list, create draft)
- version editor with tasks and dependencies CRUD
- validate button with server validation report rendering
- publish button enabled only when validation OK
- launch shortcut (create ECO -> instantiate -> redirect /workflow)
Prevent self-edge selection in dependency form at UI level while relying on server validation as source of truth.
  </action>
  <verify>
    <automated>npx eslint src/app/templates/page.tsx src/app/templates/[templateId]/page.tsx src/app/templates/[templateId]/versions/[templateVersionId]/page.tsx src/components/templates src/lib/api-client.ts</automated>
  </verify>
  <done>Operators can author and publish blueprint versions from UI without dev seed routes.</done>
</task>

<task type="auto">
  <name>Task 4: Add minimal integration tests for validation/publish/tenant scoping</name>
  <files>tests/integration/workflow-engine.integration.test.ts</files>
  <action>
Add deterministic integration coverage for:
1) validation rejects cycle
2) publish blocked when validation fails
3) publish succeeds when validation is OK
4) task/dependency list endpoints enforce tenant scoping
Ensure no timing-based assertions and no schema changes.
  </action>
  <verify>
    <automated>npm run test</automated>
  </verify>
  <done>Core Template Builder guarantees are covered by deterministic integration tests.</done>
</task>

<task type="auto">
  <name>Task 5: End-to-end verification and phase summary</name>
  <files>src/app/templates, src/app/intake/page.tsx, .planning/phases/UI-6-template-builder-mvp/UI-6-01-SUMMARY.md</files>
  <action>
Verify manually:
- create template and draft version
- add task/dependency definitions
- validation catches cycle and self-edge
- publish only when validation succeeds
- published version appears in intake dropdown
- launch from template redirects to workflow with projection load
Capture outcomes and any constraints in summary file.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>UI-6 acceptance flow is confirmed and documented.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] No schema changes
- [ ] No workflow engine semantics changes
- [ ] New routes are thin and Prisma-free
- [ ] All endpoints are tenant-scoped
- [ ] Template list/create works
- [ ] Version list/create draft works
- [ ] Task definition CRUD works
- [ ] Dependency definition create/delete works
- [ ] UI prevents self-edge selection
- [ ] Server validation rejects self-edge
- [ ] Server validation rejects cycles
- [ ] Server validation rejects invalid dependency endpoints
- [ ] Publish blocked when validation fails
- [ ] Publish idempotent noop when already published
- [ ] Launch shortcut creates ECO + instantiates + redirects to workflow
- [ ] Published version visible in intake flow
- [ ] Integration tests for validate/publish/tenant scoping pass
- [ ] `npm run build` passes
</verification>

<success_criteria>
- Operators can manage real templates and versions from UI without dev seed routes
- Publish is deterministic and validation-gated
- Existing engine semantics and backend architecture constraints remain intact
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory with manual verification notes for validate/publish/launch flow.
</output>
