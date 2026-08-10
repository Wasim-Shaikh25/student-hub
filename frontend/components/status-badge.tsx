import { cn } from '@/lib/utils'
import type { CaseStatus } from '@/lib/types'

const statusLabels: Record<CaseStatus, string> = {
  draft: 'Draft',
  evidence_review: 'Evidence Review',
  confirmed_problem: 'Confirmed Problem',
  investigating: 'Investigating',
  awaiting_response: 'Awaiting Response',
  partially_resolved: 'Partially Resolved',
  mostly_resolved: 'Mostly Resolved',
  resolved: 'Resolved',
  reopened: 'Reopened',
}

const statusStyles: Record<CaseStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  evidence_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed_problem: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  investigating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  awaiting_response: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  partially_resolved: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  mostly_resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  reopened: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const label = statusLabels[status] || status
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusStyles[status], className)}>
      {label}
    </span>
  )
}
