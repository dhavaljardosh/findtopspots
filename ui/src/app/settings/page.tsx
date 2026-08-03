'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Monitor, Sun, Moon, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const THEMES = [
  {
    id: 'system',
    label: 'System',
    description: 'Follows your device setting',
    icon: Monitor,
    preview: (
      <div className="flex h-full">
        <div className="w-1/2 bg-white" />
        <div className="w-1/2 bg-neutral-900" />
      </div>
    ),
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Always light, clean and crisp',
    icon: Sun,
    preview: (
      <div className="h-full bg-stone-50 flex flex-col gap-1.5 p-3">
        <div className="h-2 w-16 rounded bg-neutral-900 opacity-80" />
        <div className="h-1.5 w-24 rounded bg-neutral-400 opacity-60" />
        <div className="mt-1 flex gap-1.5">
          <div className="h-8 flex-1 rounded-lg bg-white border border-neutral-200 shadow-sm" />
          <div className="h-8 flex-1 rounded-lg bg-white border border-neutral-200 shadow-sm" />
        </div>
        <div className="mt-auto h-1.5 w-12 rounded-full bg-amber-400" />
      </div>
    ),
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Rich, deep dark with amber accents',
    icon: Moon,
    preview: (
      <div className="h-full bg-[#0a0a0a] flex flex-col gap-1.5 p-3">
        <div className="h-2 w-16 rounded bg-neutral-100 opacity-90" />
        <div className="h-1.5 w-24 rounded bg-neutral-500 opacity-70" />
        <div className="mt-1 flex gap-1.5">
          <div className="h-8 flex-1 rounded-lg bg-[#141414] border border-[#2e2e2e]" />
          <div className="h-8 flex-1 rounded-lg bg-[#141414] border border-[#2e2e2e]" />
        </div>
        <div className="mt-auto h-1.5 w-12 rounded-full bg-amber-400" />
      </div>
    ),
  },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Manage your preferences</p>
      </div>

      {/* Appearance */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Appearance</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Choose how FindTopSpots looks on your device
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const Icon = t.icon
            const isActive = mounted && theme === t.id

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  'group relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
                  isActive
                    ? 'border-amber-400 shadow-[0_0_0_1px_rgb(251_191_36/0.3)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
                )}
              >
                {/* Preview */}
                <div className="h-24 w-full overflow-hidden">
                  {t.preview}
                </div>

                {/* Label */}
                <div className="flex items-center gap-2 bg-[var(--color-surface-1)] px-3 py-2.5">
                  <Icon className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isActive ? 'text-amber-500' : 'text-[var(--color-text-muted)]',
                  )} />
                  <span className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-amber-500' : 'text-[var(--color-text-secondary)]',
                  )}>
                    {t.label}
                  </span>
                  {isActive && (
                    <Check className="ml-auto h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {mounted && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Currently using <span className="font-medium text-[var(--color-text-secondary)]">{theme}</span> mode
          </p>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-[var(--color-border)]" />

      {/* Placeholder for future settings */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Notifications</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Coming soon</p>
        </div>
      </section>
    </div>
  )
}
