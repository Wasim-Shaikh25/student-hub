'use client'

import { useState } from 'react'
import { addConfirmation } from '@/lib/actions'

export function ConfirmationButtons({
  caseId,
  initialAffected,
  initialResolved,
}: {
  caseId: string
  initialAffected: boolean
  initialResolved: boolean
}) {
  const [affected, setAffected] = useState(initialAffected)
  const [resolved, setResolved] = useState(initialResolved)

  return (
    <div className="flex flex-wrap gap-3">
      <form
        action={async () => {
          await addConfirmation(caseId, 'affected')
          setAffected(true)
        }}
      >
        <button
          type="submit"
          disabled={affected}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {affected ? 'You confirmed affected' : 'I am affected'}
        </button>
      </form>
      <form
        action={async () => {
          await addConfirmation(caseId, 'resolved')
          setResolved(true)
        }}
      >
        <button
          type="submit"
          disabled={resolved || !affected}
          className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          {resolved ? 'You confirmed resolved' : 'My issue is resolved'}
        </button>
      </form>
    </div>
  )
}
