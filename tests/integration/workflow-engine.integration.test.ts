import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as instantiatePost } from '@/app/api/ecos/[id]/instantiate/route'
import { POST as completePost } from '@/app/api/tasks/[id]/complete/route'
import { POST as approvalPost } from '@/app/api/tasks/[id]/approvals/route'
import { GET as ecosGet, POST as ecosPost } from '@/app/api/ecos/route'
import { GET as templateVersionsGet } from '@/app/api/template-versions/route'
import { GET as projectionGet } from '@/app/api/ecos/[id]/projection/route'
import { GET as auditGet } from '@/app/api/ecos/[id]/audit/route'
import { POST as taskOrderPost } from '@/app/api/ecos/[id]/task-order/route'
import { POST as validateTemplateVersionPost } from '@/app/api/template-versions/[id]/validate/route'
import { POST as publishTemplateVersionPost } from '@/app/api/template-versions/[id]/publish/route'
import { GET as templateTasksGet } from '@/app/api/template-versions/[id]/tasks/route'
import { GET as templateDependenciesGet } from '@/app/api/template-versions/[id]/dependencies/route'
import { PATCH as taskPatch } from '@/app/api/tasks/[id]/route'
import * as dbModule from '@/lib/db'
import { applyDeterministicTaskOrder, getLatestSavedTaskOrder } from '@/components/workflow/task-order'
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

async function postApproval(body: Record<string, unknown>, taskId: string) {
  const request = new NextRequest(`http://localhost/api/tasks/${taskId}/approvals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const response = await approvalPost(request, {
    params: Promise.resolve({ id: taskId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function getEcos(tenantId: string) {
  const query = new URLSearchParams({ tenantId })
  const request = new NextRequest(`http://localhost/api/ecos?${query.toString()}`, {
    method: 'GET',
  })

  const response = await ecosGet(request)
  return {
    status: response.status,
    json: await response.json(),
  }
}

