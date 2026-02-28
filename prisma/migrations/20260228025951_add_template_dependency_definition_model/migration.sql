-- CreateTable
CREATE TABLE "TemplateDependencyDefinition" (
    "id" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromDefinitionId" TEXT NOT NULL,
    "toDefinitionId" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL,
    "lagMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateDependencyDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateDependencyDefinition_tenantId_idx" ON "TemplateDependencyDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "TemplateDependencyDefinition_fromDefinitionId_idx" ON "TemplateDependencyDefinition"("fromDefinitionId");

-- CreateIndex
CREATE INDEX "TemplateDependencyDefinition_toDefinitionId_idx" ON "TemplateDependencyDefinition"("toDefinitionId");

-- AddForeignKey
ALTER TABLE "TemplateDependencyDefinition" ADD CONSTRAINT "TemplateDependencyDefinition_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "TemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateDependencyDefinition" ADD CONSTRAINT "TemplateDependencyDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateDependencyDefinition" ADD CONSTRAINT "TemplateDependencyDefinition_fromDefinitionId_fkey" FOREIGN KEY ("fromDefinitionId") REFERENCES "TemplateTaskDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateDependencyDefinition" ADD CONSTRAINT "TemplateDependencyDefinition_toDefinitionId_fkey" FOREIGN KEY ("toDefinitionId") REFERENCES "TemplateTaskDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
