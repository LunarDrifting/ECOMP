import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type TenantDbClient = Prisma.TransactionClient | typeof prisma
type JsonPrimitive = string | number | boolean | null
type JsonLike = JsonPrimitive | JsonLike[] | { [key: string]: JsonLike }
type TenantScopedUserCreateArgs = {
  data: Omit<Prisma.UserUncheckedCreateInput, 'tenantId'>
  select?: Prisma.UserSelect | null
  include?: Prisma.UserInclude | null
}
type TenantScopedRoleCreateArgs = {
  data: Omit<Prisma.RoleUncheckedCreateInput, 'tenantId'>
  select?: Prisma.RoleSelect | null
  include?: Prisma.RoleInclude | null
}

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
      findUnique: (args: Prisma.TenantFindUniqueArgs) =>
        client.tenant.findUnique({
          ...args,
          where: { ...args.where, id: tenantId },
        }),
    },

    user: {
      findMany: (args: Prisma.UserFindManyArgs = {}) =>
        client.user.findMany({
          ...args,
          where: { ...(args.where ?? {}), tenantId },
        }),

      create: (args: TenantScopedUserCreateArgs) =>
        client.user.create({
          ...args,
          data: {
            ...args.data,
            tenantId,
          },
        }),
    },

    role: {
      findMany: (args: Prisma.RoleFindManyArgs = {}) =>
        client.role.findMany({
          ...args,
          where: { ...(args.where ?? {}), tenantId },
        }),

      create: (args: TenantScopedRoleCreateArgs) =>
        client.role.create({
          ...args,
          data: {
            ...args.data,
            tenantId,
          },
        }),
    },

    eco: {
      findById: (ecoId: string) =>
        client.eCO.findFirst({
          where: { id: ecoId, tenantId },
        }),

      listByTenant: () =>
        client.eCO.findMany({
          where: { tenantId },
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),

      create: (title: string) =>
        client.eCO.create({
          data: {
            tenantId,
            title,
          },
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
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

    template: {
      listByTenant: () =>
        client.template.findMany({
          where: { tenantId },
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),

      findById: (templateId: string) =>
        client.template.findFirst({
          where: {
            id: templateId,
            tenantId,
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        }),

      create: (name: string) =>
        client.template.create({
          data: {
            tenantId,
            name,
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
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

      listPublishedByTenant: () =>
        client.templateVersion.findMany({
          where: {
            isPublished: true,
            template: { tenantId },
          },
          select: {
            id: true,
            templateId: true,
            version: true,
            isPublished: true,
            createdAt: true,
            template: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),

      listByTemplateId: (templateId: string) =>
        client.templateVersion.findMany({
          where: {
            templateId,
            template: { tenantId },
          },
          select: {
            id: true,
            templateId: true,
            version: true,
            isPublished: true,
            createdAt: true,
            template: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),

      createDraft: (templateId: string, version: string) =>
        client.templateVersion.create({
          data: {
            templateId,
            version,
            isPublished: false,
          },
          select: {
            id: true,
            templateId: true,
            version: true,
            isPublished: true,
            createdAt: true,
          },
        }),

      publishIfDraft: (templateVersionId: string) =>
        client.templateVersion.updateMany({
          where: {
            id: templateVersionId,
            isPublished: false,
            template: { tenantId },
          },
          data: {
            isPublished: true,
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

      findById: (taskDefinitionId: string) =>
        client.templateTaskDefinition.findFirst({
          where: {
            id: taskDefinitionId,
            tenantId,
          },
        }),

      createForTemplateVersion: (args: {
        templateVersionId: string
        parentDefinitionId?: string | null
        name: string
        taskLevel: 'MILESTONE' | 'STEP' | 'SUBSTEP'
        ownerRoleId: string
        visibility:
          | 'INTERNAL_ONLY'
          | 'CUSTOMER_VISIBLE'
          | 'CUSTOMER_ACTIONABLE'
        approvalPolicy: 'NONE' | 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL' | 'QUORUM'
        clockMode:
          | 'ACTIVE'
          | 'WAITING_ON_CUSTOMER'
          | 'WAITING_ON_SUPPLIER'
          | 'WAITING_INTERNAL'
      }) =>
        client.templateTaskDefinition.create({
          data: {
            templateVersionId: args.templateVersionId,
            tenantId,
            parentDefinitionId: args.parentDefinitionId ?? null,
            name: args.name,
            taskLevel: args.taskLevel,
            ownerRoleId: args.ownerRoleId,
            visibility: args.visibility,
            approvalPolicy: args.approvalPolicy,
            clockMode: args.clockMode,
          },
        }),

      updateById: (args: {
        taskDefinitionId: string
        data: {
          parentDefinitionId?: string | null
          name?: string
          taskLevel?: 'MILESTONE' | 'STEP' | 'SUBSTEP'
          ownerRoleId?: string
          visibility?:
            | 'INTERNAL_ONLY'
            | 'CUSTOMER_VISIBLE'
            | 'CUSTOMER_ACTIONABLE'
          approvalPolicy?: 'NONE' | 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL' | 'QUORUM'
          clockMode?:
            | 'ACTIVE'
            | 'WAITING_ON_CUSTOMER'
            | 'WAITING_ON_SUPPLIER'
            | 'WAITING_INTERNAL'
        }
      }) =>
        client.templateTaskDefinition.update({
          where: {
            id: args.taskDefinitionId,
          },
          data: args.data,
        }),

      deleteById: (taskDefinitionId: string) =>
        client.templateTaskDefinition.delete({
          where: {
            id: taskDefinitionId,
          },
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

      findById: (dependencyDefinitionId: string) =>
        client.templateDependencyDefinition.findFirst({
          where: {
            id: dependencyDefinitionId,
            tenantId,
          },
        }),

      createForTemplateVersion: (args: {
        templateVersionId: string
        fromDefinitionId: string
        toDefinitionId: string
        type: 'FINISH_TO_START' | 'START_TO_START'
        lagMinutes: number
      }) =>
        client.templateDependencyDefinition.create({
          data: {
            templateVersionId: args.templateVersionId,
            tenantId,
            fromDefinitionId: args.fromDefinitionId,
            toDefinitionId: args.toDefinitionId,
            type: args.type,
            lagMinutes: args.lagMinutes,
          },
        }),

      deleteById: (dependencyDefinitionId: string) =>
        client.templateDependencyDefinition.delete({
          where: {
            id: dependencyDefinitionId,
          },
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
            name: true,
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
        taskLevel: 'MILESTONE' | 'STEP' | 'SUBSTEP'
        visibility: 'INTERNAL_ONLY' | 'CUSTOMER_VISIBLE' | 'CUSTOMER_ACTIONABLE'
        approvalPolicy: 'NONE' | 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL' | 'QUORUM'
        clockMode:
          | 'ACTIVE'
          | 'WAITING_ON_CUSTOMER'
          | 'WAITING_ON_SUPPLIER'
          | 'WAITING_INTERNAL'
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

      listByEcoId: (ecoId: string, limit = 50) =>
        client.auditEvent.findMany({
          where: {
            ecoId,
            eco: {
              tenantId,
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: Math.min(Math.max(limit, 1), 200),
          select: {
            id: true,
            eventType: true,
            payload: true,
            createdAt: true,
          },
        }),
    },
  }
}
