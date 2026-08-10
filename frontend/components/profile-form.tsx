'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile, updatePassword } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'

export interface UserDetails {
  email?: string
  display_name?: string
  phone?: string | null
  bio?: string | null
  role?: string
  created_at?: string
}

export function ProfileForm({ user, details }: { user: SessionUser; details?: UserDetails }) {
  const d = details || {}
  const router = useRouter()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)
    const formData = new FormData(e.currentTarget)
    const result = await updateProfile(formData)
    if (result?.error) {
      setProfileError(result.error)
    } else {
      setProfileSuccess(true)
      router.refresh()
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    const formData = new FormData(e.currentTarget)
    const result = await updatePassword(formData)
    if (result?.error) {
      setPasswordError(result.error)
    } else {
      setPasswordSuccess(true)
      e.currentTarget.reset()
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Profile & Settings</h1>
      <p className="text-muted-foreground mt-2">Manage your PublicWatch account.</p>

      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {(d.display_name || user.name)?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{d.display_name || user.name}</h2>
            <p className="text-sm text-muted-foreground">{d.email || user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{d.role || user.role}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="mt-8 space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Edit profile</h2>
        <div>
          <label className="block text-sm font-medium">Display name</label>
          <input
            name="display_name"
            defaultValue={d.display_name || user.name}
            required
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            value={d.email || user.email}
            disabled
            className="mt-1 w-full rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Mobile (optional)</label>
          <input
            name="phone"
            defaultValue={d.phone || ''}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Bio (optional)</label>
          <textarea
            name="bio"
            defaultValue={d.bio || ''}
            rows={3}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {profileError && <p className="text-sm text-red-600">{profileError}</p>}
        {profileSuccess && <p className="text-sm text-green-600">Profile updated.</p>}
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Save profile
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div>
          <label className="block text-sm font-medium">Current password</label>
          <input name="current_password" type="password" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium">New password</label>
          <input name="new_password" type="password" required minLength={8} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm new password</label>
          <input name="confirm_password" type="password" required minLength={8} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
        {passwordSuccess && <p className="text-sm text-green-600">Password updated.</p>}
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Update password
        </button>
      </form>
    </div>
  )
}
