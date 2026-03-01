---
phase: UI-5-hide-ids-debug-toggle-friendly-labels
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/workflow/workflow-command-center.tsx
  - src/components/workflow/task-row.tsx
  - src/components/workflow/task-drawer.tsx
  - src/components/workflow/node-card.tsx
  - src/components/workflow/audit-timeline.tsx
  - src/components/workflow/debug-mode.ts
autonomous: true
requirements:
  - UI5-DEBUG-TOGGLE-PERSISTED
  - UI5-HIDE-IDS-NORMAL-MODE
  - UI5-REVEAL-IDS-DEBUG-MODE
  - UI5-FRIENDLY-LABELS
  - UI5-FRIENDLY-AUDIT-MESSAGES
  - UI5-ECO-SELECTOR-NORMAL-MODE
  - UI5-NO-BACKEND-CHANGES
  - UI5-NO-SCHEMA-CHANGES
user_setup: []
must_haves:
  truths:
    - "Debug mode toggle exists in workflow header and defaults to OFF."
    - "Debug mode state is persisted in localStorage and restored on reload."
    - "Normal mode hides tenant/eco raw ID inputs and task/audit internal IDs by default."
    - "Debug mode reveals internal IDs, troubleshooting inputs, and raw audit details."
    - "Normal mode uses friendly labels/messages for ECO title, tasks, blockers, and audit entries."
    - "Audit timeline in normal mode shows friendly event strings + timestamps only."
    - "ECO selector drives ECO switching in normal mode while raw ecoId input stays debug-only."
    - "Existing workflow actions (complete, approvals, graph/list, filters) remain functional."
    - "No backend behavior or schema/model changes are introduced."
    - "Execution remains sequential."
  artifacts:
    - "Debug mode persistence helper/hook for shared usage."
    - "Conditional rendering updates across row/drawer/node/audit components."
    - "Friendly audit event formatting helper with deterministic fallback labels."
  key_links:
    - "Projection/audit API contracts remain unchanged; formatting is purely UI-level."
    - "Debug mode is a display-layer concern only."
---

<objective>
Make workflow UI user-friendly by default while preserving an operator debug mode for internal ID visibility.

Purpose:
Reduce cognitive load for normal users without sacrificing troubleshooting depth for operators.

Output:
Persistent debug toggle, hidden IDs by default, friendly labels/messages, and raw detail reveal in debug mode.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@src/components/workflow/workflow-command-center.tsx
@src/components/workflow/task-row.tsx
@src/components/workflow/task-drawer.tsx
@src/components/workflow/node-card.tsx
@src/components/workflow/audit-timeline.tsx
@src/lib/api-client.ts
@docs/ARCHITECTURE_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add persistent debug mode toggle and wiring</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/debug-mode.ts</files>
  <action>
Add debug toggle in header (default OFF).
Persist state in localStorage and restore on mount.
Pass debug-mode flag to row/drawer/graph/audit components via props.
Keep deterministic behavior and avoid timing-dependent state transitions.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/workflow-command-center.tsx src/components/workflow/debug-mode.ts</automated>
  </verify>
  <done>Debug mode is persisted and globally available to workflow display components.</done>
</task>

<task type="auto">
  <name>Task 2: Hide/reveal identifiers across task views based on debug mode</name>
  <files>src/components/workflow/task-row.tsx, src/components/workflow/task-drawer.tsx, src/components/workflow/node-card.tsx, src/components/workflow/workflow-command-center.tsx</files>
  <action>
Normal mode:
- hide tenantId/ecoId raw inputs
- hide task IDs and raw blocker IDs
- keep friendly names/counts
Debug mode:
- reveal raw IDs and troubleshooting controls
- keep existing copy affordances visible
Ensure all actions still function unchanged.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/task-row.tsx src/components/workflow/task-drawer.tsx src/components/workflow/node-card.tsx src/components/workflow/workflow-command-center.tsx</automated>
  </verify>
  <done>ID visibility behavior is deterministic and mode-dependent across list/drawer/graph.</done>
</task>

<task type="auto">
  <name>Task 3: Add friendly audit timeline rendering with debug fallback</name>
  <files>src/components/workflow/audit-timeline.tsx</files>
  <action>
In normal mode, map known eventType values to human-friendly strings and show timestamps.
Hide raw ids/payload/eventType internals in normal mode.
In debug mode, show existing raw technical details.
Keep deterministic fallback label for unknown event types.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/audit-timeline.tsx</automated>
  </verify>
  <done>Audit timeline is user-friendly by default with operator-grade raw details in debug mode.</done>
</task>

<task type="auto">
  <name>Task 4: Verify UX modes and preserve workflow behavior</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/task-drawer.tsx, src/components/workflow/audit-timeline.tsx</files>
  <action>
Manual deterministic verification:
- debug OFF hides IDs and keeps actions functional
- debug ON reveals IDs and copy/debug fields
- ECO selector drives selection in normal mode
- completion/approval/filter/list/graph behavior remains intact
Document outcomes in phase summary.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>UI-5 delivers friendly default UX without regressing existing workflow operations.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] No backend changes
- [ ] No schema/model changes
- [ ] Debug toggle exists and defaults OFF
- [ ] Debug mode persistence in localStorage works
- [ ] Normal mode hides tenant/eco/task/audit internal IDs
- [ ] Debug mode reveals internal IDs and raw audit detail
- [ ] Friendly labels shown for ECO/tasks/blockers/audit in normal mode
- [ ] ECO selector drives selection in normal mode
- [ ] Complete/approve/reject/list/graph/filter actions remain functional
- [ ] `npm run build` passes
</verification>

<success_criteria>
- UI is approachable for normal users by default
- Operators retain explicit debug visibility when needed
- Existing workflow functionality remains intact
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory with manual mode-toggle verification notes.
</output>
