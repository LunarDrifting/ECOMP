# Phase UI-1: Graph View + Cascade Unlock Animation (Projection-Driven) - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning
**Source:** User-provided phase goal and constraints

<domain>
## Phase Boundary

Add a deterministic graph view mode to the workflow command center, with projection-diff-driven visual unlock animations after completion actions.

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- No backend changes.
- No schema changes.
- UI remains projection-driven.
- UI must not recompute workflow eligibility logic (dependency/approval/gate decisions remain server-derived).
- After write actions, refetch projection and derive animation from previous vs next projection diff only.
- Deterministic layout and ordering only.
- No timing-flaky tests.
- Execution remains sequential.

### View Modes
- Keep existing List view from UI-0.
- Add Graph view toggle in command center.

### Graph Rules
- Nodes = tasks in `tasksTopologicalOrder`.
- Edges = runtime dependencies (`fromTaskId -> toTaskId`).
- Layout = deterministic columnar left-to-right:
  - layer index computed as longest-path depth over topo order and upstream references
  - within each layer, stable sort by topo index (fallback deterministic id compare if needed)
- Client-side layer computation is allowed for layout only.
- Eligibility/actionability must still come from projection fields (`canComplete`, badges, blocker count).

### Node & Edge Rendering
- Node card includes:
  - name
  - state badge
  - requiresApproval / requiresPrecondition badges
  - canComplete indicator
  - blocker count
- Edges rendered with deterministic SVG paths.

### Interaction Rules
- Hover node highlights:
  - upstream path (incoming)
  - downstream path (outgoing)
- Click node opens existing task detail drawer.

### Animation Rules
- On completion action:
  - refetch projection
  - compare old vs new task states
  - `newlyReady = BLOCKED -> NOT_STARTED`
- Animate:
  - newly ready nodes with pulse/glow (~1.5s visual)
  - completed node fading to DONE style
- Animation triggers must come from projection diff only.
- No random values or `Date.now()`-driven logic.

### Testing/Verification Expectations
- Keep backend integration tests unchanged in nature.
- Add minimal UI unit tests only if straightforward; otherwise use deterministic manual verification steps.
- Build must pass in normal environment.

### Claude's Discretion
- Exact component decomposition for graph primitives.
- Exact Tailwind motion style values so long as behavior remains deterministic and subtle.

</decisions>

<specifics>
## Specific Ideas

- Create dedicated `graph-view.tsx` with pure layout function and memoized adjacency maps.
- Reuse existing action handlers and refetch pipeline from UI-0 command center.
- Track previous projection snapshot in component state to compute `newlyReady` and `completedNow` sets.

</specifics>

<deferred>
## Deferred Ideas

- Pan/zoom canvas behavior.
- Auto-routing edge avoidance.
- Graph clustering/grouping by milestone/subtree.
- Advanced animation choreography.

</deferred>

---
