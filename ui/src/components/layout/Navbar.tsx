'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { Building2, Compass, LayoutDashboard, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlobalSearch } from '@/components/search/GlobalSearch'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/spots', label: 'Explore' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header data-testid="navbar" className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-bold text-[var(--color-text-primary)] hover:opacity-80 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400">
            <Compass className="h-4.5 w-4.5 text-amber-950" />
          </div>
          <span className="hidden text-base tracking-tight sm:block">FindTopSpots</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-0.5 sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Search — grows to fill space */}
        <div className="min-w-0 flex-1 md:max-w-xs lg:max-w-sm">
          <GlobalSearch variant="navbar" />
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2">
          <SignedIn>
            <Link
              href="/dashboard"
              className={cn(
                'hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/dashboard'
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]',
              )}
            >
              <Building2 className="h-4 w-4" />
              My Business
            </Link>

            <Link
              href="/spots/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-300 active:bg-amber-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Spot</span>
            </Link>

            <Link
              href="/settings"
              className={cn(
                'rounded-lg p-2 transition-colors',
                pathname === '/settings'
                  ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]',
              )}
              aria-label="Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </Link>

            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-amber-400 px-3.5 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300 transition-colors"
            >
              Sign up
            </Link>
          </SignedOut>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav data-testid="mobile-nav" className="flex sm:hidden border-t border-[var(--color-border)] px-2 py-1 gap-0.5">
        <Link href="/" className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors', pathname === '/' ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]')}>
          <Compass className="h-4 w-4" />Home
        </Link>
        <Link href="/spots" className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors', pathname === '/spots' ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]')}>
          <Building2 className="h-4 w-4" />Explore
        </Link>
        <SignedIn>
          <Link href="/dashboard" className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors', pathname === '/dashboard' ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]')}>
            <LayoutDashboard className="h-4 w-4" />Business
          </Link>
          <Link href="/spots/new" className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-amber-600 hover:bg-amber-50 transition-colors">
            <Plus className="h-4 w-4" />Add
          </Link>
        </SignedIn>
        <SignedOut>
          <Link href="/sign-in" className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-amber-600 hover:bg-amber-50 transition-colors">
            <Plus className="h-4 w-4" />Sign in
          </Link>
        </SignedOut>
      </nav>
    </header>
  )
}
