'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCase } from '@/lib/actions'

export function CaseForm({
  categories,
  institutions,
  locations,
}: {
  categories: string[]
  institutions: string[]
  locations: string[]
}) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await createCase(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else if (result?.caseId) {
      router.push(`/cases/${result.caseId}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input name="title" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="What happened?" />
      </div>

      <div>
        <label className="block text-sm font-medium">Detailed description</label>
        <textarea name="description" required rows={5} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Describe the issue clearly..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Institution</label>
          <select name="institution" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select...</option>
            {institutions.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Category</label>
          <select name="category" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select...</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Location</label>
          <select name="location" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select...</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Estimated number affected</label>
        <input name="affectedCount" type="number" min={1} defaultValue={1} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="rounded-xl border border-dashed p-6">
        <label className="block text-sm font-medium">Evidence</label>
        <p className="text-sm text-muted-foreground">Upload at least one evidence file. Accept: notices, emails, receipts, screenshots, official documents.</p>
        <input
          name="evidence"
          type="file"
          multiple
          required
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="mt-3 block w-full text-sm file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
        />
        {files.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {files.map((f) => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        <strong>Do not upload</strong> passwords, Aadhaar numbers, bank credentials, or unnecessary private personal information.
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={files.length === 0 || loading}
        className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit formal case'}
      </button>
    </form>
  )
}
