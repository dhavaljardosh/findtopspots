import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

export function formatReviewCount(count: number): string {
  if (count === 0) return 'No reviews'
  if (count === 1) return '1 review'
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k reviews`
  return `${count} reviews`
}
