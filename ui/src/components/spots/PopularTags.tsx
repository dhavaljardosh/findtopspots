import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getTagDef, getTagStyle } from '@/lib/tags'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface TagRow {
  tag: string
  count: number
}

async function fetchPopularTags(): Promise<TagRow[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/spots/tags/popular?limit=30`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json() as { tags: TagRow[] }
    return data.tags ?? []
  } catch {
    return []
  }
}

interface PopularTagsProps {
  activeTag?: string | undefined
  currentParams: Record<string, string | undefined>
}

export async function PopularTags({ activeTag, currentParams }: PopularTagsProps) {
  const tags = await fetchPopularTags()
  if (tags.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Popular tags</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(({ tag, count }) => {
          const isActive = activeTag === tag
          const def = getTagDef(tag)
          const style = getTagStyle(tag)
          const nextParams = new URLSearchParams()
          if (currentParams.q) nextParams.set('q', currentParams.q)
          if (currentParams.city) nextParams.set('city', currentParams.city)
          if (currentParams.category) nextParams.set('category', currentParams.category)
          if (!isActive) nextParams.set('tag', tag)
          const href = `/spots${nextParams.toString() ? `?${nextParams.toString()}` : ''}`

          return (
            <Link
              key={tag}
              href={href}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : [style.bg, style.text, 'border border-[var(--color-border)] hover:border-[var(--color-border-strong)]'],
              )}
            >
              {def?.emoji && <span className="text-[10px]">{def.emoji}</span>}
              {def?.label ?? tag}
              <span className={cn('text-[10px]', isActive ? 'text-amber-800' : 'opacity-60')}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
