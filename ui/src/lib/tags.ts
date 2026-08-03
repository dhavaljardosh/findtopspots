export interface TagDef {
  value: string
  label: string
  emoji?: string
}

export interface TagGroup {
  group: string
  tags: TagDef[]
}

export const PREDEFINED_TAG_GROUPS: TagGroup[] = [
  {
    group: 'Cuisine',
    tags: [
      { value: 'indian', label: 'Indian', emoji: '🇮🇳' },
      { value: 'thai', label: 'Thai', emoji: '🇹🇭' },
      { value: 'mexican', label: 'Mexican', emoji: '🇲🇽' },
      { value: 'chinese', label: 'Chinese', emoji: '🥡' },
      { value: 'italian', label: 'Italian', emoji: '🍝' },
      { value: 'japanese', label: 'Japanese', emoji: '🍣' },
      { value: 'korean', label: 'Korean', emoji: '🇰🇷' },
      { value: 'vietnamese', label: 'Vietnamese', emoji: '🍜' },
      { value: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
      { value: 'american', label: 'American', emoji: '🍔' },
      { value: 'middle-eastern', label: 'Middle Eastern', emoji: '🧆' },
      { value: 'ethiopian', label: 'Ethiopian', emoji: '🇪🇹' },
      { value: 'latin', label: 'Latin', emoji: '🌮' },
      { value: 'pizza', label: 'Pizza', emoji: '🍕' },
      { value: 'sushi', label: 'Sushi', emoji: '🍱' },
      { value: 'seafood', label: 'Seafood', emoji: '🦞' },
      { value: 'bbq', label: 'BBQ', emoji: '🍖' },
      { value: 'desserts', label: 'Desserts', emoji: '🍰' },
      { value: 'ice-cream', label: 'Ice Cream', emoji: '🍦' },
      { value: 'coffee', label: 'Coffee', emoji: '☕' },
      { value: 'tea', label: 'Tea', emoji: '🍵' },
      { value: 'bubble-tea', label: 'Bubble Tea', emoji: '🧋' },
      { value: 'juice', label: 'Juice', emoji: '🥤' },
      { value: 'burgers', label: 'Burgers', emoji: '🍔' },
      { value: 'tacos', label: 'Tacos', emoji: '🌮' },
    ],
  },
  {
    group: 'Dietary',
    tags: [
      { value: 'vegetarian', label: 'Vegetarian', emoji: '🥦' },
      { value: 'vegan', label: 'Vegan', emoji: '🌱' },
      { value: 'halal', label: 'Halal', emoji: '☪️' },
      { value: 'kosher', label: 'Kosher', emoji: '✡️' },
      { value: 'gluten-free', label: 'Gluten-Free', emoji: '🌾' },
      { value: 'dairy-free', label: 'Dairy-Free', emoji: '🥛' },
    ],
  },
  {
    group: 'Features',
    tags: [
      { value: 'outdoor-seating', label: 'Outdoor Seating', emoji: '🌿' },
      { value: 'dog-friendly', label: 'Dog Friendly', emoji: '🐶' },
      { value: 'live-music', label: 'Live Music', emoji: '🎵' },
      { value: 'sports-bar', label: 'Sports Bar', emoji: '📺' },
      { value: 'brunch', label: 'Brunch', emoji: '🥞' },
      { value: 'late-night', label: 'Late Night', emoji: '🌙' },
      { value: 'rooftop', label: 'Rooftop', emoji: '🏙️' },
      { value: 'byob', label: 'BYOB', emoji: '🍷' },
      { value: 'family-friendly', label: 'Family Friendly', emoji: '👨‍👩‍👧' },
      { value: 'date-night', label: 'Date Night', emoji: '💑' },
      { value: 'happy-hour', label: 'Happy Hour', emoji: '🍻' },
    ],
  },
]

export const ALL_PREDEFINED_TAGS: TagDef[] = PREDEFINED_TAG_GROUPS.flatMap((g) => g.tags)

export function getTagDef(value: string): TagDef | undefined {
  return ALL_PREDEFINED_TAGS.find((t) => t.value === value)
}

// Color groups for display
const CUISINE_TAGS = new Set(PREDEFINED_TAG_GROUPS[0]!.tags.map((t) => t.value))
const DIETARY_TAGS = new Set(PREDEFINED_TAG_GROUPS[1]!.tags.map((t) => t.value))

export function getTagStyle(value: string): { bg: string; text: string } {
  if (DIETARY_TAGS.has(value))
    return { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' }
  if (CUISINE_TAGS.has(value))
    return { bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-500' }
  return { bg: 'bg-[var(--color-surface-3)]', text: 'text-[var(--color-text-secondary)]' }
}
