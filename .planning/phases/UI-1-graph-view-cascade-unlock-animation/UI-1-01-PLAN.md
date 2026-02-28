---
phase: UI-1-graph-view-cascade-unlock-animation
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/workflow/workflow-command-center.tsx
  - src/components/workflow/graph-view.tsx
  - src/components/workflow/node-card.tsx
  - src/components/workflow/edge-layer.tsx
  - src/components/workflow/task-drawer.tsx
  - src/lib/api-client.ts
autonomous: true
requirements:
  - UI1-VIEW-TOGGLE
  - UI1-DETERMINISTIC-GRAPH-LAYOUT
  - UI1-PROJECTION-ONLY-ACTIONABILITY
  - UI1-HOVER-PATH-HIGHLIGHT
  - UI1-CASCADE-UNLOCK-ANIMATION
  - UI1-LIST-VIEW-PRESERVATION
  - UI1-NO-BACKEND-CHANGES
  - UI1-NO-SCHEMA-CHANGES
user_setup: []
must_haves:
  truths:
    - "Command center supports deterministic toggle between List and Graph views."
    - "Graph nodes are derived from projection tasks ordered by tasksTopologicalOrder."
    - "Graph edges are derived directly from projection dependencies."
    - "Graph layout is deterministic and columnar (left-to-right by layer index)."
    - "Layer computation uses longest-path depth only for visual layout."
    - "Eligibility/actionability is not recomputed client-side and uses projection fields (especially canComplete)."
    - "After write actions, projection refetch drives UI updates and animation diff."
    - "newlyReady animation is based only on BLOCKED -> NOT_STARTED state transitions between projection snapshots."
    - "Completed-node animation is based only on projection state diff to DONE."
    - "Hover interactions highlight upstream/downstream paths deterministically."
    - "List view functionality from UI-0 remains intact."
    - "No backend behavior changes and no schema changes are introduced."
    - "Execution remains sequential."
  artifacts:
    - "Graph view component(s) render deterministic nodes/edges with task metadata badges."
    - "Workflow command center wires view toggle, graph interactions, and diff-based animation state."
    - "Optional supporting components isolate node and edge rendering concerns."
  key_links:
    - "Projection remains single source of truth for state and actionability."
    - "Client-side graph math is restricted to layout and highlighting only."
    - "Animation triggers come from previous-vs-next projection diff, not timers/randomness."
---

<objective>
Add a projection-driven graph view with deterministic cascade unlock animations to the workflow command center.

Purpose:
Improve workflow observability and operator ergonomics without introducing client-side business logic recomputation.

Output:
Graph mode, deterministic layout/highlight behaviors, and projection-diff-based visual transitions.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@src/components/workflow/workflow-command-center.tsx
@src/components/workflow/task-row.tsx
@src/components/workflow/task-drawer.tsx
@src/lib/api-client.ts
@src/app/workflow/page.tsx
@src/app/globals.css
@docs/ARCHITECTURE_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add deterministic graph rendering components</name>
  <files>src/components/workflow/graph-view.tsx, src/components/workflow/node-card.tsx, src/components/workflow/edge-layer.tsx</files>
  <action>
Implement graph view primitives:
- deterministic node positioning by layer and stable intra-layer ordering
- SVG edge rendering for dependency links
- node card visual structure with required metadata (state, badges, blocker count, canComplete indicator)
Ensure layout uses projection data only and does not compute eligibility logic.
  </action>
  <verify>
    <automated>npm run lint -- src/components/workflow/graph-view.tsx src/components/workflow/node-card.tsx src/components/workflow/edge-layer.tsx || npm run lint</automated>
  </verify>
  <done>Graph primitives render deterministic topology-aligned task network.</done>
</task>

<task type="auto">
  <name>Task 2: Wire command center toggle, interactions, and diff-driven animations</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/task-drawer.tsx, src/lib/api-client.ts</files>
  <action>
Add List/Graph toggle and integrate graph mode into existing command center workflow.
On projection refetch:
- compute state diff from previous snapshot
- derive newlyReady set (BLOCKED -> NOT_STARTED)
- derive newlyDone set for completion visual transition
Apply subtle framer-motion animations (pulse/glow/fade) based on these sets only.
Add hover highlight behavior for upstream/downstream path emphasis.
Keep complete action behavior identical: backend call then projection refetch.
  </action>
  <verify>
    <automated>npm run lint -- src/components/workflow/workflow-command-center.tsx src/components/workflow/task-drawer.tsx src/lib/api-client.ts || npm run lint</automated>
  </verify>
  <done>Graph interactions and animations are projection-diff-driven and deterministic.</done>
</task>

<task type="auto">
  <name>Task 3: Verify graph/list parity and deterministic behavior</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/graph-view.tsx</files>
  <action>
Perform deterministic verification (manual plus optional light UI/unit assertions if easy):
- graph node count equals projection task count
- edge count equals projection dependency count
- list view remains functional
- completion action in graph/list refetches projection and triggers expected unlock animation for newly ready nodes
- no client-side eligibility recomputation introduced
Document any manual run steps in summary.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>UI-1 behavior is stable, deterministic, and projection-driven across both views.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] No backend behavior changes
- [ ] No schema/model changes
- [ ] List/Graph view toggle works
- [ ] Graph node count matches tasks length
- [ ] Graph edge count matches dependencies length
- [ ] Layout order is deterministic (no random placement)
- [ ] Eligibility/action buttons still rely only on projection canComplete
- [ ] Hover highlights upstream/downstream paths
- [ ] Completion action refetches projection and updates UI state
- [ ] newlyReady animation is driven by BLOCKED -> NOT_STARTED diff only
- [ ] completed node visual transition is driven by projection diff only
- [ ] No timing-flaky assertions added
- [ ] `npm run build` passes
</verification>

<success_criteria>
- UI includes compelling graph mode while preserving projection-driven architecture
- Cascade unlock visual feedback is deterministic and state-diff-based
- Existing list workflow remains reliable and unchanged in behavior
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory.
</output>
