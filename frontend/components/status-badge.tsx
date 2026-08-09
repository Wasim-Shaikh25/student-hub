import { cn } from '@/lib/utils'
import type { CaseStatus } from '@/lib/types'

const statusStyles: Record<CaseStatus, string> = {
  Unverified: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'Confirmed Problem': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Evidence Collection': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Expert Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Action Initiated': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Authority Response': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Partially Resolved': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Mostly Resolved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Reopened: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusStyles[status], className)}>
      {status}
    </span>
  )
}
