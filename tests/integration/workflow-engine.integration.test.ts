import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as instantiatePost } from '@/app/api/ecos/[id]/instantiate/route'
import { POST as completePost } from '@/app/api/tasks/[id]/complete/route'
import {
  createBlueprintFixture,
  createTaskFixture,
  createTenantActorsFixture,
} from '../helpers/workflow-fixtures'
import { testPrisma } from '../helpers/test-db'

type RouteContext = { params: Promise<{ id: string }> }

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
})
