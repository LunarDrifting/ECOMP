import { WorkflowCommandCenter } from '@/components/workflow/workflow-command-center'

type WorkflowPageProps = {
  searchParams?: Promise<{
    tenantId?: string
    ecoId?: string
    actorId?: string
  }>
}

export default async function WorkflowPage({ searchParams }: WorkflowPageProps) {
  const params = (await searchParams) ?? {}

  return (
    <WorkflowCommandCenter
      initialTenantId={params.tenantId ?? ''}
      initialEcoId={params.ecoId ?? ''}
      initialActorId={params.actorId ?? ''}
    />
  )
}
