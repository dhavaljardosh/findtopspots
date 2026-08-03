import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function StarRating({ rating, max = 5, size = 'md' }: StarRatingProps) {
  const sizeClass = SIZE_CLASSES[size]

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating.toFixed(1)} out of ${max}`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = rating >= i + 1
        const halfFilled = !filled && rating > i && rating < i + 1

        return (
          <span key={i} className="relative inline-flex">
            {/* Empty star base */}
            <Star
              className={cn(sizeClass, 'text-gray-200 fill-gray-200')}
            />
            {/* Filled overlay */}
            {(filled || halfFilled) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? '100%' : `${(rating - i) * 100}%` }}
              >
                <Star
                  className={cn(sizeClass, 'text-amber-400 fill-amber-400')}
                />
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
