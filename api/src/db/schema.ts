import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  real,
  integer,
  index,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const spotCategoryEnum = pgEnum('spot_category', [
  'restaurant',
  'cafe',
  'bar',
  'park',
  'gym',
  'shop',
  'attraction',
  'other',
])

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  username: text('username').unique().notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ─── Spots ───────────────────────────────────────────────────────────────────

export const spots = pgTable(
  'spots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: spotCategoryEnum('category').notNull(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    address: text('address').notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    avgRating: real('avg_rating').default(0).notNull(),
    reviewCount: integer('review_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    createdByIdx: index('spots_created_by_idx').on(table.createdBy),
    categoryIdx: index('spots_category_idx').on(table.category),
  }),
)

// ─── Spot Tags ────────────────────────────────────────────────────────────────

export const spotTags = pgTable(
  'spot_tags',
  {
    spotId: uuid('spot_id')
      .references(() => spots.id, { onDelete: 'cascade' })
      .notNull(),
    tag: text('tag').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.spotId, table.tag] }),
  }),
)

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spotId: uuid('spot_id')
      .references(() => spots.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    rating: integer('rating').notNull(),
    body: text('body').notNull(),
    helpfulCount: integer('helpful_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    spotUserUnique: unique('reviews_spot_user_unique').on(table.spotId, table.userId),
    spotIdIdx: index('reviews_spot_id_idx').on(table.spotId),
    userIdIdx: index('reviews_user_id_idx').on(table.userId),
  }),
)

// ─── Review Votes ─────────────────────────────────────────────────────────────

export const reviewVotes = pgTable(
  'review_votes',
  {
    reviewId: uuid('review_id')
      .references(() => reviews.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // 1 = helpful, -1 = not helpful
    vote: integer('vote').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.reviewId, table.userId] }),
  }),
)

// ─── Spot Photos ──────────────────────────────────────────────────────────────

export const spotPhotos = pgTable(
  'spot_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spotId: uuid('spot_id')
      .references(() => spots.id, { onDelete: 'cascade' })
      .notNull(),
    url: text('url').notNull(),
    uploadedBy: uuid('uploaded_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    spotIdIdx: index('spot_photos_spot_id_idx').on(table.spotId),
  }),
)

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export const bookmarks = pgTable(
  'bookmarks',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    spotId: uuid('spot_id')
      .references(() => spots.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.spotId] }),
  }),
)
