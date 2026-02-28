import { prisma } from '@/lib/prisma'

export function tenantDb(tenantId: string) {
  if (!tenantId) {
    throw new Error('Tenant ID is required')
  }

  return {
    tenant: {
      findUnique: (args: any) =>
        prisma.tenant.findUnique({
          ...args,
          where: { ...args.where, id: tenantId },
        }),
    },

    user: {
      findMany: (args: any = {}) =>
        prisma.user.findMany({
          ...args,
          where: { ...args.where, tenantId },
        }),

      create: (args: any) =>
        prisma.user.create({
          ...args,
          data: { ...args.data, tenantId },
        }),
    },

    role: {
      findMany: (args: any = {}) =>
        prisma.role.findMany({
          ...args,
          where: { ...args.where, tenantId },
        }),

      create: (args: any) =>
        prisma.role.create({
          ...args,
          data: { ...args.data, tenantId },
        }),
    },

    eco: {
      findById: (ecoId: string) =>
        prisma.eCO.findFirst({
          where: { id: ecoId, tenantId },
        }),
    },

    templateVersion: {
      findByIdViaTemplate: (templateVersionId: string) =>
        prisma.templateVersion.findFirst({
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
        prisma.templateTaskDefinition.findMany({
          where: {
            templateVersionId,
            tenantId,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
    },

    templateDependencyDefinition: {
      listByTemplateVersion: (templateVersionId: string) =>
        prisma.templateDependencyDefinition.findMany({
          where: {
            templateVersionId,
            tenantId,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
    },

    ecoPlan: {
      findByEcoId: (ecoId: string) =>
        prisma.eCOPlan.findFirst({
          where: { ecoId, tenantId },
        }),

      create: (ecoId: string, templateVersionId: string) =>
        prisma.eCOPlan.create({
          data: {
            ecoId,
            templateVersionId,
            tenantId,
          },
        }),
    },

    task: {
      findById: (taskId: string) =>
        prisma.task.findFirst({
          where: {
            id: taskId,
            tenantId,
          },
          select: {
            id: true,
            state: true,
          },
        }),

      listByEcoId: (ecoId: string) =>
        prisma.task.findMany({
          where: {
            ecoId,
            tenantId,
          },
          select: { id: true },
        }),

      createRootPlaceholder: (ecoId: string, ownerRoleId: string, name: string) =>
        prisma.task.create({
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
        prisma.task.create({
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

      updateStateForIds: (
        taskIds: string[],
        state: 'NOT_STARTED' | 'BLOCKED'
      ) =>
        prisma.task.updateMany({
          where: {
            tenantId,
            id: { in: taskIds },
          },
          data: { state },
        }),

      listStatesByIds: (taskIds: string[]) =>
        prisma.task.findMany({
          where: {
            tenantId,
            id: { in: taskIds },
          },
          select: {
            id: true,
            state: true,
          },
        }),
    },

    dependency: {
      listByTaskIds: (taskIds: string[]) =>
        prisma.dependency.findMany({
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
        prisma.dependency.findMany({
          where: {
            fromTaskId,
            fromTask: { tenantId },
            toTask: { tenantId },
          },
          select: {
            toTaskId: true,
          },
        }),

      listIncomingByToTaskIds: (toTaskIds: string[]) =>
        prisma.dependency.findMany({
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
        const scopedTasks = await prisma.task.findMany({
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

        return prisma.dependency.create({
          data: {
            fromTaskId: args.fromTaskId,
            toTaskId: args.toTaskId,
            type: args.type,
            lagMinutes: args.lagMinutes,
          },
        })
      },
    },

    userRole: prisma.userRole,
  }
}
