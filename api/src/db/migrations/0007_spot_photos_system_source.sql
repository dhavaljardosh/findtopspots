-- Allow system-seeded photos (Foursquare) with no user uploader
ALTER TABLE "spot_photos" ALTER COLUMN "uploaded_by" DROP NOT NULL;
ALTER TABLE "spot_photos" ADD COLUMN "source" text DEFAULT 'user' NOT NULL;
