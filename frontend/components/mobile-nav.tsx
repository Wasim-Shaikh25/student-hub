'use client'

import Link from 'next/link'
import { Home, Search, Plus, Folder, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/session'

export function MobileNav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname()
  const items = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/discover', icon: Search, label: 'Discover' },
    { href: '/raise', icon: Plus, label: 'Raise', primary: true },
    { href: '/cases', icon: Folder, label: 'Cases' },
    { href: user ? '/profile' : '/login', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-around py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 p-2',
              item.primary
                ? '-mt-6 rounded-full bg-primary p-3 text-primary-foreground shadow-lg'
                : pathname === item.href
                  ? 'text-foreground'
                  : 'text-muted-foreground'
            )}
          >
            <item.icon className={cn('size-5', item.primary && 'size-6')} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
