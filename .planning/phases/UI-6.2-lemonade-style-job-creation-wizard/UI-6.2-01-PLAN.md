---
phase: UI-6.2-lemonade-style-job-creation-wizard
plan: "01"
type: execute
wave: 1
depends_on: [UI-6-template-builder-mvp, UI-5-hide-ids-debug-toggle-friendly-labels]
files_modified:
  - src/app/wizard/page.tsx
  - src/components/wizard/*
  - src/components/workflow/workflow-command-center.tsx
  - src/components/workflow/task-row.tsx
  - src/components/workflow/task-drawer.tsx
  - src/lib/api-client.ts
  - src/app/api/ecos/[id]/task-order/route.ts
  - src/app/api/tasks/[id]/route.ts
  - src/services/task-order.service.ts
  - src/services/task-customization.service.ts
  - src/lib/db.ts
  - tests/integration/workflow-engine.integration.test.ts
autonomous: true
requirements:
  - UI62-QUICK-START-JOB-PIVOT
  - UI62-NO-SCHEMA-CHANGES
  - UI62-LOW-FRICTION-WIZARD
  - UI62-LAUNCH-FROM-GLOBAL-TEMPLATE
  - UI62-WORKFLOW-POST-LAUNCH-CUSTOMIZE
  - UI62-RUNTIME-TASK-ONLY-EDITS
  - UI62-STATE-GUARDRAILS-PRESERVED
  - UI62-FRIENDLY-COPY
  - UI62-DEBUG-RAW-DETAILS
  - UI62-DETERMINISTIC-TESTS
user_setup: []
must_haves:
  truths:
    - "UI-6.2 is Quick Start Job, not template authoring."
    - "Wizard flow is 2-3 screens only: name, template pick, start job."
    - "Wizard does not include validate/publish/dependency authoring/template editing."
    - "Default template selection targets Global Template (Live) when available."
    - "Start job uses existing create ECO + instantiate flow and redirects to workflow."
    - "Workflow shows dismissible post-launch customize banner with Customize/Not now."
    - "Customization edits runtime tasks for current ECO only."
    - "Customization supports deterministic reorder preference and NOT_REQUIRED hide semantics."
    - "No runtime hard delete required; NOT_REQUIRED is the hide/remove mechanism."
    - "Ordering persistence uses ECO-level TASK_ORDER_SET audit event, not Task.sortOrder."
    - "POST /api/ecos/[id]/task-order remains thin, tenant-scoped, Prisma-free in route, and service-layer enforced."
    - "Per-task customization endpoint (if needed) is limited to NOT_REQUIRED state update and preserves state guardrails."
    - "No schema/model changes are introduced."
    - "Template authoring remains in /templates with low-emphasis link from wizard."
    - "Friendly language is default; technical labels/IDs/errors only in debug mode."
    - "Execution remains sequential."
  artifacts:
    - "Quick Start wizard page/components with one-question-per-screen UX."
    - "Workflow customization UI for list-order preference + NOT_REQUIRED actions + Save."
    - "Task order service + endpoint writing TASK_ORDER_SET audit events."
    - "Minimal per-task NOT_REQUIRED customization service + endpoint (if missing in current API)."
    - "Integration tests for quick-start, task-order save/retrieval, and NOT_REQUIRED behavior."
  key_links:
    - "Wizard uses existing intake/template APIs; no template authoring path embedded."
    - "Runtime customization mutates ECO-bound tasks only and does not touch template definitions."
    - "Guardrails from state transition service remain authoritative."
---

<objective>
Pivot UI-6.2 to a Lemonade-style Quick Start Job experience with post-launch, job-specific task customization in workflow.

Purpose:
Maximize launch speed and clarity for common jobs from Global Template while keeping advanced template authoring in `/templates`.

Output:
Short guided launch wizard + workflow customization controls with deterministic audit-backed order preference and preserved backend guardrails.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@src/app/intake/page.tsx
@src/app/workflow/page.tsx
@src/components/workflow/workflow-command-center.tsx
@src/components/workflow/task-row.tsx
@src/components/workflow/task-drawer.tsx
@src/components/workflow/debug-mode.ts
@src/lib/api-client.ts
@src/app/api/ecos
@src/app/api/tasks
@src/services
@src/lib/db.ts
@tests/integration/workflow-engine.integration.test.ts
@docs/ARCHITECTURE_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build Quick Start Job wizard (2-3 screens, launch only)</name>
  <files>src/app/wizard/page.tsx, src/components/wizard/*, src/lib/api-client.ts</files>
  <action>
Implement one-question-per-screen wizard:
- Screen 1: Job title
- Screen 2: Template pick (default Global Template (Live))
- Screen 3: Start job
Start job orchestration:
- POST /api/ecos
- POST /api/ecos/{ecoId}/instantiate
- redirect /workflow?tenantId=...&ecoId=...&actorId=...
Exclude validate/publish/template authoring/dependency authoring flows.
Add low-emphasis link: Need a brand-new template? -> /templates.
  </action>
  <verify>
    <automated>npx eslint src/app/wizard/page.tsx src/components/wizard src/lib/api-client.ts</automated>
  </verify>
  <done>Quick Start wizard launches jobs with minimal friction and friendly copy.</done>
</task>

<task type="auto">
  <name>Task 2: Add post-launch customize banner and runtime task customize mode in workflow</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/task-row.tsx, src/components/workflow/task-drawer.tsx</files>
  <action>
After workflow load, show dismissible banner:
- Want to customize tasks for this job?
- Customize / Not now
In customize mode:
- Reorder tasks in list view (drag-drop or deterministic move controls)
- Hide task via state -> NOT_REQUIRED
- Explicit Save button for persistence
Default mode remains unchanged and server-authoritative.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/workflow-command-center.tsx src/components/workflow/task-row.tsx src/components/workflow/task-drawer.tsx</automated>
  </verify>
  <done>Workflow supports job-specific customization without exposing technical complexity.</done>
</task>

<task type="auto">
  <name>Task 3: Add ECO-level task order preference endpoint/service</name>
  <files>src/app/api/ecos/[id]/task-order/route.ts, src/services/task-order.service.ts, src/lib/db.ts, src/lib/api-client.ts</files>
  <action>
Implement tenant-scoped order preference save endpoint:
- POST /api/ecos/[id]/task-order
- body: { tenantId, actorId, orderedTaskIds: string[] }
Service writes AuditEvent with:
- eventType: TASK_ORDER_SET
- payload: { orderedTaskIds } (size bounded)
Read path:
- use existing audit feed (or tiny read helper) to fetch latest TASK_ORDER_SET
- apply order deterministically to workflow list view only:
  - `filteredSavedOrder`: orderedTaskIds filtered to existing taskIds for the ECO (optionally excluding NOT_REQUIRED)
  - `remainingTopoOrder`: tasks not in filteredSavedOrder, ordered by tasksTopologicalOrder
  - `finalOrder = filteredSavedOrder + remainingTopoOrder`
Do not alter graph ordering (topo remains authoritative).
  </action>
  <verify>
    <automated>npx eslint src/app/api/ecos/[id]/task-order/route.ts src/services/task-order.service.ts src/lib/db.ts src/lib/api-client.ts</automated>
  </verify>
  <done>Order preference is persisted as TASK_ORDER_SET and reapplied deterministically in list view.</done>
</task>

<task type="auto">
  <name>Task 4: Keep per-task customization limited to NOT_REQUIRED</name>
  <files>src/app/api/tasks/[id]/route.ts, src/services/task-customization.service.ts, src/lib/db.ts</files>
  <action>
Implement or reuse minimal per-task customization write path for hide action only:
- persist task state as NOT_REQUIRED
- no ordering fields and no sortOrder usage
- no ordering via PATCH /api/tasks/[id]
Route thin, tenant-scoped, Prisma-free.
Service-layer guardrails enforce legal state handling for this phase.
  </action>
  <verify>
    <automated>npx eslint src/app/api/tasks/[id]/route.ts src/services/task-customization.service.ts src/lib/db.ts</automated>
  </verify>
  <done>NOT_REQUIRED remains the only persisted per-task customization in UI-6.2.</done>
</task>

<task type="auto">
  <name>Task 5: Friendly copy + debug visibility rules</name>
  <files>src/components/wizard/*, src/components/workflow/workflow-command-center.tsx</files>
  <action>
Ensure default mode copy uses friendly labels:
- Job, Task, Start job, Global Template (Live)
Hide IDs and technical backend terms by default.
When debug mode ON:
- reveal raw IDs
- show technical labels/backend messages
Keep this behavior deterministic and consistent with UI-5 debug model.
  </action>
  <verify>
    <automated>npx eslint src/components/wizard src/components/workflow/workflow-command-center.tsx</automated>
  </verify>
  <done>Friendly UX is preserved by default, with operator diagnostics available in debug mode.</done>
</task>

<task type="auto">
  <name>Task 6: Add/adjust integration tests for quick start + customization</name>
  <files>tests/integration/workflow-engine.integration.test.ts</files>
  <action>
Add deterministic tests covering:
1) Quick Start flow creates ECO and instantiates selected template.
2) Order save creates TASK_ORDER_SET and retrieval/application is deterministic.
3) NOT_REQUIRED action hides task in UI path while row remains persisted in DB.
No Playwright required.
  </action>
  <verify>
    <automated>npm run test && npm run build</automated>
  </verify>
  <done>UI-6.2 pivot behavior is validated end-to-end with deterministic assertions.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] UI-6.2 intent updated to Quick Start Job
- [ ] Wizard reduced to 2-3 launch-focused screens
- [ ] No template authoring/validate/publish/dependency editing in wizard
- [ ] Global Template (Live) default selection behavior implemented
- [ ] Start job flow performs ECO create + instantiate + workflow redirect
- [ ] /workflow shows dismissible Customize banner
- [ ] Customize mode supports runtime reorder in UI
- [ ] Save posts orderedTaskIds to POST /api/ecos/[id]/task-order
- [ ] TASK_ORDER_SET audit event is written with bounded payload
- [ ] Latest saved order is retrieved and applied deterministically in list view
- [ ] Deterministic merge rule enforced: finalOrder = filteredSavedOrder + remainingTopoOrder
- [ ] Graph ordering remains topo-driven
- [ ] Customize mode supports NOT_REQUIRED hide behavior
- [ ] Any new order/task routes are thin and Prisma-free
- [ ] Service-layer guardrails prevent illegal per-task state updates
- [ ] /templates link exists from wizard for new template authoring
- [ ] Default mode hides IDs/technical terms
- [ ] Debug mode reveals raw details
- [ ] Integration tests cover quick start, TASK_ORDER_SET persistence/retrieval, and NOT_REQUIRED behavior
- [ ] `npm run build` passes
</verification>

<success_criteria>
- Most jobs launch quickly from Global Template with minimal user input.
- Job-specific customization occurs post-launch in workflow without template mutation.
- System remains tenant-safe, deterministic, and guardrail-compliant.
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory with:
- quick-start user journey notes
- workflow customization notes
- debug/default visibility checks
- any environment verification constraints
</output>
