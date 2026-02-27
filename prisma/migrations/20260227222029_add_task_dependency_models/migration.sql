-- CreateEnum
CREATE TYPE "TaskLevel" AS ENUM ('MILESTONE', 'STEP', 'SUBSTEP');

-- CreateEnum
CREATE TYPE "TaskState" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'PENDING_APPROVAL', 'DONE', 'NOT_REQUIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskVisibility" AS ENUM ('INTERNAL_ONLY', 'CUSTOMER_VISIBLE', 'CUSTOMER_ACTIONABLE');

-- CreateEnum
CREATE TYPE "ApprovalPolicy" AS ENUM ('NONE', 'SINGLE', 'SEQUENTIAL', 'PARALLEL', 'QUORUM');

-- CreateEnum
CREATE TYPE "ClockMode" AS ENUM ('ACTIVE', 'WAITING_ON_CUSTOMER', 'WAITING_ON_SUPPLIER', 'WAITING_INTERNAL');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ecoId" TEXT NOT NULL,
    "parentTaskId" TEXT,
    "taskLevel" "TaskLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "ownerRoleId" TEXT NOT NULL,
    "state" "TaskState" NOT NULL,
    "visibility" "TaskVisibility" NOT NULL,
    "approvalPolicy" "ApprovalPolicy" NOT NULL,
    "clockMode" "ClockMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependency" (
    "id" TEXT NOT NULL,
    "fromTaskId" TEXT NOT NULL,
    "toTaskId" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL,
    "lagMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");

-- CreateIndex
CREATE INDEX "Task_ecoId_idx" ON "Task"("ecoId");

-- CreateIndex
CREATE INDEX "Task_ownerRoleId_idx" ON "Task"("ownerRoleId");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "Dependency_fromTaskId_idx" ON "Dependency"("fromTaskId");

-- CreateIndex
CREATE INDEX "Dependency_toTaskId_idx" ON "Dependency"("toTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ecoId_fkey" FOREIGN KEY ("ecoId") REFERENCES "ECO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerRoleId_fkey" FOREIGN KEY ("ownerRoleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_fromTaskId_fkey" FOREIGN KEY ("fromTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_toTaskId_fkey" FOREIGN KEY ("toTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
