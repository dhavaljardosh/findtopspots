import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, ilike, or, lt, desc, sql, inArray, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  CreateSpotSchema,
  UpdateSpotSchema,
  SpotQuerySchema,
} from "@fts/types";
import { db } from "../db";
import {
  spots,
  users,
  spotTags,
  spotPhotos,
  externalRatings,
  spotVotes,
} from "../db/schema";
import { requireAuth, getAuth } from "../middleware/auth";
import { searchPlaces, getPlaceById } from "../services/foursquare";
import { getPlaceLiveData, searchByText } from "../services/google-places";
import { getOrSyncUser } from "./users";
import {
  getPresignedUploadUrl,
  buildObjectKey,
  getPublicUrl,
  isAllowedFileType,
  MAX_FILE_SIZE,
} from "../services/storage";

type AuthEnv = {
  Variables: {
    userId: string;
  };
};

export const spotsRouter = new Hono<AuthEnv>();

async function attachPhotos<T extends { id: string }>(
  items: T[],
): Promise<(T & { photos: { id: string; url: string }[] })[]> {
  if (items.length === 0) return items.map((s) => ({ ...s, photos: [] }));
  const ids = items.map((s) => s.id);
  const allPhotos = await db
    .select({ spotId: spotPhotos.spotId, id: spotPhotos.id, url: spotPhotos.url })
    .from(spotPhotos)
    .where(inArray(spotPhotos.spotId, ids));
  const bySpot = new Map<string, { id: string; url: string }[]>();
  for (const p of allPhotos) {
    const arr = bySpot.get(p.spotId) ?? [];
    arr.push({ id: p.id, url: p.url });
    bySpot.set(p.spotId, arr);
  }
  return items.map((s) => ({ ...s, photos: bySpot.get(s.id) ?? [] }));
}

// GET /top-by-category — top N voted spots per category (for home page strips)
// Must be declared before /:id to avoid route collision.
spotsRouter.get("/top-by-category", async (c) => {
  const perCat = Math.min(Number(c.req.query("limit") ?? 6), 12);

  // Fetch enough spots to fill all categories, ordered by voteCount
  const rows = await db.query.spots.findMany({
    where: eq(spots.status, "live"),
    orderBy: [desc(spots.voteCount), desc(spots.avgRating)],
    limit: 200,
  });

  // Group by category, take top perCat each
  const byCategory: Record<string, typeof rows> = {};
  for (const s of rows) {
    const cat = s.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    if (byCategory[cat]!.length < perCat) byCategory[cat]!.push(s);
  }

  // Only include categories that have at least 1 spot with votes
  const result: Record<string, typeof rows> = {};
  for (const [cat, spots] of Object.entries(byCategory)) {
    if (spots.some((s) => s.voteCount > 0)) result[cat] = spots;
    else result[cat] = spots; // include all, let UI decide
  }

  // Attach photos
  const allSpots = Object.values(result).flat();
  const withPhotos = await attachPhotos(allSpots);
  const photoMap = new Map(withPhotos.map((s) => [s.id, s.photos]));

  const enriched: Record<string, unknown[]> = {};
  for (const [cat, catSpots] of Object.entries(result)) {
    enriched[cat] = catSpots.map((s) => ({ ...s, photos: photoMap.get(s.id) ?? [] }));
  }

  return c.json(enriched);
});

// GET /tags/popular — top tags by usage count (for filter UI)
// Must be declared before /:id to avoid route collision.
spotsRouter.get("/tags/popular", async (c) => {
  const limitParam = c.req.query("limit");
  const limit = Math.min(Number(limitParam ?? 20), 50);

  const rows = await db
    .select({ tag: spotTags.tag, count: sql<number>`count(*)::int` })
    .from(spotTags)
    .groupBy(spotTags.tag)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return c.json({ tags: rows });
});

// GET /search/foursquare — proxy Foursquare place search for the UI (no auth)
// Must be declared before /:id to avoid route collision.
spotsRouter.get(
  "/search/foursquare",
  zValidator(
    "query",
    z.object({
      q: z.string().min(1),
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    }),
  ),
  async (c) => {
    const { q, lat, lng } = c.req.valid("query");
    const results = await searchPlaces(q, lat, lng);
    return c.json({ results });
  },
);

