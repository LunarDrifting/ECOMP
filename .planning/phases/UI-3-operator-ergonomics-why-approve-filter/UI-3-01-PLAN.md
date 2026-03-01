---
phase: UI-3-operator-ergonomics-why-approve-filter
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/workflow/workflow-command-center.tsx
  - src/components/workflow/task-row.tsx
  - src/components/workflow/task-drawer.tsx
  - src/components/workflow/filters.tsx
  - src/lib/api-client.ts
autonomous: true
requirements:
  - UI3-FILTERS-SEARCH
  - UI3-INELIGIBLE-WHY-EXPLANATION
  - UI3-APPROVE-REJECT-DRAWER-ACTIONS
  - UI3-BLOCKER-COPY-UTILITY
  - UI3-DISABLED-ACTION-TOOLTIPS
  - UI3-PROJECTION-ONLY-ACTIONABILITY
  - UI3-NO-BACKEND-CHANGES
  - UI3-NO-SCHEMA-CHANGES
user_setup: []
must_haves:
  truths:
    - "Task filtering (All/Ready/Blocked/Done) and optional search run entirely on the loaded projection task set."
    - "Completion actionability remains driven only by projection `canComplete`."
    - "Ineligibility explanations are derived only from projection fields (state, blockingTaskIds, requiresApproval, requiresPrecondition, canComplete)."
    - "UI does not attempt to recompute backend approval/gate/dependency policy semantics."
    - "Task drawer supports Approve/Reject calls to existing approvals endpoint with actor-scoped enablement."
    - "After approval actions, projection and audit timeline are refetched deterministically."
    - "Blocking IDs can be copied quickly from drawer without backend changes."
    - "Disabled completion/approval actions show clear deterministic tooltip explanations."
    - "No backend behavior or schema/model changes are introduced."
    - "Execution remains sequential."
  artifacts:
    - "Filter/search control UI and wiring for list/graph task collections."
    - "Shared ineligibility explanation helper used by rows/drawer action affordances."
    - "Drawer approval controls with APPROVED/REJECTED submissions and post-action refetch flow."
  key_links:
    - "Projection remains the single source of truth for workflow state/actionability."
    - "Approval action outcomes are server-authoritative; UI only refetches and renders returned state."
---

<objective>
Improve operator ergonomics in workflow UI via deterministic filtering, safe ineligibility explanations, and approval action affordances.

Purpose:
Reduce operator friction while preserving projection-driven correctness and backend authority.

Output:
Filter/search controls, "why can't complete" messaging, approval actions in drawer, and blocker copy utility.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@src/components/workflow/workflow-command-center.tsx
@src/components/workflow/task-row.tsx
@src/components/workflow/task-drawer.tsx
@src/lib/api-client.ts
@src/components/workflow/graph-view.tsx
@docs/ARCHITECTURE_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add deterministic filters and optional search</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/filters.tsx</files>
  <action>
Add UI-level filtering controls (All/Ready/Blocked/Done) and optional task search by name/id.
Apply filtering to already loaded projection tasks only.
Ensure deterministic ordering remains `tasksTopologicalOrder`-based after filters.
Style filter pills consistently with existing count chip system.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/workflow-command-center.tsx src/components/workflow/filters.tsx</automated>
  </verify>
  <done>Operators can deterministically filter and search tasks without additional backend requests.</done>
</task>

<task type="auto">
  <name>Task 2: Implement safe "why can't I complete?" explanations</name>
  <files>src/components/workflow/task-row.tsx, src/components/workflow/task-drawer.tsx, src/components/workflow/workflow-command-center.tsx</files>
  <action>
Add deterministic explanation helper for `canComplete === false` using only allowed projection fields and fixed precedence.
Expose explanation via tooltip/hover affordance on disabled completion actions.
Do not infer backend policy internals.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/task-row.tsx src/components/workflow/task-drawer.tsx src/components/workflow/workflow-command-center.tsx</automated>
  </verify>
  <done>Users receive clear, bounded reasons for ineligible completion without client business-logic recomputation.</done>
</task>

<task type="auto">
  <name>Task 3: Add drawer Approve/Reject actions and blocker copy utility</name>
  <files>src/components/workflow/task-drawer.tsx, src/lib/api-client.ts, src/components/workflow/workflow-command-center.tsx</files>
  <action>
Add Approve/Reject buttons in drawer calling existing approvals endpoint.
Enable actions only when actorId is present.
After action completion, refetch projection and audit timeline.
Handle 403/409 failures with current deterministic status messaging.
Add "copy blocker IDs" utility in drawer for `blockingTaskIds`.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/task-drawer.tsx src/lib/api-client.ts src/components/workflow/workflow-command-center.tsx</automated>
  </verify>
  <done>Approval actions and blocker inspection workflows are available with server-authoritative state refresh.</done>
</task>

<task type="auto">
  <name>Task 4: Verify deterministic ergonomics and preserve behavior</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/task-row.tsx, src/components/workflow/task-drawer.tsx</files>
  <action>
Verify:
- filters/search deterministically change visible tasks
- ineligible tooltip messaging follows fixed precedence
- approval actions post and refresh projection/audit
- completion gating remains projection-driven via `canComplete`
- list and graph views remain behaviorally consistent
Document outcomes in phase summary.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>UI-3 ergonomic improvements are complete with projection-driven behavior unchanged.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] No backend behavior changes
- [ ] No schema/model changes
- [ ] Filter pills (All/Ready/Blocked/Done) work deterministically
- [ ] Search filters by task name/id on loaded tasks only
- [ ] Completion gating remains driven only by projection `canComplete`
- [ ] Ineligible explanation uses only allowed projection fields
- [ ] No client recomputation of approval/gate/dependency policy internals
- [ ] Drawer Approve/Reject calls existing endpoint and handles 403/409 gracefully
- [ ] Projection + audit refetch after approval action
- [ ] Blocking IDs copy utility works
- [ ] Disabled actions include clear tooltip explanation
- [ ] `npm run build` passes
</verification>

<success_criteria>
- Operators can quickly filter, inspect blockers, and understand action ineligibility
- Approval actions are accessible in-context with deterministic state refresh
- Projection-driven correctness and backend authority remain intact
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory, including manual verification notes for filters, explanations, and approval-action refresh behavior.
</output>
