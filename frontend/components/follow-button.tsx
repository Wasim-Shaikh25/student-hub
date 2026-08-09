'use client'

import { useState } from 'react'
import { followCase } from '@/lib/actions'

export function FollowButton({ caseId, initial }: { caseId: string; initial: boolean }) {
  const [following, setFollowing] = useState(initial)
  return (
    <form
      action={async () => {
        await followCase(caseId)
        setFollowing(!following)
      }}
    >
      <button
        type="submit"
        className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted"
      >
        {following ? 'Following' : 'Join / Follow case'}
      </button>
    </form>
  )
}
