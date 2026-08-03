import posthog from 'posthog-js'

export function trackSpotVoted(spotId: string, category: string, voted: boolean) {
  posthog.capture('spot_voted', { spot_id: spotId, category, voted })
}

export function trackReviewSubmitted(spotId: string, rating: number, isEdit: boolean) {
  posthog.capture('review_submitted', { spot_id: spotId, rating, is_edit: isEdit })
}

export function trackSearchPerformed(query: string, resultCount: number) {
  posthog.capture('search_performed', { query, result_count: resultCount })
}

export function trackAddSpotStarted() {
  posthog.capture('add_spot_started')
}

export function trackAddSpotCompleted(category: string, hasPhoto: boolean) {
  posthog.capture('add_spot_completed', { category, has_photo: hasPhoto })
}

export function trackAddSpotAbandoned(step: number) {
  posthog.capture('add_spot_abandoned', { step })
}
