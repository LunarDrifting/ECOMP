import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as instantiatePost } from '@/app/api/ecos/[id]/instantiate/route'
import { POST as completePost } from '@/app/api/tasks/[id]/complete/route'
import { GET as projectionGet } from '@/app/api/ecos/[id]/projection/route'
import * as dbModule from '@/lib/db'
import {
  createBlueprintFixture,
  createTaskFixture,
  createTenantActorsFixture,
} from '../helpers/workflow-fixtures'
import { testPrisma } from '../helpers/test-db'

type RouteContext = { params: Promise<{ id: string }> }
type ProjectionTaskRow = {
  id: string
  upstreamTaskIds: string[]
  downstreamTaskIds: string[]
  blockingTaskIds: string[]
  isReady: boolean
  canComplete: boolean | null
}
type AuditPayload = Record<string, unknown>

async function postInstantiate(body: Record<string, unknown>, ecoId: string) {
  const request = new NextRequest(`http://localhost/api/ecos/${ecoId}/instantiate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const response = await instantiatePost(request, {
    params: Promise.resolve({ id: ecoId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function postComplete(body: Record<string, unknown>, taskId: string) {
  const request = new NextRequest(`http://localhost/api/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const response = await completePost(request, {
    params: Promise.resolve({ id: taskId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function getProjection(args: {
  tenantId: string
  ecoId: string
  actorId?: string
}) {
  const query = new URLSearchParams({ tenantId: args.tenantId })
  if (args.actorId) {
    query.set('actorId', args.actorId)
  }

  const request = new NextRequest(
    `http://localhost/api/ecos/${args.ecoId}/projection?${query.toString()}`,
    { method: 'GET' }
  )

  const response = await projectionGet(request, {
    params: Promise.resolve({ id: args.ecoId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function listAuditEventsForEco(ecoId: string) {
  return testPrisma.auditEvent.findMany({
    where: { ecoId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      eventType: true,
      payload: true,
    },
  })
}

describe.sequential('workflow engine integration', () => {
  it('instantiation creates tasks/dependencies and blocked+ready equals tasksCreated', async () => {
    const actors = await createTenantActorsFixture()
    const fixture = await createBlueprintFixture({
      tenantId: actors.tenantId,
      ownerRoleId: actors.ownerRoleId,
      taskDefinitions: [
        { key: 'a', name: 'Task A' },
        { key: 'b', name: 'Task B' },
      ],
      dependencyDefinitions: [{ fromKey: 'a', toKey: 'b' }],
    })

    const result = await postInstantiate(
      {
        tenantId: actors.tenantId,
        templateVersionId: fixture.templateVersionId,
        actorId: actors.ownerActorId,
      },
      fixture.ecoId
    )

    expect(result.status).toBe(200)
    expect(result.json.tasksCreated).toBeGreaterThan(0)
    expect(result.json.blockedTasks + result.json.readyTasks).toBe(
      result.json.tasksCreated
    )
    expect(result.json.dependenciesCreated).toBe(1)
  })

  it('instantiation emits attempt and success audit events', async () => {
    const actors = await createTenantActorsFixture()
    const fixture = await createBlueprintFixture({
      tenantId: actors.tenantId,
      ownerRoleId: actors.ownerRoleId,
      taskDefinitions: [
        { key: 'a', name: 'Task A' },
        { key: 'b', name: 'Task B' },
      ],
      dependencyDefinitions: [{ fromKey: 'a', toKey: 'b' }],
    })

    const result = await postInstantiate(
      {
        tenantId: actors.tenantId,
        templateVersionId: fixture.templateVersionId,
        actorId: actors.ownerActorId,
      },
      fixture.ecoId
    )

    expect(result.status).toBe(200)

    const events = await listAuditEventsForEco(fixture.ecoId)
    const eventTypes = events.map((event) => event.eventType)
    expect(eventTypes).toContain('INSTANTIATE_ATTEMPT')
    expect(eventTypes).toContain('INSTANTIATE_SUCCESS')
  })

  it('completing a BLOCKED task returns 409', async () => {
    const actors = await createTenantActorsFixture()
    const fixture = await createBlueprintFixture({
      tenantId: actors.tenantId,
      ownerRoleId: actors.ownerRoleId,
      taskDefinitions: [
        { key: 'a', name: 'Task A' },
        { key: 'b', name: 'Task B' },
      ],
      dependencyDefinitions: [{ fromKey: 'a', toKey: 'b' }],
    })

    await postInstantiate(
      {
        tenantId: actors.tenantId,
        templateVersionId: fixture.templateVersionId,
        actorId: actors.ownerActorId,
      },
      fixture.ecoId
    )

    const blockedTask = await testPrisma.task.findFirstOrThrow({
      where: { ecoId: fixture.ecoId, state: 'BLOCKED' },
      select: { id: true },
    })

    const result = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      blockedTask.id
    )

    expect(result.status).toBe(409)
    expect(result.json.error).toContain('BLOCKED')
  })

  it('completion success emits attempt, success, and cascade audit events', async () => {
    const actors = await createTenantActorsFixture()
    const fixture = await createBlueprintFixture({
      tenantId: actors.tenantId,
      ownerRoleId: actors.ownerRoleId,
      taskDefinitions: [
        { key: 'a', name: 'Task A' },
        { key: 'b', name: 'Task B' },
      ],
      dependencyDefinitions: [{ fromKey: 'a', toKey: 'b' }],
    })

    await postInstantiate(
      {
        tenantId: actors.tenantId,
        templateVersionId: fixture.templateVersionId,
        actorId: actors.ownerActorId,
      },
      fixture.ecoId
    )

    const readyTask = await testPrisma.task.findFirstOrThrow({
      where: { ecoId: fixture.ecoId, state: 'NOT_STARTED' },
      select: { id: true },
    })

    const completeResult = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      readyTask.id
    )
    expect(completeResult.status).toBe(200)

    const events = await listAuditEventsForEco(fixture.ecoId)
    const eventTypes = events.map((event) => event.eventType)
    expect(eventTypes).toContain('TASK_COMPLETE_ATTEMPT')
    expect(eventTypes).toContain('TASK_COMPLETE_SUCCESS')
    expect(eventTypes).toContain('CASCADE_RESOLVE')
  })

  it('completion rejection emits attempt and rejected audit events', async () => {
    const actors = await createTenantActorsFixture()
    const fixture = await createBlueprintFixture({
      tenantId: actors.tenantId,
      ownerRoleId: actors.ownerRoleId,
      taskDefinitions: [
        { key: 'a', name: 'Task A' },
        { key: 'b', name: 'Task B' },
      ],
      dependencyDefinitions: [{ fromKey: 'a', toKey: 'b' }],
    })

    await postInstantiate(
      {
        tenantId: actors.tenantId,
        templateVersionId: fixture.templateVersionId,
        actorId: actors.ownerActorId,
      },
      fixture.ecoId
    )

    const blockedTask = await testPrisma.task.findFirstOrThrow({
      where: { ecoId: fixture.ecoId, state: 'BLOCKED' },
      select: { id: true },
    })

    const completeResult = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      blockedTask.id
    )
    expect(completeResult.status).toBe(409)

    const events = await listAuditEventsForEco(fixture.ecoId)
    const eventTypes = events.map((event) => event.eventType)
    expect(eventTypes).toContain('TASK_COMPLETE_ATTEMPT')
    expect(eventTypes).toContain('TASK_COMPLETE_REJECTED')

    const rejectedEvent = events.find(
      (event) => event.eventType === 'TASK_COMPLETE_REJECTED'
    )
    const rejectedPayload = (rejectedEvent?.payload ?? {}) as AuditPayload
    expect(rejectedPayload.reasonCode).toBe('TASK_BLOCKED')
  })

  it('completing a NOT_STARTED task succeeds and unblocks downstream when applicable', async () => {
    const actors = await createTenantActorsFixture()
    const fixture = await createBlueprintFixture({
      tenantId: actors.tenantId,
      ownerRoleId: actors.ownerRoleId,
      taskDefinitions: [
        { key: 'a', name: 'Task A' },
        { key: 'b', name: 'Task B' },
      ],
      dependencyDefinitions: [{ fromKey: 'a', toKey: 'b' }],
    })

    await postInstantiate(
      {
        tenantId: actors.tenantId,
        templateVersionId: fixture.templateVersionId,
        actorId: actors.ownerActorId,
      },
      fixture.ecoId
    )

    const readyTask = await testPrisma.task.findFirstOrThrow({
      where: { ecoId: fixture.ecoId, state: 'NOT_STARTED' },
      select: { id: true },
    })

    const blockedTask = await testPrisma.task.findFirstOrThrow({
      where: { ecoId: fixture.ecoId, state: 'BLOCKED' },
      select: { id: true },
    })

    const result = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      readyTask.id
    )

    expect(result.status).toBe(200)
    expect(result.json.taskMarkedDone).toBe(true)
    expect(result.json.tasksUnblocked).toBeGreaterThanOrEqual(1)

    const unblockedTask = await testPrisma.task.findFirstOrThrow({
      where: { id: blockedTask.id },
      select: { state: true },
    })

    expect(unblockedTask.state).toBe('NOT_STARTED')
  })

  it('re-completing a DONE task is idempotent', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Idempotent ECO', tenantId: actors.tenantId },
    })

    const task = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Idempotent task',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })

    const first = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      task.id
    )
    expect(first.status).toBe(200)
    expect(first.json.taskMarkedDone).toBe(true)

    const second = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      task.id
    )

    expect(second.status).toBe(200)
    expect(second.json.taskMarkedDone).toBe(false)
  })

  it('approval policy failure returns canonical 409 and does not mutate state', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Approval ECO', tenantId: actors.tenantId },
    })

    const task = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Needs approval',
      state: 'NOT_STARTED',
      approvalPolicy: 'SINGLE',
    })

    const result = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      task.id
    )

    expect(result.status).toBe(409)
    expect(result.json.error).toBe('Approval policy requirements not satisfied')

    const state = await testPrisma.task.findFirstOrThrow({
      where: { id: task.id },
      select: { state: true },
    })

    expect(state.state).toBe('NOT_STARTED')
  })

  it('gate failure returns 409 and does not mutate state', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Gate ECO', tenantId: actors.tenantId },
    })

    const task = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Gate task',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })

    await testPrisma.gate.create({
      data: {
        taskId: task.id,
        tenantId: actors.tenantId,
        type: 'PRECONDITION',
        condition: { allow: false },
      },
    })

    const result = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      task.id
    )

    expect(result.status).toBe(409)

    const state = await testPrisma.task.findFirstOrThrow({
      where: { id: task.id },
      select: { state: true },
    })

    expect(state.state).toBe('NOT_STARTED')
  })

  it('cyclic blueprint rejection performs no partial writes', async () => {
    const actors = await createTenantActorsFixture()
    const fixture = await createBlueprintFixture({
      tenantId: actors.tenantId,
      ownerRoleId: actors.ownerRoleId,
      taskDefinitions: [
        { key: 'a', name: 'Task A' },
        { key: 'b', name: 'Task B' },
      ],
      dependencyDefinitions: [
        { fromKey: 'a', toKey: 'b' },
        { fromKey: 'b', toKey: 'a' },
      ],
    })

    const result = await postInstantiate(
      {
        tenantId: actors.tenantId,
        templateVersionId: fixture.templateVersionId,
        actorId: actors.ownerActorId,
      },
      fixture.ecoId
    )

    expect(result.status).toBe(409)
    expect(result.json.error).toBe('Invalid blueprint: circular dependency detected')

    const ecoPlanCount = await testPrisma.eCOPlan.count({
      where: { ecoId: fixture.ecoId },
    })
    const taskCount = await testPrisma.task.count({
      where: { ecoId: fixture.ecoId },
    })
    const dependencyCount = await testPrisma.dependency.count({
      where: {
        OR: [{ fromTask: { ecoId: fixture.ecoId } }, { toTask: { ecoId: fixture.ecoId } }],
      },
    })

    expect(ecoPlanCount).toBe(0)
    expect(taskCount).toBe(0)
    expect(dependencyCount).toBe(0)
  })

  it('completing a root task performs deterministic multi-hop cascade resolution', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Cascade ECO', tenantId: actors.tenantId },
    })

    const rootTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'A-root',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })

    const doneBridgeTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'B-done-bridge',
      state: 'DONE',
      approvalPolicy: 'NONE',
    })

    const twoHopBlockedTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'C-two-hop-blocked',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })

    const directBlockedTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'G-direct-blocked',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })

    const stillBlockedTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'D-should-stay-blocked',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })

    await testPrisma.dependency.createMany({
      data: [
        {
          fromTaskId: rootTask.id,
          toTaskId: doneBridgeTask.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
        {
          fromTaskId: doneBridgeTask.id,
          toTaskId: twoHopBlockedTask.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
        {
          fromTaskId: rootTask.id,
          toTaskId: directBlockedTask.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
        {
          fromTaskId: twoHopBlockedTask.id,
          toTaskId: stillBlockedTask.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
      ],
    })

    const result = await postComplete(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
      },
      rootTask.id
    )

    expect(result.status).toBe(200)
    expect(result.json.taskMarkedDone).toBe(true)
    expect(result.json.tasksUnblocked).toBe(2)

    const expectedUnblockedIds = [directBlockedTask.id, twoHopBlockedTask.id].sort()
    expect(result.json.unblockedTaskIds).toEqual(expectedUnblockedIds)

    const finalStates = await testPrisma.task.findMany({
      where: {
        id: {
          in: [twoHopBlockedTask.id, directBlockedTask.id, stillBlockedTask.id],
        },
      },
      select: { id: true, state: true },
    })
    const stateById = new Map(finalStates.map((row) => [row.id, row.state]))

    expect(stateById.get(twoHopBlockedTask.id)).toBe('NOT_STARTED')
    expect(stateById.get(directBlockedTask.id)).toBe('NOT_STARTED')
    expect(stateById.get(stillBlockedTask.id)).toBe('BLOCKED')
  })

  it('injected mid-cascade failure rolls back DONE and unblock writes atomically', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Rollback ECO', tenantId: actors.tenantId },
    })

    const rootTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Rollback root',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })

    const blockedTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Rollback blocked child',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })

    await testPrisma.dependency.create({
      data: {
        fromTaskId: rootTask.id,
        toTaskId: blockedTask.id,
        type: 'FINISH_TO_START',
        lagMinutes: 0,
      },
    })

    const realTenantDb = dbModule.tenantDb
    const tenantDbSpy = vi.spyOn(dbModule, 'tenantDb')
    tenantDbSpy.mockImplementation((tenantId, dbClient) => {
      const scoped = realTenantDb(tenantId, dbClient)

      if (!dbClient) {
        return scoped
      }

      return {
        ...scoped,
        task: {
          ...scoped.task,
          setNotStartedByIdsForUnblocking: async () => {
            throw new Error('Injected cascade failure')
          },
        },
      }
    })

    try {
      const result = await postComplete(
        {
          tenantId: actors.tenantId,
          actorId: actors.ownerActorId,
        },
        rootTask.id
      )

      expect(result.status).toBe(500)
      expect(result.json.error).toBe('Injected cascade failure')
    } finally {
      tenantDbSpy.mockRestore()
    }

    const reloaded = await testPrisma.task.findMany({
      where: { id: { in: [rootTask.id, blockedTask.id] } },
      select: { id: true, state: true },
    })
    const stateById = new Map(reloaded.map((row) => [row.id, row.state]))

    expect(stateById.get(rootTask.id)).toBe('NOT_STARTED')
    expect(stateById.get(blockedTask.id)).toBe('BLOCKED')
  })

  it('projection returns graph fields and counts deterministically', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Projection Graph ECO', tenantId: actors.tenantId },
    })

    const taskA = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'A',
      state: 'DONE',
      approvalPolicy: 'NONE',
    })
    const taskB = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'B',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })
    const taskC = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'C',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })
    const taskD = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'D',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })

    await testPrisma.dependency.createMany({
      data: [
        {
          fromTaskId: taskA.id,
          toTaskId: taskB.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
        {
          fromTaskId: taskA.id,
          toTaskId: taskC.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
      ],
    })

    const result = await getProjection({
      tenantId: actors.tenantId,
      ecoId: eco.id,
    })

    expect(result.status).toBe(200)
    expect(result.json.tasksTopologicalOrder).toEqual([
      taskA.id,
      taskD.id,
      taskB.id,
      taskC.id,
    ])
    expect(result.json.counts).toEqual({
      totalTasks: 4,
      doneTasks: 1,
      blockedTasks: 1,
      readyTasks: 2,
    })

    const taskById = new Map(
      (result.json.tasks as ProjectionTaskRow[]).map((task) => [task.id, task])
    )

    expect(taskById.get(taskB.id).upstreamTaskIds).toEqual([taskA.id])
    expect(taskById.get(taskA.id).downstreamTaskIds).toEqual([taskB.id, taskC.id])
    expect(taskById.get(taskB.id).blockingTaskIds).toEqual([])
    expect(taskById.get(taskB.id).isReady).toBe(false)
    expect(taskById.get(taskD.id).upstreamTaskIds).toEqual([])
    expect(taskById.get(taskD.id).isReady).toBe(true)
    expect(taskById.get(taskC.id).canComplete).toBeNull()
  })

  it('projection with actorId computes canComplete from state, RBAC, approvals, and gates', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Projection CanComplete ECO', tenantId: actors.tenantId },
    })

    const blockedTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Blocked',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })
    const approvedTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Approved',
      state: 'NOT_STARTED',
      approvalPolicy: 'SINGLE',
    })
    const approvalMissingTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Approval Missing',
      state: 'NOT_STARTED',
      approvalPolicy: 'SINGLE',
    })
    const gateFailTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Gate Fail',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })
    const rbacDeniedTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.outsiderRoleId,
      name: 'RBAC Denied',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })

    await testPrisma.approval.create({
      data: {
        taskId: approvedTask.id,
        actorId: actors.ownerActorId,
        tenantId: actors.tenantId,
        decision: 'APPROVED',
      },
    })

    await testPrisma.gate.createMany({
      data: [
        {
          taskId: approvedTask.id,
          tenantId: actors.tenantId,
          type: 'PRECONDITION',
          condition: { allow: true },
        },
        {
          taskId: approvalMissingTask.id,
          tenantId: actors.tenantId,
          type: 'PRECONDITION',
          condition: { allow: true },
        },
        {
          taskId: gateFailTask.id,
          tenantId: actors.tenantId,
          type: 'PRECONDITION',
          condition: { allow: false },
        },
      ],
    })

    const result = await getProjection({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      actorId: actors.ownerActorId,
    })

    expect(result.status).toBe(200)
    const taskById = new Map(
      (result.json.tasks as ProjectionTaskRow[]).map((task) => [task.id, task])
    )

    expect(taskById.get(blockedTask.id).canComplete).toBe(false)
    expect(taskById.get(approvedTask.id).canComplete).toBe(true)
    expect(taskById.get(approvalMissingTask.id).canComplete).toBe(false)
    expect(taskById.get(gateFailTask.id).canComplete).toBe(false)
    expect(taskById.get(rbacDeniedTask.id).canComplete).toBe(false)
  })

  it('concurrent completion of same NOT_STARTED task yields exactly one done_marked result', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Concurrent Same Task ECO', tenantId: actors.tenantId },
    })

    const rootTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Concurrent Root',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })
    const downstreamTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Concurrent Child',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })

    await testPrisma.dependency.create({
      data: {
        fromTaskId: rootTask.id,
        toTaskId: downstreamTask.id,
        type: 'FINISH_TO_START',
        lagMinutes: 0,
      },
    })

    const [first, second] = await Promise.all([
      postComplete(
        { tenantId: actors.tenantId, actorId: actors.ownerActorId },
        rootTask.id
      ),
      postComplete(
        { tenantId: actors.tenantId, actorId: actors.ownerActorId },
        rootTask.id
      ),
    ])

    const results = [first, second]
    const okResults = results.filter((result) => result.status === 200)
    expect(okResults.length).toBe(2)

    const doneMarkedCount = okResults.filter(
      (result) => result.json.taskMarkedDone === true
    ).length
    const noopCount = okResults.filter(
      (result) =>
        result.json.taskMarkedDone === false &&
        result.json.status === 'noop_already_done'
    ).length
    expect(doneMarkedCount).toBe(1)
    expect(noopCount).toBe(1)

    const totalUnblocked = okResults.reduce(
      (sum, result) => sum + (result.json.tasksUnblocked as number),
      0
    )
    expect(totalUnblocked).toBe(1)

    const finalStates = await testPrisma.task.findMany({
      where: { id: { in: [rootTask.id, downstreamTask.id] } },
      select: { id: true, state: true },
    })
    const stateById = new Map(finalStates.map((row) => [row.id, row.state]))
    expect(stateById.get(rootTask.id)).toBe('DONE')
    expect(stateById.get(downstreamTask.id)).toBe('NOT_STARTED')
  })

  it('concurrent completion of upstream prerequisites unblocks shared downstream exactly once', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Concurrent Prereq ECO', tenantId: actors.tenantId },
    })

    const upstreamA = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Prereq A',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })
    const upstreamB = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Prereq B',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })
    const downstream = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Shared Downstream',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })

    await testPrisma.dependency.createMany({
      data: [
        {
          fromTaskId: upstreamA.id,
          toTaskId: downstream.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
        {
          fromTaskId: upstreamB.id,
          toTaskId: downstream.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
      ],
    })

    const seededStates = await testPrisma.task.findMany({
      where: { id: { in: [upstreamA.id, upstreamB.id, downstream.id] } },
      select: { id: true, state: true },
    })
    const seededStateById = new Map(seededStates.map((row) => [row.id, row.state]))
    expect(seededStateById.get(upstreamA.id)).toBe('NOT_STARTED')
    expect(seededStateById.get(upstreamB.id)).toBe('NOT_STARTED')
    expect(seededStateById.get(downstream.id)).toBe('BLOCKED')

    const completionA = postComplete(
      { tenantId: actors.tenantId, actorId: actors.adminActorId },
      upstreamA.id
    )
    await new Promise((resolve) => setTimeout(resolve, 250))
    const completionB = postComplete(
      { tenantId: actors.tenantId, actorId: actors.adminActorId },
      upstreamB.id
    )

    const [resultA, resultB] = await Promise.all([completionA, completionB])

    expect(resultA.status).toBe(200)
    expect(resultB.status).toBe(200)
    expect(resultA.json.taskMarkedDone).toBe(true)
    expect(resultB.json.taskMarkedDone).toBe(true)

    const totalUnblocked =
      (resultA.json.tasksUnblocked as number) + (resultB.json.tasksUnblocked as number)
    expect(totalUnblocked).toBe(1)

    const finalStates = await testPrisma.task.findMany({
      where: { id: { in: [upstreamA.id, upstreamB.id, downstream.id] } },
      select: { id: true, state: true },
    })
    const stateById = new Map(finalStates.map((row) => [row.id, row.state]))

    expect(stateById.get(upstreamA.id)).toBe('DONE')
    expect(stateById.get(upstreamB.id)).toBe('DONE')
    expect(stateById.get(downstream.id)).toBe('NOT_STARTED')
  })

  it('concurrent completion attempts for BLOCKED task reject deterministically', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Concurrent Blocked ECO', tenantId: actors.tenantId },
    })

    const blockedTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Blocked Concurrent',
      state: 'BLOCKED',
      approvalPolicy: 'NONE',
    })

    const [first, second] = await Promise.all([
      postComplete(
        { tenantId: actors.tenantId, actorId: actors.ownerActorId },
        blockedTask.id
      ),
      postComplete(
        { tenantId: actors.tenantId, actorId: actors.ownerActorId },
        blockedTask.id
      ),
    ])

    expect(first.status).toBe(409)
    expect(second.status).toBe(409)
    expect(first.json.error).toContain('BLOCKED')
    expect(second.json.error).toContain('BLOCKED')

    const task = await testPrisma.task.findFirstOrThrow({
      where: { id: blockedTask.id },
      select: { state: true },
    })
    expect(task.state).toBe('BLOCKED')
  })
})
