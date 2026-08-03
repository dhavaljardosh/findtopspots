CREATE TABLE "spot_votes" (
	"user_id" uuid NOT NULL,
	"spot_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "spot_votes_user_id_spot_id_pk" PRIMARY KEY("user_id","spot_id")
);
--> statement-breakpoint
ALTER TABLE "spots" ADD COLUMN "vote_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "spot_votes" ADD CONSTRAINT "spot_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spot_votes" ADD CONSTRAINT "spot_votes_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spot_votes_spot_id_idx" ON "spot_votes" USING btree ("spot_id");--> statement-breakpoint
CREATE INDEX "spot_tags_tag_idx" ON "spot_tags" USING btree ("tag");