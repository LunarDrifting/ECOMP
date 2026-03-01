---
phase: UI-3.1-approval-semantics-tightening
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/approval.service.ts
  - src/services/template-instantiation.service.ts
  - src/app/api/tasks/[id]/approvals/route.ts
  - src/components/workflow/task-drawer.tsx
  - tests/integration/workflow-engine.integration.test.ts
autonomous: true
requirements:
  - UI31-DUPLICATE-APPROVAL-BLOCK
  - UI31-POLICY-APPROVED-ONLY-SEMANTICS
  - UI31-ROUTE-409-DUPLICATE-MAPPING
  - UI31-UI-APPROVED-REJECTED-COUNTS
  - UI31-INTEGRATION-TEST-COVERAGE
  - UI31-NO-SCHEMA-CHANGES
user_setup: []
must_haves:
  truths:
    - "Approval creation rejects duplicate submissions for (tenantId, taskId, actorId) with deterministic 409 and message `Approval already submitted for task`."
    - "Duplicate approval rejection performs no approval-row write."
    - "Audit attempt/rejected emission behavior is preserved on duplicate rejection."
    - "SINGLE/PARALLEL/QUORUM policy checks count only APPROVED rows and ignore REJECTED rows."
    - "SEQUENTIAL semantics remain unchanged: any REJECTED blocks; otherwise >=1 APPROVED required."
    - "PARALLEL minimal semantics require >=1 APPROVED by actor with roleId == ownerRoleId."
    - "QUORUM semantics require >=2 distinct actorIds with APPROVED decisions."
    - "Approvals route remains thin and Prisma-free with deterministic 409 mapping."
    - "Task drawer surfaces Approved and Rejected counts separately."
    - "Integration tests cover duplicate approval rejection and REJECTED-only non-satisfaction for SINGLE/PARALLEL/QUORUM."
    - "No schema/model changes are introduced."
    - "Execution remains sequential."
  artifacts:
    - "Approval service duplicate guard before create operation."
    - "Updated approval policy evaluator logic in markTaskDone flow."
    - "UI drawer approval summary split into approved vs rejected counts."
    - "Integration tests asserting duplicate guard and tightened policy outcomes."
  key_links:
    - "Approval semantics are server-authoritative and deterministic."
    - "UI reflects persisted decisions and does not infer policy internals."
---

<objective>
Tighten approval semantics and duplicate-submission behavior for deterministic workflow outcomes and clearer operator UX.

Purpose:
Eliminate ambiguous approval behavior and align completion policy checks with APPROVED-only rules where specified.

Output:
Duplicate guard, policy evaluator tightening, UI count clarity, and integration test coverage.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@src/services/approval.service.ts
@src/services/template-instantiation.service.ts
@src/app/api/tasks/[id]/approvals/route.ts
@src/components/workflow/task-drawer.tsx
@tests/integration/workflow-engine.integration.test.ts
@docs/ARCHITECTURE_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add duplicate-approval guard in approval service</name>
  <files>src/services/approval.service.ts, src/app/api/tasks/[id]/approvals/route.ts</files>
  <action>
Before creating Approval, check whether an approval already exists for (tenantId, taskId, actorId).
If found, reject deterministically with 409 and message `Approval already submitted for task`.
Ensure no approval write occurs on rejection.
Preserve audit attempt + rejected event behavior.
Keep route thin and Prisma-free with explicit 409 mapping if needed.
  </action>
  <verify>
    <automated>npx eslint src/services/approval.service.ts src/app/api/tasks/[id]/approvals/route.ts</automated>
  </verify>
  <done>Duplicate actor approvals are blocked deterministically without schema changes.</done>
</task>

<task type="auto">
  <name>Task 2: Tighten approval policy evaluator semantics</name>
  <files>src/services/template-instantiation.service.ts</files>
  <action>
Update markTaskDone approval policy checks:
- SINGLE: >=1 APPROVED only
- PARALLEL minimal: >=1 APPROVED by ownerRole actor only
- QUORUM: >=2 distinct APPROVED actorIds only
- SEQUENTIAL unchanged (any REJECTED blocks, else >=1 APPROVED)
- NONE unchanged
Ensure canonical policy failure response remains deterministic and unchanged.
  </action>
  <verify>
    <automated>npx eslint src/services/template-instantiation.service.ts</automated>
  </verify>
  <done>Policy semantics are deterministic and aligned to approved-only rules where required.</done>
</task>

<task type="auto">
  <name>Task 3: Improve approval summary clarity in task drawer UI</name>
  <files>src/components/workflow/task-drawer.tsx</files>
  <action>
Display Approved count and Rejected count separately in drawer approval section.
Keep UI simple and deterministic.
Handle duplicate-approval 409 feedback via existing command center status flow.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/task-drawer.tsx</automated>
  </verify>
  <done>UI clearly distinguishes approved vs rejected decision counts.</done>
</task>

<task type="auto">
  <name>Task 4: Add integration tests for duplicate guard and rejected-only policy failure</name>
  <files>tests/integration/workflow-engine.integration.test.ts</files>
  <action>
Add tests:
1) same actor submits APPROVED twice -> second request returns deterministic 409 duplicate error.
2) REJECTED-only decision set fails completion for SINGLE, PARALLEL, QUORUM with canonical 409 policy failure.
Ensure existing tests continue passing and no schema changes are required.
  </action>
  <verify>
    <automated>npm run test</automated>
  </verify>
  <done>Integration coverage proves deterministic duplicate guard and tightened policy semantics.</done>
</task>

<task type="auto">
  <name>Task 5: Final verification and summary</name>
  <files>src/services/approval.service.ts, src/services/template-instantiation.service.ts, tests/integration/workflow-engine.integration.test.ts</files>
  <action>
Run lint/test/build gates and confirm no behavior drift outside scope.
Document outcomes and any environment constraints in phase summary.
  </action>
  <verify>
    <automated>npm run lint && npm run test && npm run build</automated>
  </verify>
  <done>Phase behavior is deterministic, covered by integration tests, and documented.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] No schema/model changes
- [ ] Duplicate actor approval for same task is rejected with deterministic 409
- [ ] Duplicate rejection writes no approval row
- [ ] Audit attempt + rejected event preserved on duplicate rejection
- [ ] SINGLE ignores REJECTED and requires APPROVED
- [ ] PARALLEL ignores REJECTED and requires owner-role APPROVED
- [ ] QUORUM ignores REJECTED and requires >=2 distinct APPROVED actorIds
- [ ] SEQUENTIAL behavior unchanged
- [ ] Drawer displays Approved vs Rejected counts separately
- [ ] Integration tests added and passing for required scenarios
- [ ] Existing tests remain green
- [ ] Routes remain thin and Prisma-free
- [ ] `npm run build` passes
</verification>

<success_criteria>
- Approval semantics are unambiguous and deterministic
- Duplicate approvals are prevented safely
- UI provides clear approved/rejected visibility
- Integration tests guard against regression
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory with test evidence and error-mapping notes.
</output>
