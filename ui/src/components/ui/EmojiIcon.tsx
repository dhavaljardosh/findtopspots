interface EmojiIconProps {
  emoji: string
  size?: number
  className?: string
  alt?: string
}

function emojiToOpenMojiHex(emoji: string): string {
  const points: string[] = []
  for (const char of [...emoji]) {
    const cp = char.codePointAt(0)
    // Skip variation selectors (FE0F) and zero-width joiners (200D) for cleaner lookups
    if (cp && cp !== 0xFE0F) {
      points.push(cp.toString(16).toUpperCase())
    }
  }
  return points.join('-')
}

export function EmojiIcon({ emoji, size = 20, className, alt }: EmojiIconProps) {
  const hex = emojiToOpenMojiHex(emoji)
  return (
    <img
      src={`https://openmoji.org/data/color/svg/${hex}.svg`}
      alt={alt ?? emoji}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      decoding="async"
    />
  )
}
