-- Composite index for the main spots browse query (status + sort columns)
CREATE INDEX IF NOT EXISTS "spots_status_rating_idx" ON "spots" ("status", "avg_rating" DESC, "review_count" DESC);--> statement-breakpoint

-- Composite index for category-filtered browse
CREATE INDEX IF NOT EXISTS "spots_category_rating_idx" ON "spots" ("category", "avg_rating" DESC, "review_count" DESC);--> statement-breakpoint

-- Composite index for cursor pagination on spots
CREATE INDEX IF NOT EXISTS "spots_status_created_at_idx" ON "spots" ("status", "created_at" DESC);--> statement-breakpoint

-- Full-text search index on spot name + description (used by ilike queries)
CREATE INDEX IF NOT EXISTS "spots_name_idx" ON "spots" ("name");--> statement-breakpoint

-- Composite index for comments: fetch top-level + sort by recency
CREATE INDEX IF NOT EXISTS "comments_spot_parent_created_idx" ON "comments" ("spot_id", "parent_id", "created_at" DESC);--> statement-breakpoint

-- Composite index for reviews: spot listing sorted by recency
CREATE INDEX IF NOT EXISTS "reviews_spot_created_idx" ON "reviews" ("spot_id", "created_at" DESC);--> statement-breakpoint

-- Index for user public profile lookups by username
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");
