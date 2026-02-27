-- CreateTable
CREATE TABLE "ECOPlan" (
    "id" TEXT NOT NULL,
    "ecoId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ECOPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ECOPlan_tenantId_idx" ON "ECOPlan"("tenantId");

-- CreateIndex
CREATE INDEX "ECOPlan_templateVersionId_idx" ON "ECOPlan"("templateVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ECOPlan_ecoId_key" ON "ECOPlan"("ecoId");

-- AddForeignKey
ALTER TABLE "ECOPlan" ADD CONSTRAINT "ECOPlan_ecoId_fkey" FOREIGN KEY ("ecoId") REFERENCES "ECO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECOPlan" ADD CONSTRAINT "ECOPlan_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "TemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECOPlan" ADD CONSTRAINT "ECOPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
