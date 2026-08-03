-- Spot view count
ALTER TABLE "spots" ADD COLUMN "view_count" integer NOT NULL DEFAULT 0;

-- Review editing tracking
ALTER TABLE "reviews" ADD COLUMN "updated_at" timestamp;
ALTER TABLE "reviews" ADD COLUMN "is_edited" boolean NOT NULL DEFAULT false;
