-- CreateTable
CREATE TABLE "TemplateTaskDefinition" (
    "id" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentDefinitionId" TEXT,
    "name" TEXT NOT NULL,
    "taskLevel" "TaskLevel" NOT NULL,
    "ownerRoleId" TEXT NOT NULL,
    "visibility" "TaskVisibility" NOT NULL,
    "approvalPolicy" "ApprovalPolicy" NOT NULL,
    "clockMode" "ClockMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateTaskDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateTaskDefinition_templateVersionId_idx" ON "TemplateTaskDefinition"("templateVersionId");

-- CreateIndex
CREATE INDEX "TemplateTaskDefinition_tenantId_idx" ON "TemplateTaskDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "TemplateTaskDefinition_ownerRoleId_idx" ON "TemplateTaskDefinition"("ownerRoleId");

-- CreateIndex
CREATE INDEX "TemplateTaskDefinition_parentDefinitionId_idx" ON "TemplateTaskDefinition"("parentDefinitionId");

-- AddForeignKey
ALTER TABLE "TemplateTaskDefinition" ADD CONSTRAINT "TemplateTaskDefinition_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "TemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTaskDefinition" ADD CONSTRAINT "TemplateTaskDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTaskDefinition" ADD CONSTRAINT "TemplateTaskDefinition_ownerRoleId_fkey" FOREIGN KEY ("ownerRoleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTaskDefinition" ADD CONSTRAINT "TemplateTaskDefinition_parentDefinitionId_fkey" FOREIGN KEY ("parentDefinitionId") REFERENCES "TemplateTaskDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
