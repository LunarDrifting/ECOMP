---
phase: UI-2-graph-visual-upgrade-motion-polish
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/workflow/graph-view.tsx
  - src/components/workflow/edge-layer.tsx
  - src/components/workflow/node-card.tsx
  - src/components/workflow/workflow-command-center.tsx
  - src/components/workflow/graph-controls.tsx
autonomous: true
requirements:
  - UI2-CURVED-ARROW-EDGES
  - UI2-CASCADE-WAVE-ANIMATION
  - UI2-NODE-VISUAL-UPGRADE
  - UI2-HOVER-HIGHLIGHT-DIM
  - UI2-TOOLTIP-METADATA
  - UI2-OPTIONAL-ZOOM-PAN
  - UI2-DETERMINISTIC-LAYOUT-MOTION
  - UI2-PROJECTION-ONLY-ACTIONABILITY
  - UI2-NO-BACKEND-CHANGES
  - UI2-NO-SCHEMA-CHANGES
user_setup: []
must_haves:
  truths:
    - "Graph edges are rendered as deterministic cubic-bezier paths with directional arrowheads."
    - "Edge states include default, hover-highlight, and cascade-wave animation states."
    - "Cascade-wave animation is derived only from projection diff sets and interaction state."
    - "Node styling is upgraded with deterministic state visuals for DONE, READY, and BLOCKED."
    - "Node actionability indicator uses projection `canComplete` only and does not recompute eligibility logic."
    - "Hovering a node highlights upstream/downstream paths and dims unrelated nodes deterministically."
    - "Node hover tooltips show counts/flags sourced from projection fields."
    - "Optional zoom/pan remains client-only and deterministic (no persistence, no backend writes)."
    - "List view behavior remains unchanged."
    - "No backend behavior changes and no schema/model changes are introduced."
    - "Execution remains sequential."
  artifacts:
    - "Graph rendering layer supports curved arrow edges and edge-state styling."
    - "Node card component supports upgraded visual states and metadata tooltip."
    - "Command center wiring passes deterministic diff sets to graph for wave animation."
    - "Optional graph controls expose zoom/pan/reset interactions."
  key_links:
    - "Projection remains the single source of truth for state and actionability."
    - "Client-side graph computation is limited to visual layout, highlighting, and animation targeting."
    - "All motion triggers are deterministic from diff state, not random or recomputed business logic."
---

<objective>
Upgrade graph view visuals and motion polish to a premium operator experience while preserving deterministic, projection-driven behavior.

Purpose:
Improve workflow readability and interaction feedback without changing backend semantics.

Output:
Curved arrow edges, cascade-wave animations, upgraded node cards, and optional zoom/pan controls.
</objective>

<execution_context>
Use standard GSD execute workflow and summary template.
</execution_context>

<context>
@src/components/workflow/workflow-command-center.tsx
@src/components/workflow/graph-view.tsx
@src/components/workflow/task-drawer.tsx
@src/lib/api-client.ts
@src/app/workflow/page.tsx
@src/app/globals.css
@docs/ARCHITECTURE_CONTRACT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Upgrade edge rendering with curved arrows and animation states</name>
  <files>src/components/workflow/graph-view.tsx, src/components/workflow/edge-layer.tsx</files>
  <action>
Implement edge-layer rendering with deterministic cubic bezier paths and arrowhead markers.
Add edge-state styling:
- default light gray
- hover-path highlight accent
- cascade-wave animation style (moving dash + glow) for edges selected by diff sets.
Ensure edge animation selection is deterministic and derived from completion/refetch diff only.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/graph-view.tsx src/components/workflow/edge-layer.tsx</automated>
  </verify>
  <done>Graph edges are directional, curved, and support deterministic highlight/wave states.</done>
</task>

<task type="auto">
  <name>Task 2: Upgrade node cards and hover interaction polish</name>
  <files>src/components/workflow/graph-view.tsx, src/components/workflow/node-card.tsx</files>
  <action>
Create/refine node card presentation:
- improved typography and spacing
- state pill + compact badges
- DONE / READY / BLOCKED visual treatments
- canComplete actionable glow vs muted state
Add hover behavior:
- highlight related nodes/edges (upstream + downstream)
- dim unrelated nodes deterministically
- show tooltip with upstream/downstream counts, blocker count, approval/precondition flags, and canComplete status.
Maintain click-to-open drawer behavior.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/graph-view.tsx src/components/workflow/node-card.tsx</automated>
  </verify>
  <done>Node visuals and hover interactions are polished and deterministic.</done>
</task>

<task type="auto">
  <name>Task 3: Wire deterministic cascade-wave triggers and optional zoom/pan controls</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/graph-view.tsx, src/components/workflow/graph-controls.tsx</files>
  <action>
Use existing `completedTaskIds` and `newlyReadyTaskIds` projection diff sets to derive wave-target edges and animate for ~1.5s.
Add optional deterministic zoom/pan interactions:
- wheel zoom
- drag pan
- reset button
Do not persist viewport state.
Keep list view unaffected and maintain existing complete->refetch flow.
  </action>
  <verify>
    <automated>npx eslint src/components/workflow/workflow-command-center.tsx src/components/workflow/graph-view.tsx src/components/workflow/graph-controls.tsx</automated>
  </verify>
  <done>Wave animation and optional camera controls are wired without altering projection semantics.</done>
</task>

<task type="auto">
  <name>Task 4: Deterministic verification and phase summary</name>
  <files>src/components/workflow/workflow-command-center.tsx, src/components/workflow/graph-view.tsx</files>
  <action>
Perform manual deterministic verification:
- graph node count equals projection task count
- edge count equals projection dependency count
- hover path highlight + unrelated dim behavior works
- completion triggers wave edges + newlyReady node pulse
- list view behavior unchanged
Document manual verification steps/results in phase summary.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>Visual upgrade verified and documented with deterministic behavior evidence.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] No backend behavior changes
- [ ] No schema/model changes
- [ ] Graph edges are curved and directional with arrowheads
- [ ] Hover path highlight works for upstream/downstream edges
- [ ] Unrelated nodes dim during hover focus
- [ ] Cascade-wave edge animation triggers only from projection diff sets
- [ ] Newly ready nodes still animate from BLOCKED -> NOT_STARTED diff
- [ ] Node visuals reflect DONE/READY/BLOCKED states clearly
- [ ] canComplete visual treatment relies only on projection field
- [ ] Optional zoom/pan (if implemented) is deterministic and resettable
- [ ] List view remains unaffected
- [ ] No random/timing-flaky animation logic introduced
- [ ] `npm run build` passes
</verification>

<success_criteria>
- Graph view feels visually polished and premium
- Motion feedback for cascade unlock is clear and deterministic
- Projection-driven architecture is preserved with zero backend/schema changes
</success_criteria>

<output>
After completion, create the phase summary file for plan "01" in this phase directory with manual verification steps and outcomes.
</output>
