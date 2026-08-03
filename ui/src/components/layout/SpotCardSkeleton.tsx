export function SpotCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse">
      {/* Photo placeholder */}
      <div className="h-40 w-full bg-gray-200" />

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Category badge */}
        <div className="h-5 w-20 rounded-full bg-gray-200" />

        {/* Name */}
        <div className="h-5 w-3/4 rounded bg-gray-200" />

        {/* Address */}
        <div className="h-4 w-full rounded bg-gray-100" />

        {/* Rating row */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-3.5 w-3.5 rounded bg-gray-200" />
            ))}
          </div>
          <div className="h-4 w-6 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
