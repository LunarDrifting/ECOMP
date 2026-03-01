import { Suspense } from 'react'
import { WizardClient } from './wizard-client'

export default function WizardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-700">Loading wizard...</div>}>
      <WizardClient />
    </Suspense>
  )
}
