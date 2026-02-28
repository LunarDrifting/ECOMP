import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type TenantDbClient = Prisma.TransactionClient | typeof prisma
type JsonPrimitive = string | number | boolean | null
type JsonLike = JsonPrimitive | JsonLike[] | { [key: string]: JsonLike }

function sanitizeAuditPayload(input: Record<string, unknown>): Record<string, JsonLike> {
  const toJsonLike = (value: unknown): JsonLike => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value
    }

    if (Array.isArray(value)) {
      return value.map((item) => toJsonLike(item))
    }

    if (value && typeof value === 'object') {
      const output: Record<string, JsonLike> = {}
      for (const [key, entry] of Object.entries(value)) {
        output[key] = toJsonLike(entry)
      }
      return output
    }

    return String(value)
  }

  const sanitized: Record<string, JsonLike> = {}
  for (const [key, value] of Object.entries(input)) {
    sanitized[key] = toJsonLike(value)
  }

  const payloadSize = Buffer.byteLength(JSON.stringify(sanitized), 'utf8')
  if (payloadSize <= 4096) {
    return sanitized
  }

  return {
    status: 'payload_truncated',
    originalSizeBytes: payloadSize,
  }
}

export function tenantDb(tenantId: string, dbClient: TenantDbClient = prisma) {
  if (!tenantId) {
    throw new Error('Tenant ID is required')
  }

  const client = dbClient

  return {
    tenant: {
      findUnique: (args: any) =>
        client.tenant.findUnique({
          ...args,
          where: { ...args.where, id: tenantId },
        }),
    },

    user: {
      findMany: (args: any = {}) =>
        client.user.findMany({
          ...args,
          where: { ...args.where, tenantId },
        }),

      create: (args: any) =>
        client.user.create({
          ...args,
          data: { ...args.data, tenantId },
        }),
    },

    role: {
      findMany: (args: any = {}) =>
        client.role.findMany({
          ...args,
          where: { ...args.where, tenantId },
        }),

      create: (args: any) =>
        client.role.create({
          ...args,
          data: { ...args.data, tenantId },
        }),
    },

    eco: {
      findById: (ecoId: string) =>
        client.eCO.findFirst({
          where: { id: ecoId, tenantId },
        }),

      findByTaskId: (taskId: string) =>
        client.eCO.findFirst({
          where: {
            tenantId,
            tasks: {
              some: { id: taskId },
            },
          },
          select: {
            id: true,
          },
        }),
    },

    templateVersion: {
      findByIdViaTemplate: (templateVersionId: string) =>
        client.templateVersion.findFirst({
          where: {
            id: templateVersionId,
            template: { tenantId },
          },
          include: {
            template: true,
          },
        }),
    },

    templateTaskDefinition: {
      listByTemplateVersion: (templateVersionId: string) =>
        client.templateTaskDefinition.findMany({
          where: {
            templateVersionId,
            tenantId,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
    },

    templateDependencyDefinition: {
      listByTemplateVersion: (templateVersionId: string) =>
        client.templateDependencyDefinition.findMany({
          where: {
            templateVersionId,
            tenantId,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
    },

    ecoPlan: {
      findByEcoId: (ecoId: string) =>
        client.eCOPlan.findFirst({
          where: { ecoId, tenantId },
        }),

      create: (ecoId: string, templateVersionId: string) =>
        client.eCOPlan.create({
          data: {
            ecoId,
            templateVersionId,
            tenantId,
          },
        }),
    },

    task: {
      findById: (taskId: string) =>
        client.task.findFirst({
          where: {
            id: taskId,
            tenantId,
          },
          select: {
            id: true,
            ownerRoleId: true,
            state: true,
            approvalPolicy: true,
          },
        }),

      listByEcoId: (ecoId: string) =>
        client.task.findMany({
          where: {
            ecoId,
            tenantId,
          },
          select: { id: true },
        }),

      listProjectionByEcoId: (ecoId: string) =>
        client.task.findMany({
          where: {
            ecoId,
            tenantId,
          },
          select: {
            id: true,
            ownerRoleId: true,
            state: true,
            approvalPolicy: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),

      createRootPlaceholder: (ecoId: string, ownerRoleId: string, name: string) =>
        client.task.create({
          data: {
            tenantId,
            ecoId,
            ownerRoleId,
            name,
            taskLevel: 'MILESTONE',
            state: 'NOT_STARTED',
            visibility: 'INTERNAL_ONLY',
            approvalPolicy: 'NONE',
            clockMode: 'ACTIVE',
          },
        }),

      createFromDefinition: (args: {
        ecoId: string
        ownerRoleId: string
        name: string
        taskLevel: any
        visibility: any
        approvalPolicy: any
        clockMode: any
        parentTaskId?: string
      }) =>
        client.task.create({
          data: {
            tenantId,
            ecoId: args.ecoId,
            ownerRoleId: args.ownerRoleId,
            parentTaskId: args.parentTaskId ?? null,
            name: args.name,
            taskLevel: args.taskLevel,
            state: 'NOT_STARTED',
            visibility: args.visibility,
            approvalPolicy: args.approvalPolicy,
            clockMode: args.clockMode,
          },
        }),

      setBlockedForInstantiation: (taskIds: string[]) =>
        client.task.updateMany({
          where: {
            tenantId,
            id: { in: taskIds },
          },
          data: { state: 'BLOCKED' },
        }),

      setNotStartedByIdsForUnblocking: (taskIds: string[]) =>
        client.task.updateMany({
          where: {
            tenantId,
            id: { in: taskIds },
          },
          data: { state: 'NOT_STARTED' },
        }),

      markDoneByIdIfNotStartedForCompletion: (taskId: string) =>
        client.task.updateMany({
          where: {
            tenantId,
            id: taskId,
            state: 'NOT_STARTED',
          },
          data: { state: 'DONE' },
        }),

      listStatesByIds: (taskIds: string[]) =>
        client.task.findMany({
          where: {
            tenantId,
            id: { in: taskIds },
          },
          select: {
            id: true,
            state: true,
          },
        }),

      listResolutionFieldsByIds: (taskIds: string[]) =>
        client.task.findMany({
          where: {
            tenantId,
            id: { in: taskIds },
          },
          select: {
            id: true,
            state: true,
            ownerRoleId: true,
            approvalPolicy: true,
          },
        }),

      findOwnerRoleById: (taskId: string) =>
        client.task.findFirst({
          where: {
            id: taskId,
            tenantId,
          },
          select: {
            id: true,
            ownerRoleId: true,
          },
        }),
    },

    dependency: {
      listByTaskIds: (taskIds: string[]) =>
        client.dependency.findMany({
          where: {
            fromTaskId: { in: taskIds },
            toTaskId: { in: taskIds },
            fromTask: { tenantId },
            toTask: { tenantId },
          },
          select: {
            id: true,
            fromTaskId: true,
            toTaskId: true,
          },
        }),

      listDownstreamByFromTaskId: (fromTaskId: string) =>
        client.dependency.findMany({
          where: {
            fromTaskId,
            fromTask: { tenantId },
            toTask: { tenantId },
          },
          select: {
            fromTaskId: true,
            toTaskId: true,
          },
        }),

      listDownstreamByFromTaskIds: (fromTaskIds: string[]) =>
        client.dependency.findMany({
          where: {
            fromTaskId: { in: fromTaskIds },
            fromTask: { tenantId },
            toTask: { tenantId },
          },
          select: {
            fromTaskId: true,
            toTaskId: true,
          },
        }),

      listIncomingByToTaskIds: (toTaskIds: string[]) =>
        client.dependency.findMany({
          where: {
            toTaskId: { in: toTaskIds },
            fromTask: { tenantId },
            toTask: { tenantId },
          },
          select: {
            fromTaskId: true,
            toTaskId: true,
          },
        }),

      create: async (args: {
        fromTaskId: string
        toTaskId: string
        type: 'FINISH_TO_START' | 'START_TO_START'
        lagMinutes: number
      }) => {
        const scopedTasks = await client.task.findMany({
          where: {
            tenantId,
            id: {
              in: [args.fromTaskId, args.toTaskId],
            },
          },
          select: { id: true },
        })

        if (scopedTasks.length !== 2) {
          throw new Error('Dependency task scope validation failed for tenant')
        }

        return client.dependency.create({
          data: {
            fromTaskId: args.fromTaskId,
            toTaskId: args.toTaskId,
            type: args.type,
            lagMinutes: args.lagMinutes,
          },
        })
      },
    },

    approval: {
      listByTaskId: (taskId: string) =>
        client.approval.findMany({
          where: {
            taskId,
            tenantId,
          },
          select: {
            actorId: true,
            decision: true,
          },
        }),

      listByTaskIds: (taskIds: string[]) =>
        client.approval.findMany({
          where: {
            taskId: { in: taskIds },
            tenantId,
          },
          select: {
            taskId: true,
            decision: true,
          },
        }),

      listByTaskIdsForPolicy: (taskIds: string[]) =>
        client.approval.findMany({
          where: {
            taskId: { in: taskIds },
            tenantId,
          },
          select: {
            taskId: true,
            actorId: true,
            decision: true,
          },
        }),

      createForTask: (args: {
        taskId: string
        actorId: string
        decision: 'APPROVED' | 'REJECTED'
        comment?: string | null
      }) =>
        client.approval.create({
          data: {
            taskId: args.taskId,
            actorId: args.actorId,
            tenantId,
            decision: args.decision,
            comment: args.comment ?? null,
          },
          select: {
            id: true,
            taskId: true,
            actorId: true,
            tenantId: true,
            decision: true,
            comment: true,
            createdAt: true,
          },
        }),
    },

    gate: {
      listPreconditionsByTaskId: (taskId: string) =>
        client.gate.findMany({
          where: {
            taskId,
            tenantId,
            type: 'PRECONDITION',
          },
          select: {
            condition: true,
          },
        }),

      listByTaskIds: (taskIds: string[]) =>
        client.gate.findMany({
          where: {
            taskId: { in: taskIds },
            tenantId,
          },
          select: {
            taskId: true,
            type: true,
          },
        }),

      listByTaskIdsWithCondition: (taskIds: string[]) =>
        client.gate.findMany({
          where: {
            taskId: { in: taskIds },
            tenantId,
          },
          select: {
            taskId: true,
            type: true,
            condition: true,
          },
        }),

      listPreconditionsByTaskIds: (taskIds: string[]) =>
        client.gate.findMany({
          where: {
            taskId: { in: taskIds },
            tenantId,
            type: 'PRECONDITION',
          },
          select: {
            taskId: true,
            condition: true,
          },
        }),
    },

    userRole: {
      listRoleAssignmentsByUserId: (userId: string) =>
        client.userRole.findMany({
          where: {
            userId,
            role: {
              tenantId,
            },
          },
          select: {
            roleId: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        }),

      listRoleAssignmentsByUserIds: (userIds: string[]) =>
        client.userRole.findMany({
          where: {
            userId: { in: userIds },
            role: {
              tenantId,
            },
          },
          select: {
            userId: true,
            roleId: true,
          },
        }),
    },

    audit: {
      emitAuditEvent: async (args: {
        eventType: string
        payload: Record<string, unknown>
        ecoId?: string
        taskId?: string
        actorId?: string
      }) => {
        try {
          let resolvedEcoId: string | undefined = args.ecoId

          if (resolvedEcoId) {
            const eco = await client.eCO.findFirst({
              where: {
                id: resolvedEcoId,
                tenantId,
              },
              select: { id: true },
            })

            if (!eco) {
              return { emitted: false, reason: 'MISSING_ECO_SCOPE' as const }
            }
          } else if (args.taskId) {
            const eco = await client.eCO.findFirst({
              where: {
                tenantId,
                tasks: {
                  some: { id: args.taskId },
                },
              },
              select: { id: true },
            })
            resolvedEcoId = eco?.id
          }

          if (!resolvedEcoId) {
            return { emitted: false, reason: 'MISSING_ECO_SCOPE' as const }
          }

          await client.auditEvent.create({
            data: {
              ecoId: resolvedEcoId,
              eventType: args.eventType,
              actorId: args.actorId ?? null,
              payload: sanitizeAuditPayload(args.payload),
            },
          })

          return { emitted: true as const }
        } catch {
          return { emitted: false, reason: 'INSERT_FAILED' as const }
        }
      },
    },
  }
}