// GET / — browse spots
spotsRouter.get("/", zValidator("query", SpotQuerySchema), async (c) => {
  const { q, city, tag, category, limit, cursor, sort } = c.req.valid("query");
  const orderBy = sort === 'recent' || sort === 'new'
    ? [desc(spots.createdAt)]
    : [desc(spots.voteCount), desc(spots.avgRating), desc(spots.reviewCount), desc(spots.createdAt)];

  // Tag filter: subquery — spots that have this tag
  if (tag) {
    const taggedSpotIds = await db
      .select({ spotId: spotTags.spotId })
      .from(spotTags)
      .where(eq(spotTags.tag, tag));
    const ids = taggedSpotIds.map((r) => r.spotId);
    if (ids.length === 0) return c.json({ spots: [], nextCursor: undefined });

    const conditions: SQL[] = [
      eq(spots.status, "live"),
      inArray(spots.id, ids),
    ];
    if (q)
      conditions.push(
        or(
          ilike(spots.name, `%${q}%`),
          ilike(spots.description, `%${q}%`),
          sql`similarity(${spots.name}, ${q}) > 0.15`,
        )!,
      );
    if (category) conditions.push(eq(spots.category, category));
    if (city) conditions.push(ilike(spots.address, `%${city}%`));
    if (cursor) conditions.push(lt(spots.createdAt, new Date(cursor)));

    const rows = await db.query.spots.findMany({
      where: (_, { and }) => and(...conditions),
      orderBy,
      limit: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const spotsWithPhotos = await attachPhotos(items);
    return c.json({
      spots: spotsWithPhotos,
      nextCursor: hasMore ? items.at(-1)?.createdAt?.toISOString() : undefined,
    });
  }

  const conditions: SQL[] = [eq(spots.status, "live")];

  if (q) {
    conditions.push(
      or(
        ilike(spots.name, `%${q}%`),
        ilike(spots.description, `%${q}%`),
        ilike(spots.address, `%${q}%`),
        sql`similarity(${spots.name}, ${q}) > 0.15`,
      )!,
    );
  }

  if (category) {
    conditions.push(eq(spots.category, category));
  }

  if (city) {
    conditions.push(ilike(spots.address, `%${city}%`));
  }

  if (cursor) {
    conditions.push(lt(spots.createdAt, new Date(cursor)));
  }

  const rows = await db.query.spots.findMany({
    where: (_, { and }) => and(...conditions),
    orderBy: q
      ? [desc(sql`similarity(${spots.name}, ${q})`), ...orderBy]
      : orderBy,
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? items.at(-1)?.createdAt?.toISOString()
    : undefined;

  const spotsWithPhotos = await attachPhotos(items);
  return c.json({ spots: spotsWithPhotos, nextCursor });
});

// POST / — create spot
spotsRouter.post(
  "/",
  requireAuth,
  zValidator("json", CreateSpotSchema),
  async (c) => {
    console.log("[spots POST] handler entered");
    const clerkId = getAuth(c);
    console.log("[spots POST] clerkId:", clerkId);
    const body = c.req.valid("json");
    console.log("[spots POST] validated body:", JSON.stringify(body));

    // Read optional external IDs + photo from raw body (not part of Zod schema)
    const rawBody = (await c.req.raw
      .clone()
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const foursquareId =
      typeof rawBody.foursquareId === "string"
        ? rawBody.foursquareId
        : undefined;
    const googlePlaceId =
      typeof rawBody.googlePlaceId === "string"
        ? rawBody.googlePlaceId
        : undefined;
    const rawCoverPhotoUrl =
      typeof rawBody.coverPhotoUrl === "string"
        ? rawBody.coverPhotoUrl
        : undefined;
    console.log("[spots POST] foursquareId:", foursquareId, "googlePlaceId:", googlePlaceId, "coverPhotoUrl:", rawCoverPhotoUrl);

    // Look up the DB user by Clerk ID
    console.log("[spots POST] looking up user for clerkId:", clerkId);
    const user = await getOrSyncUser(clerkId);
    console.log("[spots POST] user found:", user?.id);
    if (!user) return c.json({ error: "User not found" }, 404);

    const { tags, ...spotData } = body;

    console.log("[spots POST] inserting spot:", spotData.name, "category:", spotData.category);
    const [created] = await db
      .insert(spots)
      .values({
        ...spotData,
        description: spotData.description ?? "",
        createdBy: user.id,
        status: "pending", // user submissions need admin approval
        ...(googlePlaceId ? { googlePlaceId } : {}),
        ...(rawCoverPhotoUrl ? { coverPhotoUrl: rawCoverPhotoUrl } : {}),
      })
      .returning();
    console.log("[spots POST] created spot id:", created?.id);

    if (!created) return c.json({ error: "Failed to create spot" }, 500);

    if (tags && tags.length > 0) {
      await db
        .insert(spotTags)
        .values(tags.map((tag) => ({ spotId: created.id, tag })));
    }

    // ── Async enrichment (fire-and-forget; errors don't block response) ──
    if (foursquareId) {
      enrichSpotWithFoursquare(
        created.id,
        foursquareId,
        body.name,
        body.lat,
        body.lng,
        googlePlaceId,
      ).catch((err) => console.error("[spots] enrichment error:", err));
    }

    return c.json(created, 201);
  },
);

// GET /:id/photo — redirect to Google Places cover photo (display-only, never stored)
spotsRouter.get("/:id/photo", async (c) => {
  const id = c.req.param("id");
  const spot = await db.query.spots.findFirst({ where: eq(spots.id, id) });
  if (!spot?.googlePlaceId) return c.json({ error: "No photo available" }, 404);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return c.json({ error: "No API key" }, 503);

  // Fetch place fields to get photo name
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(spot.googlePlaceId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos",
      },
    },
  );

  if (!res.ok) return c.json({ error: "Photo fetch failed" }, 502);

  const data = (await res.json()) as { photos?: Array<{ name?: string }> };
  const photoName = data.photos?.[0]?.name;
  if (!photoName) return c.json({ error: "No photo" }, 404);

  // Redirect to Google-hosted media (complies with no-store policy)
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=800&skipHttpRedirect=false`;
  return c.redirect(photoUrl, 302);
});

const EXTERNAL_CACHE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// GET /:id/external — fetch live Google data for a spot (cached 24h in externalRatings)
spotsRouter.get("/:id/external", async (c) => {
  const id = c.req.param("id");

  const spot = await db.query.spots.findFirst({ where: eq(spots.id, id) });
  if (!spot) {
    return c.json({ error: "Spot not found" }, 404);
  }

  if (!spot.googlePlaceId) {
    return c.json({
      isOpenNow: null,
      hours: null,
      googleRating: null,
      googleReviewCount: null,
      priceLevel: null,
    });
  }

  // Check cache — return if fetched within last 24h
  const cached = await db.query.externalRatings.findFirst({
    where: (er, { and, eq: eqFn }) =>
      and(eqFn(er.spotId, id), eqFn(er.source, "google")),
  });

  const cacheAge = cached?.fetchedAt
    ? Date.now() - new Date(cached.fetchedAt).getTime()
    : Infinity;

  if (cached && cacheAge < EXTERNAL_CACHE_TTL_MS) {
    return c.json({
      isOpenNow: cached.isOpenNow ?? null,
      hours: cached.hours ?? null,
      googleRating: cached.rating ?? null,
      googleReviewCount: cached.reviewCount ?? null,
      priceLevel: cached.priceLevel ?? null,
    });
  }

  // Cache miss or stale — call Google
  const liveData = await getPlaceLiveData(spot.googlePlaceId);

  // Upsert into cache
  await db
    .insert(externalRatings)
    .values({
      spotId: id,
      source: "google",
      rating: liveData.googleRating,
      reviewCount: liveData.googleReviewCount,
      isOpenNow: liveData.isOpenNow,
      hours: liveData.hours,
      priceLevel: liveData.priceLevel,
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [externalRatings.spotId, externalRatings.source],
      set: {
        rating: liveData.googleRating,
        reviewCount: liveData.googleReviewCount,
        isOpenNow: liveData.isOpenNow,
        hours: liveData.hours,
        priceLevel: liveData.priceLevel,
        fetchedAt: new Date(),
      },
    });

  return c.json(liveData);
});

// POST /:id/photos/presign — get presigned URL for direct R2 upload
spotsRouter.post("/:id/photos/presign", requireAuth, async (c) => {
  const clerkId = getAuth(c);
  const spotId = c.req.param("id");
  const { contentType, filename } = await c.req.json<{
    contentType: string;
    filename: string;
  }>();

  if (!isAllowedFileType(contentType)) {
    return c.json(
      { error: "File type not allowed. Use JPEG, PNG, WebP, or AVIF." },
      400,
    );
  }

  const user = await getOrSyncUser(clerkId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const spot = await db.query.spots.findFirst({ where: eq(spots.id, spotId) });
  if (!spot) return c.json({ error: "Spot not found" }, 404);

  const key = buildObjectKey("spots", user.id, filename);
  const uploadUrl = await getPresignedUploadUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  return c.json({ uploadUrl, publicUrl, key, maxBytes: MAX_FILE_SIZE });
});

// POST /:id/photos/confirm — after upload, register photo in DB
spotsRouter.post("/:id/photos/confirm", requireAuth, async (c) => {
  const clerkId = getAuth(c);
  const spotId = c.req.param("id");
  const { key } = await c.req.json<{ key: string }>();

  const user = await getOrSyncUser(clerkId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const publicUrl = getPublicUrl(key);
  const [photo] = await db
    .insert(spotPhotos)
    .values({ spotId, url: publicUrl, uploadedBy: user.id })
    .returning();

  return c.json(photo, 201);
});

// GET /:id — fetch spot by id
spotsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const spot = await db.query.spots.findFirst({
      where: eq(spots.id, id),
    });

    if (!spot) {
      return c.json({ error: "Spot not found" }, 404);
    }

    const [tags, photos] = await Promise.all([
      db.select().from(spotTags).where(eq(spotTags.spotId, id)),
      db
        .select({ id: spotPhotos.id, url: spotPhotos.url })
        .from(spotPhotos)
        .where(eq(spotPhotos.spotId, id)),
    ]);

    // Include user's vote status if authenticated
    const authHeader = c.req.header("Authorization");
    let userVoted = false;
    let dbUserId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { verifyToken } = await import("@clerk/backend");
        const payload = await verifyToken(authHeader.slice(7), {
          secretKey: process.env.CLERK_SECRET_KEY!,
        });
        const user = await getOrSyncUser(payload.sub);
        if (user) {
          dbUserId = user.id;
          const vote = await db.query.spotVotes.findFirst({
            where: (sv, { and, eq: eqFn }) =>
              and(eqFn(sv.userId, user.id), eqFn(sv.spotId, id)),
          });
          userVoted = Boolean(vote);
        }
      } catch {
        // unauthenticated — fine
      }
    }

    // Fire-and-forget view count
    db.update(spots)
      .set({ viewCount: sql<number>`${spots.viewCount} + 1` })
      .where(eq(spots.id, id))
      .catch(() => {})

    return c.json({ ...spot, tags: tags.map((t) => t.tag), photos, userVoted, dbUserId });
  } catch (err) {
    console.error(
      `[spots] GET /:id error for ${id}:`,
      err instanceof Error ? err.message : err,
    );
    return c.json({ error: "Failed to load spot. Please try again." }, 500);
  }
});

// POST /:id/track — record unique daily view (no auth, fire-and-forget by client)
spotsRouter.post("/:id/track", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ sid?: string }>().catch(() => ({ sid: undefined }));
  const sid = body.sid;
  if (!sid || sid.length > 64) return c.json({ ok: true }); // ignore missing/bad sid

  // Only insert; ON CONFLICT DO NOTHING deduplicates per (spot, session, date)
  db.execute(
    sql`INSERT INTO spot_views (spot_id, session_id, viewed_date)
        VALUES (${id}::uuid, ${sid}, CURRENT_DATE)
        ON CONFLICT DO NOTHING`
  ).catch(() => {});

  return c.json({ ok: true });
});

// POST /:id/vote — toggle upvote (auth required)
spotsRouter.post("/:id/vote", requireAuth, async (c) => {
  const clerkId = getAuth(c);
  const id = c.req.param("id");

  const user = await getOrSyncUser(clerkId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const spot = await db.query.spots.findFirst({ where: eq(spots.id, id) });
  if (!spot) return c.json({ error: "Spot not found" }, 404);

  const existing = await db.query.spotVotes.findFirst({
    where: (sv, { and, eq: eqFn }) =>
      and(eqFn(sv.userId, user.id), eqFn(sv.spotId, id)),
  });

  if (existing) {
    // Un-vote
    await db
      .delete(spotVotes)
      .where(sql`user_id = ${user.id} AND spot_id = ${id}`);
    const [updated] = await db
      .update(spots)
      .set({ voteCount: sql<number>`GREATEST(0, ${spots.voteCount} - 1)` })
      .where(eq(spots.id, id))
      .returning({ voteCount: spots.voteCount });
    return c.json({ voted: false, voteCount: updated?.voteCount ?? 0 });
  } else {
    // Vote
    await db.insert(spotVotes).values({ userId: user.id, spotId: id });
    const [updated] = await db
      .update(spots)
      .set({ voteCount: sql<number>`${spots.voteCount} + 1` })
      .where(eq(spots.id, id))
      .returning({ voteCount: spots.voteCount });
    return c.json({ voted: true, voteCount: updated?.voteCount ?? 0 });
  }
});

// PUT /:id — update spot
spotsRouter.put(
  "/:id",
  requireAuth,
  zValidator("json", UpdateSpotSchema),
  async (c) => {
    const clerkId = getAuth(c);
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const user = await getOrSyncUser(clerkId);
    if (!user) return c.json({ error: "User not found" }, 404);

    const spot = await db.query.spots.findFirst({ where: eq(spots.id, id) });
    if (!spot) {
      return c.json({ error: "Spot not found" }, 404);
    }

    if (spot.createdBy !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { tags, ...spotData } = body;

    const [updated] = await db
      .update(spots)
      .set(spotData)
      .where(eq(spots.id, id))
      .returning();

    // Replace tags if provided
    if (tags !== undefined) {
      await db.delete(spotTags).where(eq(spotTags.spotId, id));
      if (tags.length > 0) {
        await db
          .insert(spotTags)
          .values(tags.map((tag) => ({ spotId: id, tag })));
      }
    }

    return c.json(updated);
  },
);

// DELETE /:id — delete spot
spotsRouter.delete("/:id", requireAuth, async (c) => {
  const clerkId = getAuth(c);
  const id = c.req.param("id");

  const user = await getOrSyncUser(clerkId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const spot = await db.query.spots.findFirst({ where: eq(spots.id, id) });
  if (!spot) {
    return c.json({ error: "Spot not found" }, 404);
  }

  if (spot.createdBy !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db.delete(spots).where(eq(spots.id, id));

  return c.json({ success: true });
});

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Enrich a freshly-created spot with Foursquare data and optionally a Google Place ID.
 * Runs after the POST / response is sent.
 */
async function enrichSpotWithFoursquare(
  spotId: string,
  foursquareId: string,
  spotName: string,
  lat: number,
  lng: number,
  knownGooglePlaceId?: string,
): Promise<void> {
  const fsqData = await getPlaceById(foursquareId);

  const updateFields: Partial<typeof spots.$inferInsert> = { foursquareId };

  // Set coverPhotoUrl from Foursquare if the spot doesn't have one yet
  if (fsqData?.coverPhotoUrl) {
    const existing = await db.query.spots.findFirst({
      where: eq(spots.id, spotId),
      columns: { coverPhotoUrl: true },
    });
    if (!existing?.coverPhotoUrl) {
      (updateFields as Record<string, unknown>)["coverPhotoUrl"] =
        fsqData.coverPhotoUrl;
    }
  }

  // Use provided Google Place ID if available, otherwise look it up
  if (knownGooglePlaceId) {
    (updateFields as Record<string, unknown>)["googlePlaceId"] =
      knownGooglePlaceId;
  } else {
    try {
      const googleResults = await searchByText(spotName, lat, lng);
      const firstResult = googleResults[0];
      if (firstResult) {
        (updateFields as Record<string, unknown>)["googlePlaceId"] =
          firstResult.googlePlaceId;
      }
    } catch (err) {
      console.error("[spots] Google Place ID lookup error:", err);
    }
  }

  // Update the spot record with external IDs + photo
  await db.update(spots).set(updateFields).where(eq(spots.id, spotId));

  // 4. Upsert Foursquare rating into externalRatings table
  if (fsqData?.rating !== undefined) {
    await db
      .insert(externalRatings)
      .values({
        spotId,
        source: "foursquare",
        rating: fsqData.rating,
        reviewCount: null,
      })
      .onConflictDoUpdate({
        target: [externalRatings.spotId, externalRatings.source],
        set: {
          rating: fsqData.rating,
          fetchedAt: new Date(),
        },
      });
  }
}
