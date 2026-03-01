---
phase: UI-4-eco-intake-workflow-launch
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/intake/page.tsx
  - src/lib/api-client.ts
  - src/app/api/ecos/route.ts
  - src/app/api/template-versions/route.ts
  - src/services/eco.service.ts
  - src/services/template.service.ts
  - src/lib/db.ts
  - src/components/workflow/workflow-command-center.tsx
  - src/app/workflow/page.tsx
  - tests/integration/workflow-engine.integration.test.ts
autonomous: true
requirements:
  - UI4-ECO-LIST-ENDPOINT
  - UI4-ECO-CREATE-ENDPOINT
  - UI4-TEMPLATE-VERSIONS-ENDPOINT
  - UI4-INTAKE-PAGE-FLOW
  - UI4-WORKFLOW-QUERY-AUTOLOAD
  - UI4-TENANT-SCOPING
  - UI4-ROUTES-THIN-PRISMA-FREE
  - UI4-INTEGRATION-TESTS-MINIMAL
  - UI4-NO-SCHEMA-CHANGES
user_setup: []
must_haves:
  truths:
    - "GET /api/ecos returns tenant-scoped ECO rows (id, title, createdAt) only."
    - "POST /api/ecos creates tenant-scoped ECO and returns ecoId deterministically."
    - "GET /api/template-versions returns tenant-scoped published versions with template name."
    - "Routes remain thin and Prisma-free, delegating to service + tenantDb wrapper methods."
    - "Intake page supports create -> choose template -> instantiate -> redirect workflow launch path."
    - "Workflow page reads query params and auto-loads projection when tenantId+ecoId(+actorId) are present."
    - "No workflow engine semantics are changed."
    - "No schema/model changes are introduced."
    - "Integration tests cover eco create endpoint and template-version listing endpoint."
    - "Execution remains sequential."
  artifacts:
    - "New intake page implementing deterministic launch flow."
    - "Eco and template service methods + tenantDb helpers for list/create/read operations."
    - "API client wrappers for eco/template endpoints."
    - "Workflow auto-bootstrap from URL query params."
  key_links:
    - "Instantiation still uses existing instantiate endpoint and service behavior."
    - "Projection remains source of truth once redirected to workflow page."
---

<objective>
Provide an end-to-end intake-to-workflow launch experience: create ECO, select template, instantiate, and land in command center with projection loaded.

Purpose:
Reduce operator setup friction and make workflow launch path explicit and deterministic.

Output:
Intake page, supporting endpoints/services, query-driven workflow bootstrap, and minimal integration test coverage.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@src/app/intake/page.tsx
@src/lib/api-client.ts
@src/app/api/ecos/route.ts
@src/app/api/template-versions/route.ts
@src/services/template-instantiation.service.ts
@src/services/workflow-projection.service.ts
@src/components/workflow/workflow-command-center.tsx
@src/app/workflow/page.tsx
@src/lib/db.ts
@tests/integration/workflow-engine.integration.test.ts
@docs/ARCHITECTURE_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add tenant-scoped eco/template list/create service primitives and thin routes</name>
  <files>src/lib/db.ts, src/services/eco.service.ts, src/services/template.service.ts, src/app/api/ecos/route.ts, src/app/api/template-versions/route.ts</files>
  <action>
Implement service-layer methods and tenantDb helpers for:
- list ecos by tenant
- create eco by tenant
- list published template versions by tenant with template name
Add thin API routes:
- GET/POST /api/ecos
- GET /api/template-versions
Keep Prisma out of route files and enforce deterministic validation errors.
  </action>
  <verify>
    <automated>npx eslint src/lib/db.ts src/services/eco.service.ts src/services/template.service.ts src/app/api/ecos/route.ts src/app/api/template-versions/route.ts</automated>
  </verify>
  <done>Tenant-scoped intake data APIs exist with thin route handlers.</done>
</task>

<task type="auto">
  <name>Task 2: Build /intake page and api-client wrappers for end-to-end launch flow</name>
  <files>src/app/intake/page.tsx, src/lib/api-client.ts</files>
  <action>
Add API client methods for eco list/create and template version list.
Implement intake UI:
- tenantId + actorId inputs
- ECO title create action
- template version selector
- instantiate action via existing instantiate endpoint
- redirect on success to /workflow with query params (tenantId, ecoId, actorId)
Keep deterministic loading/error states.
  </action>
  <verify>
    <automated>npx eslint src/app/intake/page.tsx src/lib/api-client.ts</automated>
  </verify>
  <done>Operators can complete create->instantiate->launch flow from /intake.</done>
</task>

<task type="auto">
  <name>Task 3: Add workflow query bootstrap and optional eco selector UX</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/app/workflow/page.tsx, src/lib/api-client.ts</files>
  <action>
Read query params on workflow load and pre-seed tenantId/ecoId/actorId.
Auto-fetch projection and audit on initial load when required params are present.
Optionally add eco selector using GET /api/ecos if low-risk.
Ensure existing command center interactions remain deterministic.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/workflow-command-center.tsx src/app/workflow/page.tsx src/lib/api-client.ts</automated>
  </verify>
  <done>Workflow page launches directly from intake redirect with data loaded.</done>
</task>

<task type="auto">
  <name>Task 4: Add minimal integration tests for new endpoints</name>
  <files>tests/integration/workflow-engine.integration.test.ts</files>
  <action>
Add/extend integration tests for:
- POST /api/ecos create returns ecoId and persists tenant-scoped row
- GET /api/template-versions returns published versions for tenant only
Retain existing instantiate coverage as-is.
  </action>
  <verify>
    <automated>npm run test</automated>
  </verify>
  <done>Endpoint behavior is verified with deterministic tenant-scoped tests.</done>
</task>

<task type="auto">
  <name>Task 5: Final verification and summary</name>
  <files>src/app/intake/page.tsx, src/app/api/ecos/route.ts, src/app/api/template-versions/route.ts, tests/integration/workflow-engine.integration.test.ts</files>
  <action>
Run lint/test/build checks and verify end-to-end intake launch manually.
Document deterministic manual flow and environment caveats in summary.
  </action>
  <verify>
    <automated>npm run lint && npm run test && npm run build</automated>
  </verify>
  <done>UI-4 flow is delivered and documented with required coverage.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] No schema/model changes
- [ ] GET /api/ecos is tenant-scoped and returns id/title/createdAt
- [ ] POST /api/ecos creates tenant-scoped ECO and returns ecoId
- [ ] GET /api/template-versions returns tenant-scoped published versions with template name
- [ ] Routes are thin and Prisma-free
- [ ] /intake supports create + template select + instantiate + redirect
- [ ] /workflow auto-loads projection from query params
- [ ] No workflow engine semantics changed
- [ ] Integration tests for eco create + template version list added and passing
- [ ] `npm run build` passes
</verification>

<success_criteria>
- Operator can complete intake-to-workflow launch in one deterministic path
- Backend endpoint surface is minimal, tenant-safe, and service-layer aligned
- Existing workflow engine behavior remains unchanged
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory with manual end-to-end run steps and verification evidence.
</output>
