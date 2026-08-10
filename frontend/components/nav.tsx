'use client'

import Link from 'next/link'
import { Plus, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { logout } from '@/lib/actions'
import type { SessionUser } from '@/lib/session'

export function Nav({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/', label: 'Home' },
    { href: '/discover', label: 'Discover' },
    { href: '/investigations', label: 'Investigations' },
    { href: '/cases', label: 'My Cases' },
  ]

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary">
          studentshub
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/raise"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-4" />
                Raise an Issue
              </Link>
              <Link href="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                {user.name}
              </Link>
              <form action={logout}>
                <button type="submit" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t px-4 py-4 md:hidden space-y-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link href="/admin" onClick={() => setOpen(false)} className="block text-sm font-medium text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          )}
          {user ? (
            <>
              <Link href="/profile" onClick={() => setOpen(false)} className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                Profile
              </Link>
              <form action={logout}>
                <button type="submit" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                Log in
              </Link>
              <Link href="/register" onClick={() => setOpen(false)} className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
