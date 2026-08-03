const ADJECTIVES = [
  'Swift', 'Bright', 'Bold', 'Calm', 'Wild', 'Free', 'Kind', 'Wise',
  'Cool', 'Blue', 'Gold', 'Silver', 'Brave', 'Sharp', 'Keen', 'Quick',
  'Quiet', 'Fierce', 'Gentle', 'Warm', 'Clear', 'Dark', 'Deep', 'Fair',
  'Glad', 'Grand', 'Light', 'Proud', 'True', 'Zesty',
]

const NOUNS = [
  'Fox', 'Star', 'Wave', 'Hawk', 'Bear', 'Wolf', 'Moon', 'Pine',
  'River', 'Storm', 'Eagle', 'Tiger', 'Falcon', 'Raven', 'Panda',
  'Lynx', 'Crane', 'Finch', 'Heron', 'Drake', 'Comet', 'Flare',
  'Ember', 'Frost', 'Blaze', 'Stone', 'Brook', 'Grove', 'Peak', 'Vale',
]

// 8 avatar slots (index 0–7) — UI maps these to emoji + colors
export const AVATAR_COUNT = 8

/**
 * Derives a deterministic display name and avatar index from a hex hash string.
 * Pattern: SwiftFox4821  (adjective + noun + 4-digit number)
 */
export function anonNameFromHash(hexHash: string): { displayName: string; avatarIndex: number } {
  const adjIdx = parseInt(hexHash.slice(0, 2), 16) % ADJECTIVES.length
  const nounIdx = parseInt(hexHash.slice(2, 4), 16) % NOUNS.length
  const digits = (parseInt(hexHash.slice(4, 8), 16) % 9000) + 1000
  const avatarIndex = parseInt(hexHash.slice(8, 10), 16) % AVATAR_COUNT

  const displayName = `${ADJECTIVES[adjIdx]}${NOUNS[nounIdx]}${digits}`
  return { displayName, avatarIndex }
}
