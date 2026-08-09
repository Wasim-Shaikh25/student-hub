import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { getSessionUser } from '@/lib/session'
import { Nav } from '@/components/nav'
import { MobileNav } from '@/components/mobile-nav'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'studentshub — Turn problems into progress',
  description: 'An evidence-first student action network.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getSessionUser()

  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col">
        <Nav user={user} />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <MobileNav user={user} />
      </body>
    </html>
  )
}
