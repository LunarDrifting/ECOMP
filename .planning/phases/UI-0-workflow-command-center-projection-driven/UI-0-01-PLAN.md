---
phase: UI-0-workflow-command-center-projection-driven
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/workflow/page.tsx
  - src/components/workflow/*
  - src/lib/api-client.ts
  - src/app/api/ecos/[id]/audit/route.ts
  - tests/integration/workflow-engine.integration.test.ts
autonomous: true
requirements:
  - UI0-PROJECTION-SOURCE-OF-TRUTH
  - UI0-COMMAND-CENTER-LIST-VIEW
  - UI0-COMPLETE-ACTION-REFETCH
  - UI0-AUDIT-TIMELINE-ENDPOINT
  - UI0-NO-CLIENT-RECOMPUTATION
  - UI0-DETERMINISTIC-INTERACTIONS
  - UI0-NO-BACKEND-BEHAVIOR-DRIFT
  - UI0-NO-SCHEMA-CHANGES
user_setup: []
must_haves:
  truths:
    - "UI reads workflow state from projection endpoint and does not recompute dependency/approval/gate eligibility."
    - "Task actionability in UI is driven directly by `canComplete` from projection."
    - "After completion action, UI refetches projection before rendering final state."
    - "Tasks render in `tasksTopologicalOrder` returned by projection."
    - "Command center header shows ECO identity, progress, and count badges."
    - "Task row and drawer show required workflow metadata and blocking references."
    - "Audit panel consumes read-only audit endpoint and shows non-PII event summary."
    - "Audit endpoint is read-only, tenant-scoped, and batched."
    - "No backend write-side behavior is changed."
    - "No schema/model changes are made."
    - "Execution remains sequential."
  artifacts:
    - "src/app/workflow/page.tsx provides command center page shell."
    - "src/components/workflow/* contains list rows, drawer, badges, and timeline panel."
    - "src/lib/api-client.ts contains typed fetch wrappers for projection/complete/audit."
    - "src/app/api/ecos/[id]/audit/route.ts exposes read-only tenant-scoped audit feed."
    - "Integration tests verify audit endpoint and projection-driven action gating behavior."
  key_links:
    - "UI refetch cycle keeps server as source of truth for state transitions."
    - "Audit endpoint output is sanitized to eventType + ids/counts + time only."
    - "No client-side fallback eligibility computation is introduced."
---

<objective>
Deliver a projection-driven workflow command center UI with task actionability and audit visibility.

Purpose:
Provide a deterministic operator UI that reflects backend workflow engine state without duplicating logic in the client.

Output:
Workflow command center page + supporting components + read-only audit endpoint + verification coverage.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@docs/ARCHITECTURE_CONTRACT.md
@src/app/api/ecos/[id]/projection/route.ts
@src/services/workflow-projection.service.ts
@src/app/api/tasks/[id]/complete/route.ts
@src/app/api/tasks/[id]/approvals/route.ts
@src/lib/db.ts
@src/app/page.tsx
@src/app/layout.tsx
@src/app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add read-only audit feed endpoint and API client wrappers</name>
  <files>src/app/api/ecos/[id]/audit/route.ts, src/lib/api-client.ts, src/lib/db.ts</files>
  <action>
Implement `GET /api/ecos/{id}/audit?tenantId=...` as a read-only route:
- tenant-scoped
- batched query (single audit read for eco scope, bounded latest N)
- safe output fields only (`eventType`, `createdAt`, related ids/counts/status)
- no raw PII or unsafe payload fields
Add API client wrappers for:
- fetchProjection
- completeTask
- createApproval (optional action support)
- fetchAuditTimeline
Keep routes thin and Prisma-free.
  </action>
  <verify>
    <automated>npm run lint -- src/app/api/ecos/[id]/audit/route.ts src/lib/api-client.ts || npm run lint</automated>
  </verify>
  <done>Audit read endpoint and typed UI fetch layer are ready.</done>
</task>

<task type="auto">
  <name>Task 2: Build command center UI page and workflow components</name>
  <files>src/app/workflow/page.tsx, src/components/workflow/*</files>
  <action>
Create command center list-mode UI using projection response as source of truth:
- header with eco info, progress bar, count badges, actor selector
- task list rendered in tasksTopologicalOrder
- per-row state/action badges, blocking count tooltip, canComplete visual state
- detail drawer with task metadata, blocking ids, approval summary, gate summary
- action buttons:
  - Complete enabled only when canComplete === true
  - optional Approve action if included
- post-action behavior: call endpoint then refetch projection
- deterministic error handling for 403/409
Apply subtle framer-motion fade/slide transitions for row updates and drawer.
Use Tailwind + shadcn/ui style patterns.
  </action>
  <verify>
    <automated>npm run lint -- src/app/workflow/page.tsx src/components/workflow || npm run lint</automated>
  </verify>
  <done>Projection-driven command center UI is functional and deterministic.</done>
</task>

<task type="auto">
  <name>Task 3: Integrate audit timeline panel and verify projection-driven behavior</name>
  <files>src/app/workflow/page.tsx, src/components/workflow/*, tests/integration/workflow-engine.integration.test.ts</files>
  <action>
Add audit timeline panel on right sidebar:
- load from audit endpoint
- display eventType + timestamp + ids/counts summary
- no PII fields rendered
Add/extend tests or deterministic verification steps:
- UI/manual steps confirm projection load
- completion action refetch updates view
- audit timeline updates after write actions
- canComplete gating behavior matches backend projection
Keep test/assertions deterministic and avoid timing-based checks.
  </action>
  <verify>
    <automated>npm run build && npm run test -- tests/integration/workflow-engine.integration.test.ts</automated>
  </verify>
  <done>Audit timeline and projection-driven action loop are verified.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] No schema/model changes
- [ ] Workflow page renders projection data successfully
- [ ] Tasks render in tasksTopologicalOrder
- [ ] Header shows progress and count badges from projection counts
- [ ] canComplete gating strictly follows projection field (no client recomputation)
- [ ] Complete action sends tenantId + actorId and refetches projection
- [ ] 403/409 states surface deterministic inline/toast feedback
- [ ] Audit endpoint exists and is tenant-scoped read-only
- [ ] Audit panel shows eventType/time/ids-counts only (no PII)
- [ ] Projection, completion, and audit calls use shared API client wrapper
- [ ] No backend write-side behavior drift
- [ ] No background workers
- [ ] `npm run build` passes
</verification>

<success_criteria>
- UI-0 command center is usable for seeded workflow operations
- Server projection remains single source of truth for task actionability/state
- Audit timeline provides deterministic non-PII observability
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory.
</output>