async function postEcos(body: Record<string, unknown>) {
  const request = new NextRequest('http://localhost/api/ecos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const response = await ecosPost(request)
  return {
    status: response.status,
    json: await response.json(),
  }
}

async function getTemplateVersions(tenantId: string) {
  const query = new URLSearchParams({ tenantId })
  const request = new NextRequest(
    `http://localhost/api/template-versions?${query.toString()}`,
    { method: 'GET' }
  )

  const response = await templateVersionsGet(request)
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

async function getAudit(args: { tenantId: string; ecoId: string }) {
  const query = new URLSearchParams({ tenantId: args.tenantId })
  const request = new NextRequest(
    `http://localhost/api/ecos/${args.ecoId}/audit?${query.toString()}`,
    { method: 'GET' }
  )

  const response = await auditGet(request, {
    params: Promise.resolve({ id: args.ecoId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function postTaskOrder(body: Record<string, unknown>, ecoId: string) {
  const request = new NextRequest(`http://localhost/api/ecos/${ecoId}/task-order`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const response = await taskOrderPost(request, {
    params: Promise.resolve({ id: ecoId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function patchTask(body: Record<string, unknown>, taskId: string) {
  const request = new NextRequest(`http://localhost/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const response = await taskPatch(request, {
    params: Promise.resolve({ id: taskId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function postValidateTemplateVersion(body: Record<string, unknown>, templateVersionId: string) {
  const request = new NextRequest(
    `http://localhost/api/template-versions/${templateVersionId}/validate`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  const response = await validateTemplateVersionPost(request, {
    params: Promise.resolve({ id: templateVersionId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function postPublishTemplateVersion(body: Record<string, unknown>, templateVersionId: string) {
  const request = new NextRequest(
    `http://localhost/api/template-versions/${templateVersionId}/publish`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  const response = await publishTemplateVersionPost(request, {
    params: Promise.resolve({ id: templateVersionId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function getTemplateTasks(args: { tenantId: string; templateVersionId: string }) {
  const query = new URLSearchParams({ tenantId: args.tenantId })
  const request = new NextRequest(
    `http://localhost/api/template-versions/${args.templateVersionId}/tasks?${query.toString()}`,
    { method: 'GET' }
  )

  const response = await templateTasksGet(request, {
    params: Promise.resolve({ id: args.templateVersionId }),
  } as RouteContext)

  return {
    status: response.status,
    json: await response.json(),
  }
}

async function getTemplateDependencies(args: { tenantId: string; templateVersionId: string }) {
  const query = new URLSearchParams({ tenantId: args.tenantId })
  const request = new NextRequest(
    `http://localhost/api/template-versions/${args.templateVersionId}/dependencies?${query.toString()}`,
    { method: 'GET' }
  )

  const response = await templateDependenciesGet(request, {
    params: Promise.resolve({ id: args.templateVersionId }),
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
  it('POST /api/ecos creates tenant-scoped ECO and returns ecoId', async () => {
    const actors = await createTenantActorsFixture()

    const result = await postEcos({
      tenantId: actors.tenantId,
      title: 'Intake-created ECO',
    })

    expect(result.status).toBe(200)
    expect(typeof result.json.ecoId).toBe('string')
    expect(result.json.ecoId.length).toBeGreaterThan(0)

    const persisted = await testPrisma.eCO.findFirst({
      where: {
        id: result.json.ecoId,
        tenantId: actors.tenantId,
      },
      select: {
        id: true,
        title: true,
      },
    })

    expect(persisted?.id).toBe(result.json.ecoId)
    expect(persisted?.title).toBe('Intake-created ECO')

    const listResult = await getEcos(actors.tenantId)
    expect(listResult.status).toBe(200)
    expect(
      listResult.json.ecos.some((row: { id: string }) => row.id === result.json.ecoId)
    ).toBe(true)
  })

  it('GET /api/template-versions returns published versions for tenant only', async () => {
    const tenantA = await createTenantActorsFixture()
    const tenantB = await createTenantActorsFixture()

    const templateA = await testPrisma.template.create({
      data: {
        tenantId: tenantA.tenantId,
        name: 'Tenant A Template',
      },
    })
    const templateB = await testPrisma.template.create({
      data: {
        tenantId: tenantB.tenantId,
        name: 'Tenant B Template',
      },
    })

    const publishedA = await testPrisma.templateVersion.create({
      data: {
        templateId: templateA.id,
        version: 'v1',
        isPublished: true,
      },
    })
    await testPrisma.templateVersion.create({
      data: {
        templateId: templateA.id,
        version: 'draft-a',
        isPublished: false,
      },
    })
    await testPrisma.templateVersion.create({
      data: {
        templateId: templateB.id,
        version: 'v1',
        isPublished: true,
      },
    })

    const result = await getTemplateVersions(tenantA.tenantId)
    expect(result.status).toBe(200)

    const returnedIds = result.json.templateVersions.map((row: { id: string }) => row.id)
    expect(returnedIds).toContain(publishedA.id)
    expect(result.json.templateVersions.every((row: { isPublished: boolean }) => row.isPublished)).toBe(true)
    expect(
      result.json.templateVersions.every(
        (row: { templateName: string }) => row.templateName === 'Tenant A Template'
      )
    ).toBe(true)
  })

  it('template validate rejects cyclic blueprint graph', async () => {
    const actors = await createTenantActorsFixture()
    const template = await testPrisma.template.create({
      data: {
        tenantId: actors.tenantId,
        name: 'Validate Cycle Template',
      },
    })
    const templateVersion = await testPrisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 'draft-cycle',
        isPublished: false,
      },
    })
    const definitionA = await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: actors.tenantId,
        name: 'A',
        taskLevel: 'STEP',
        ownerRoleId: actors.ownerRoleId,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
    })
    const definitionB = await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: actors.tenantId,
        name: 'B',
        taskLevel: 'STEP',
        ownerRoleId: actors.ownerRoleId,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
    })
    await testPrisma.templateDependencyDefinition.createMany({
      data: [
        {
          templateVersionId: templateVersion.id,
          tenantId: actors.tenantId,
          fromDefinitionId: definitionA.id,
          toDefinitionId: definitionB.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
        {
          templateVersionId: templateVersion.id,
          tenantId: actors.tenantId,
          fromDefinitionId: definitionB.id,
          toDefinitionId: definitionA.id,
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
      ],
    })

    const result = await postValidateTemplateVersion(
      { tenantId: actors.tenantId },
      templateVersion.id
    )

    expect(result.status).toBe(200)
    expect(result.json.ok).toBe(false)
    expect(result.json.errors.some((error: { code: string }) => error.code === 'CYCLE')).toBe(
      true
    )
  })

  it('template publish is blocked when validation fails', async () => {
    const actors = await createTenantActorsFixture()
    const template = await testPrisma.template.create({
      data: {
        tenantId: actors.tenantId,
        name: 'Publish Blocked Template',
      },
    })
    const templateVersion = await testPrisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 'draft-invalid',
        isPublished: false,
      },
    })
    const definitionA = await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: actors.tenantId,
        name: 'A',
        taskLevel: 'STEP',
        ownerRoleId: actors.ownerRoleId,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
    })
    await testPrisma.templateDependencyDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: actors.tenantId,
        fromDefinitionId: definitionA.id,
        toDefinitionId: definitionA.id,
        type: 'FINISH_TO_START',
        lagMinutes: 0,
      },
    })

    const publishResult = await postPublishTemplateVersion(
      { tenantId: actors.tenantId },
      templateVersion.id
    )
    expect(publishResult.status).toBe(409)
    expect(publishResult.json.error).toBe('Template validation failed')

    const persisted = await testPrisma.templateVersion.findUniqueOrThrow({
      where: { id: templateVersion.id },
      select: { isPublished: true },
    })
    expect(persisted.isPublished).toBe(false)
  })

  it('template publish succeeds when validation passes and is idempotent on repeat', async () => {
    const actors = await createTenantActorsFixture()
    const template = await testPrisma.template.create({
      data: {
        tenantId: actors.tenantId,
        name: 'Publish Success Template',
      },
    })
    const templateVersion = await testPrisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: 'draft-valid',
        isPublished: false,
      },
    })
    const definitionA = await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: actors.tenantId,
        name: 'A',
        taskLevel: 'STEP',
        ownerRoleId: actors.ownerRoleId,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
    })
    const definitionB = await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: actors.tenantId,
        name: 'B',
        taskLevel: 'STEP',
        ownerRoleId: actors.ownerRoleId,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
    })
    await testPrisma.templateDependencyDefinition.create({
      data: {
        templateVersionId: templateVersion.id,
        tenantId: actors.tenantId,
        fromDefinitionId: definitionA.id,
        toDefinitionId: definitionB.id,
        type: 'FINISH_TO_START',
        lagMinutes: 0,
      },
    })

    const publishFirst = await postPublishTemplateVersion(
      { tenantId: actors.tenantId },
      templateVersion.id
    )
    expect(publishFirst.status).toBe(200)
    expect(publishFirst.json.status).toBe('published')

    const publishSecond = await postPublishTemplateVersion(
      { tenantId: actors.tenantId },
      templateVersion.id
    )
    expect(publishSecond.status).toBe(200)
    expect(publishSecond.json.status).toBe('noop_already_published')

    const persisted = await testPrisma.templateVersion.findUniqueOrThrow({
      where: { id: templateVersion.id },
      select: { isPublished: true },
    })
    expect(persisted.isPublished).toBe(true)
  })

  it('template tasks/dependencies list endpoints enforce tenant scoping', async () => {
    const tenantA = await createTenantActorsFixture()
    const tenantB = await createTenantActorsFixture()

    const templateA = await testPrisma.template.create({
      data: {
        tenantId: tenantA.tenantId,
        name: 'Tenant A Builder Template',
      },
    })
    const templateB = await testPrisma.template.create({
      data: {
        tenantId: tenantB.tenantId,
        name: 'Tenant B Builder Template',
      },
    })
    const versionA = await testPrisma.templateVersion.create({
      data: {
        templateId: templateA.id,
        version: 'draft-a',
        isPublished: false,
      },
    })
    const versionB = await testPrisma.templateVersion.create({
      data: {
        templateId: templateB.id,
        version: 'draft-b',
        isPublished: false,
      },
    })

    const aDef1 = await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: versionA.id,
        tenantId: tenantA.tenantId,
        name: 'A1',
        taskLevel: 'STEP',
        ownerRoleId: tenantA.ownerRoleId,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
    })
    const aDef2 = await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: versionA.id,
        tenantId: tenantA.tenantId,
        name: 'A2',
        taskLevel: 'STEP',
        ownerRoleId: tenantA.ownerRoleId,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
    })
    await testPrisma.templateDependencyDefinition.create({
      data: {
        templateVersionId: versionA.id,
        tenantId: tenantA.tenantId,
        fromDefinitionId: aDef1.id,
        toDefinitionId: aDef2.id,
        type: 'FINISH_TO_START',
        lagMinutes: 0,
      },
    })

    await testPrisma.templateTaskDefinition.create({
      data: {
        templateVersionId: versionB.id,
        tenantId: tenantB.tenantId,
        name: 'B1',
        taskLevel: 'STEP',
        ownerRoleId: tenantB.ownerRoleId,
        visibility: 'INTERNAL_ONLY',
        approvalPolicy: 'NONE',
        clockMode: 'ACTIVE',
      },
    })

    const ownTasks = await getTemplateTasks({
      tenantId: tenantA.tenantId,
      templateVersionId: versionA.id,
    })
    expect(ownTasks.status).toBe(200)
    expect(ownTasks.json.tasks.length).toBe(2)

    const ownDependencies = await getTemplateDependencies({
      tenantId: tenantA.tenantId,
      templateVersionId: versionA.id,
    })
    expect(ownDependencies.status).toBe(200)
    expect(ownDependencies.json.dependencies.length).toBe(1)

    const crossTenantTasks = await getTemplateTasks({
      tenantId: tenantA.tenantId,
      templateVersionId: versionB.id,
    })
    expect(crossTenantTasks.status).toBe(404)

    const crossTenantDependencies = await getTemplateDependencies({
      tenantId: tenantA.tenantId,
      templateVersionId: versionB.id,
    })
    expect(crossTenantDependencies.status).toBe(404)
  })

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

  it('audit endpoint returns read-only event timeline without pii fields', async () => {
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

    const auditResult = await getAudit({
      tenantId: actors.tenantId,
      ecoId: fixture.ecoId,
    })

    expect(auditResult.status).toBe(200)
    expect(Array.isArray(auditResult.json.events)).toBe(true)
    expect(auditResult.json.events.length).toBeGreaterThan(0)
    expect(auditResult.json.events[0].eventType).toBeTruthy()

    const payloadKeys = Object.keys(auditResult.json.events[0].payload ?? {})
    expect(payloadKeys).not.toContain('email')
    expect(payloadKeys).not.toContain('name')
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

  it('duplicate approval submission by same actor returns deterministic 409', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Duplicate Approval ECO', tenantId: actors.tenantId },
    })

    const task = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Duplicate approval task',
      state: 'NOT_STARTED',
      approvalPolicy: 'SINGLE',
    })

    const first = await postApproval(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
        decision: 'APPROVED',
      },
      task.id
    )
    expect(first.status).toBe(200)

    const second = await postApproval(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
        decision: 'APPROVED',
      },
      task.id
    )
    expect(second.status).toBe(409)
    expect(second.json.error).toBe('Approval already submitted for task')

    const approvals = await testPrisma.approval.findMany({
      where: {
        tenantId: actors.tenantId,
        taskId: task.id,
        actorId: actors.ownerActorId,
      },
    })
    expect(approvals).toHaveLength(1)
  })

  it('REJECTED-only approvals do not satisfy SINGLE, PARALLEL, or QUORUM policies', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Rejected-Only Policies ECO', tenantId: actors.tenantId },
    })

    const singleTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Single policy task',
      state: 'NOT_STARTED',
      approvalPolicy: 'SINGLE',
    })

    const parallelTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Parallel policy task',
      state: 'NOT_STARTED',
      approvalPolicy: 'PARALLEL',
    })

    const quorumTask = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Quorum policy task',
      state: 'NOT_STARTED',
      approvalPolicy: 'QUORUM',
    })

    const secondOwner = await testPrisma.user.create({
      data: {
        email: `second-owner-${singleTask.id.slice(0, 6)}@example.com`,
        tenantId: actors.tenantId,
      },
    })
    await testPrisma.userRole.create({
      data: {
        userId: secondOwner.id,
        roleId: actors.ownerRoleId,
      },
    })

    for (const taskId of [singleTask.id, parallelTask.id, quorumTask.id]) {
      const firstReject = await postApproval(
        {
          tenantId: actors.tenantId,
          actorId: actors.ownerActorId,
          decision: 'REJECTED',
        },
        taskId
      )
      expect(firstReject.status).toBe(200)

      const secondReject = await postApproval(
        {
          tenantId: actors.tenantId,
          actorId: secondOwner.id,
          decision: 'REJECTED',
        },
        taskId
      )
      expect(secondReject.status).toBe(200)
    }

    for (const taskId of [singleTask.id, parallelTask.id, quorumTask.id]) {
      const completion = await postComplete(
        {
          tenantId: actors.tenantId,
          actorId: actors.ownerActorId,
        },
        taskId
      )
      expect(completion.status).toBe(409)
      expect(completion.json.error).toBe('Approval policy requirements not satisfied')
    }

    const finalStates = await testPrisma.task.findMany({
      where: {
        id: { in: [singleTask.id, parallelTask.id, quorumTask.id] },
      },
      select: { id: true, state: true },
    })
    for (const row of finalStates) {
      expect(row.state).toBe('NOT_STARTED')
    }
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

  it('quick-start flow can create eco and instantiate from selected template', async () => {
    const actors = await createTenantActorsFixture()
    const fixture = await createBlueprintFixture({
      tenantId: actors.tenantId,
      ownerRoleId: actors.ownerRoleId,
      taskDefinitions: [
        { key: 'a', name: 'Intake A' },
        { key: 'b', name: 'Intake B' },
      ],
      dependencyDefinitions: [{ fromKey: 'a', toKey: 'b' }],
    })

    const createResult = await postEcos({
      tenantId: actors.tenantId,
      title: 'Quick Start Job',
    })
    expect(createResult.status).toBe(200)
    expect(typeof createResult.json.ecoId).toBe('string')

    const instantiateResult = await postInstantiate(
      {
        tenantId: actors.tenantId,
        templateVersionId: fixture.templateVersionId,
        actorId: actors.ownerActorId,
      },
      createResult.json.ecoId
    )
    expect(instantiateResult.status).toBe(200)
    expect(instantiateResult.json.tasksCreated).toBeGreaterThan(0)

    const projectionResult = await getProjection({
      tenantId: actors.tenantId,
      ecoId: createResult.json.ecoId,
      actorId: actors.ownerActorId,
    })
    expect(projectionResult.status).toBe(200)
    expect(projectionResult.json.tasks.length).toBeGreaterThan(0)
  })

  it('task order save writes TASK_ORDER_SET and applies deterministic merged order', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Task Order ECO', tenantId: actors.tenantId },
    })
    const taskA = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'A',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })
    const taskB = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'B',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })
    const taskC = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'C',
      state: 'NOT_REQUIRED',
      approvalPolicy: 'NONE',
    })

    const orderSave = await postTaskOrder(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
        orderedTaskIds: [taskB.id, 'bogus', taskA.id],
      },
      eco.id
    )
    expect(orderSave.status).toBe(409)

    const validOrderSave = await postTaskOrder(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
        orderedTaskIds: [taskB.id, taskA.id],
      },
      eco.id
    )
    expect(validOrderSave.status).toBe(200)

    const auditResult = await getAudit({
      tenantId: actors.tenantId,
      ecoId: eco.id,
    })
    expect(auditResult.status).toBe(200)
    expect(auditResult.json.events.some((event: { eventType: string }) => event.eventType === 'TASK_ORDER_SET')).toBe(true)

    const savedOrder = getLatestSavedTaskOrder(
      auditResult.json.events.map(
        (event: { eventType: string; payload: Record<string, unknown> }) => ({
          eventType: event.eventType,
          payload: event.payload,
        })
      )
    )
    expect(savedOrder).toEqual([taskB.id, taskA.id])

    const deterministicOrder = applyDeterministicTaskOrder({
      tasks: [
        { id: taskA.id, state: 'NOT_STARTED' },
        { id: taskB.id, state: 'NOT_STARTED' },
        { id: taskC.id, state: 'NOT_REQUIRED' },
      ],
      tasksTopologicalOrder: [taskA.id, taskB.id, taskC.id],
      savedOrderedTaskIds: savedOrder,
      excludeNotRequired: true,
    }).finalOrder

    expect(deterministicOrder).toEqual([taskB.id, taskA.id])
  })

  it('NOT_REQUIRED customization persists state while task row remains stored', async () => {
    const actors = await createTenantActorsFixture()
    const eco = await testPrisma.eCO.create({
      data: { title: 'Hide Task ECO', tenantId: actors.tenantId },
    })
    const task = await createTaskFixture({
      tenantId: actors.tenantId,
      ecoId: eco.id,
      ownerRoleId: actors.ownerRoleId,
      name: 'Hide me',
      state: 'NOT_STARTED',
      approvalPolicy: 'NONE',
    })

    const patchResult = await patchTask(
      {
        tenantId: actors.tenantId,
        actorId: actors.ownerActorId,
        state: 'NOT_REQUIRED',
      },
      task.id
    )
    expect(patchResult.status).toBe(200)
    expect(patchResult.json.state).toBe('NOT_REQUIRED')

    const persisted = await testPrisma.task.findUniqueOrThrow({
      where: { id: task.id },
      select: { id: true, state: true },
    })
    expect(persisted.id).toBe(task.id)
    expect(persisted.state).toBe('NOT_REQUIRED')
  })
})
