import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type TenantDbClient = Prisma.TransactionClient | typeof prisma

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

      markDoneByIdForCompletion: (taskId: string) =>
        client.task.updateMany({
          where: {
            tenantId,
            id: taskId,
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
  }
}
