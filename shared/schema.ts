import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  unique,
  json,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // Hashed password for email/password auth (nullable for OAuth users)
  googleId: varchar("google_id").unique(), // Google OAuth ID (nullable for email/password users)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default('owner'),
  
  // Restaurant owner fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default('trial'),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  
  // Platform-wide account status (admin suspend/activate) and login tracking
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants table - Multi-tenant core
// Business types a merchant storefront can be. Drives catalog terminology/fields —
// e.g. "Menu" vs "Products", and which vertical-specific catalog attributes apply.
// "restaurant" was removed as a selectable vertical — this is a pure product-
// ecommerce platform now. Any pre-existing row still stored as "restaurant"
// degrades gracefully to "retail" via getBusinessTypeConfig's fallback.
export const BUSINESS_TYPES = ['grocery', 'pharmacy', 'flowers', 'retail'] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  subdomain: varchar("subdomain", { length: 255 }).unique(),
  businessType: varchar("business_type", { length: 50 }).notNull().default('retail'),
  customDomain: varchar("custom_domain", { length: 255 }).unique(),
  description: text("description"),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  openingHours: jsonb("opening_hours"),
  themeSettings: jsonb("theme_settings"),
  marketingSettings: jsonb("marketing_settings"),
  primaryColor: varchar("primary_color", { length: 7 }),
  secondaryColor: varchar("secondary_color", { length: 7 }),
  accentColor: varchar("accent_color", { length: 7 }),
  stripePublicKey: text("stripe_public_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeAccountId: text("stripe_account_id"),
  paypalClientId: text("paypal_client_id"),
  paypalClientSecret: text("paypal_client_secret"),
  paypalMerchantId: text("paypal_merchant_id"),
  paymentMethods: jsonb("payment_methods"),
  orderTypes: jsonb("order_types").default('{"pickup": true, "shipping": true}'),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  country: varchar("country", { length: 100 }).default('United States'),
  timezone: varchar("timezone", { length: 100 }).default('UTC'),
  platformLanguage: varchar("platform_language", { length: 10 }).default('en'),
  storefrontLanguage: varchar("storefront_language", { length: 10 }).default('en'),
  enabledLanguages: text("enabled_languages").array().default(sql`ARRAY['en']`), // Languages enabled for storefront
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('0.00'),
  taxIncludedInPrice: boolean("tax_included_in_price").default(false),
  taxLabel: varchar("tax_label", { length: 50 }).default('Tax'),
  // Marketing Pixels & Tracking
  metaPixelId: varchar("meta_pixel_id", { length: 100 }),
  tiktokPixelId: varchar("tiktok_pixel_id", { length: 100 }),
  googleAnalyticsId: varchar("google_analytics_id", { length: 100 }),
  googleAdsId: varchar("google_ads_id", { length: 100 }),
  // Domain Verification
  metaVerificationCode: text("meta_verification_code"),
  // Storefront SEO (Tier 5) — drives <title> / <meta description> / social preview
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  seoImageUrl: text("seo_image_url"),
  // Storefront CMS (Tier 7)
  // storefrontNav: { items: [{ id, label, type: 'home'|'menu'|'collection'|'page'|'blog'|'shop'|'url', value?, external? }] }
  storefrontNav: jsonb("storefront_nav"),
  // announcement: { enabled, text, linkLabel?, linkUrl? }
  announcement: jsonb("announcement"),
  // Manual Access Override (Platform Admin)
  manuallyGrantedAccess: boolean("manually_granted_access").default(false),
  accessGrantedBy: varchar("access_granted_by"), // Admin user ID who granted access
  accessGrantedAt: timestamp("access_granted_at"),
  accessNotes: text("access_notes"),
  isActive: boolean("is_active").notNull().default(true),
  // Geocoded coordinates (derived from address)
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Settings - Admin-controlled global settings
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  valueType: varchar("value_type", { length: 50 }).notNull().default('string'), // string, number, boolean, json
  description: text("description"),
  category: varchar("category", { length: 100 }).default('general'), // general, billing, features, limits
  isEditable: boolean("is_editable").notNull().default(true),
  updatedBy: varchar("updated_by"), // Admin user ID who last updated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menus - Menu grouping (Breakfast, Lunch, Dinner, etc.)
export const menus = pgTable("menus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0),
  visibility: varchar("visibility", { length: 50 }).notNull().default('public'),
  displayPeriodStart: timestamp("display_period_start"),
  displayPeriodEnd: timestamp("display_period_end"),
  daysOfWeek: text("days_of_week").array(),
  hoursStart: varchar("hours_start", { length: 10 }),
  hoursEnd: varchar("hours_end", { length: 10 }),
  timezone: varchar("timezone", { length: 100 }).default('UTC'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint: slug must be unique per restaurant
  uniqueSlug: unique().on(table.restaurantId, table.slug),
  // Performance indexes
  restaurantIdx: index("menus_restaurant_idx").on(table.restaurantId),
  restaurantActiveIdx: index("menus_restaurant_active_idx").on(table.restaurantId, table.isActive),
}));

// Menu Categories
export const menuCategories = pgTable("menu_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  menuId: varchar("menu_id").references(() => menus.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  restaurantIdx: index("menu_categories_restaurant_idx").on(table.restaurantId),
  menuIdx: index("menu_categories_menu_idx").on(table.menuId),
  restaurantMenuIdx: index("menu_categories_restaurant_menu_idx").on(table.restaurantId, table.menuId),
}));

// Menu Items - Enhanced for UberEats-style capabilities
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  menuId: varchar("menu_id").references(() => menus.id, { onDelete: 'set null' }),
  categoryId: varchar("category_id").notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
  sku: varchar("sku", { length: 100 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }),
  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  compareAtPriceCents: integer("compare_at_price_cents"),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  costCents: integer("cost_cents"),
  // Display & Availability
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  visibleOnline: boolean("visible_online").notNull().default(true),
  visiblePhone: boolean("visible_phone").notNull().default(true),
  visibleInStore: boolean("visible_in_store").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0),
  // Operational details
  prepTimeMinutes: integer("prep_time_minutes"),
  taxClass: varchar("tax_class", { length: 50 }).default('standard'),
  // Nutritional & Dietary (restaurant-specific; unused/null for other business types)
  calories: integer("calories"),
  allergensJson: jsonb("allergens_json"),
  tags: text("tags").array(),
  // Vertical-specific structured data — shape depends on the owning restaurant's businessType.
  // Pharmacy: { requiresPrescription, activeIngredient, dosageForm, packSize }
  // Flowers: { occasion, stemCount, careInstructions }
  // Grocery/Retail: { unit, requiresRefrigeration, brand }
  attributes: jsonb("attributes"),
  // Inventory management
  stockCount: integer("stock_count"),
  outOfStockAction: varchar("out_of_stock_action", { length: 50 }).default('hide'),
  // External integrations
  externalId: varchar("external_id", { length: 255 }),
  // Marketing tactics - per item configuration
  upsellItemIds: text("upsell_item_ids").array(),
  crossSellItemIds: text("cross_sell_item_ids").array(),
  downsellItemIds: text("downsell_item_ids").array(),
  marketingTactics: jsonb("marketing_tactics"),
  // Modifiers/Options configuration (legacy JSONB - migrating to itemOptions table)
  options: jsonb("options"),
  // Merchandising / SEO (Tier 5) — URL handle + search-result metadata for the
  // storefront product page. handle is unique per restaurant when set.
  handle: varchar("handle", { length: 255 }),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  // Variants (Tier 8) — when true the item is sold as distinct product_variants,
  // each with its own price / SKU / stock. variantOptions names the axes, e.g.
  // ["Size", "Color"].
  hasVariants: boolean("has_variants").notNull().default(false),
  variantOptions: jsonb("variant_options"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraints
  uniqueSku: unique().on(table.restaurantId, table.sku),
  uniqueHandle: unique("menu_items_restaurant_handle_unique").on(table.restaurantId, table.handle),
  uniqueExternalId: unique().on(table.restaurantId, table.externalId),
  // Performance indexes
  restaurantIdx: index("menu_items_restaurant_idx").on(table.restaurantId),
  menuIdx: index("menu_items_menu_idx").on(table.menuId),
  categoryIdx: index("menu_items_category_idx").on(table.categoryId),
  restaurantMenuIdx: index("menu_items_restaurant_menu_idx").on(table.restaurantId, table.menuId),
  restaurantCategoryIdx: index("menu_items_restaurant_category_idx").on(table.restaurantId, table.categoryId),
  availabilityIdx: index("menu_items_availability_idx").on(table.restaurantId, table.isAvailable),
}));

// Collections (Tier 5) — curated, cross-category groupings of products, shown as
// sections on the storefront and reachable at /store/:slug/c/:handle. Independent
// of menu categories (a product can belong to any number of collections).
export const collections = pgTable("collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  handle: varchar("handle", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  showOnStorefront: boolean("show_on_storefront").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  // SEO
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_collections_restaurant").on(table.restaurantId),
  unique("collections_restaurant_handle_unique").on(table.restaurantId, table.handle),
]);

export const collectionItems = pgTable("collection_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: varchar("collection_id").notNull().references(() => collections.id, { onDelete: 'cascade' }),
  menuItemId: varchar("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_collection_items_collection").on(table.collectionId),
  unique("collection_items_unique").on(table.collectionId, table.menuItemId),
]);

// Storefront CMS (Tier 7) — custom content pages: About, FAQ, Terms, Privacy…
// body is Markdown. Reachable at /store/:slug/pages/:handle.
export const storefrontPages = pgTable("storefront_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  handle: varchar("handle", { length: 255 }).notNull(),
  body: text("body"),
  isPublished: boolean("is_published").notNull().default(false),
  showInFooter: boolean("show_in_footer").notNull().default(false),
  // Optional footer column label (e.g. "Help", "Company", "Legal"). null/unset =
  // today's single flat footer row — fully backward compatible.
  footerGroup: varchar("footer_group", { length: 100 }),
  sortOrder: integer("sort_order").notNull().default(0),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_storefront_pages_restaurant").on(table.restaurantId),
  unique("storefront_pages_restaurant_handle_unique").on(table.restaurantId, table.handle),
]);

// Storefront CMS — blog posts. Reachable at /store/:slug/blog and /blog/:handle.
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  handle: varchar("handle", { length: 255 }).notNull(),
  excerpt: varchar("excerpt", { length: 500 }),
  body: text("body"),
  coverImageUrl: text("cover_image_url"),
  author: varchar("author", { length: 255 }),
  tags: text("tags").array(),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_blog_posts_restaurant").on(table.restaurantId),
  unique("blog_posts_restaurant_handle_unique").on(table.restaurantId, table.handle),
]);

// Tables
export const tables = pgTable("tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  tableNumber: varchar("table_number", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }),
  capacity: integer("capacity").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reservations
export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  tableId: varchar("table_id").references(() => tables.id, { onDelete: 'set null' }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  partySize: integer("party_size").notNull(),
  reservationDate: timestamp("reservation_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id, { onDelete: 'cascade' }),
  tableId: varchar("table_id").references(() => tables.id, { onDelete: 'set null' }),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  orderType: varchar("order_type", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  // Links the order to a customer profile (guest or registered). Populated at
  // checkout; drives order history, re-order, loyalty and segmentation.
  customerId: varchar("customer_id").references((): any => customers.id, { onDelete: 'set null' }),
  // Rewards applied to this order (Tier 2)
  loyaltyPointsRedeemed: integer("loyalty_points_redeemed").notNull().default(0),
  loyaltyDiscount: decimal("loyalty_discount", { precision: 10, scale: 2 }).notNull().default('0'),
  storeCreditUsed: decimal("store_credit_used", { precision: 10, scale: 2 }).notNull().default('0'),
  // Gift card applied to this order (Tier 4)
  giftCardCode: varchar("gift_card_code", { length: 40 }),
  giftCardAmount: decimal("gift_card_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  // Total refunded so far across all refund records (Tier 3). paymentStatus moves to
  // 'partially_refunded' or 'refunded' as this grows toward `total`.
  refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  // Drafts: a merchant-built order (phone/invoice) that isn't in the kitchen queue yet.
  // status stays 'draft' until finalized, then becomes 'pending'/'confirmed'.
  isDraft: boolean("is_draft").notNull().default(false),
  shippingAddress: text("shipping_address"),
  deliveryCountry: varchar("delivery_country", { length: 100 }),
  deliveryCity: varchar("delivery_city", { length: 100 }),
  deliveryAddress: text("delivery_address"),
  // Geocoded coordinates (derived from delivery address)
  deliveryLat: decimal("delivery_lat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("delivery_lng", { precision: 10, scale: 7 }),
  // Optional pickup override (e.g. a merchant fulfilling from a different location than their storefront address)
  pickupName: varchar("pickup_name", { length: 255 }),
  pickupPhone: varchar("pickup_phone", { length: 50 }),
  pickupAddress: text("pickup_address"),
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }),
  packageDescription: text("package_description"), // free-text description of what's being delivered
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }).default('0'),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  promoCode: varchar("promo_code", { length: 100 }),
  promoDiscount: decimal("promo_discount", { precision: 10, scale: 2 }).default('0'),
  // Marketing channel attributed at checkout time, from the customer's most recent
  // storefront_sessions row (same-browser match via visitorId). Null = unattributed
  // (no matching session, or order predates this feature — never backfilled).
  channel: varchar("channel", { length: 20 }),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default('pending'),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentIntentId: varchar("payment_intent_id", { length: 255 }),
  paymentProvider: varchar("payment_provider", { length: 50 }),
  platformCaptureStatus: varchar("platform_capture_status", { length: 50 }).default('pending'),
  restaurantShare: decimal("restaurant_share", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  batchId: varchar("batch_id"),
  pickupTime: timestamp("pickup_time"),
  deliveryTime: timestamp("delivery_time"),
  estimatedPickupTime: timestamp("estimated_pickup_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  // Shipping/fulfillment tracking
  trackingNumber: varchar("tracking_number", { length: 255 }),
  shippingCarrier: varchar("shipping_carrier", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_orders_restaurant").on(table.restaurantId),
  index("idx_orders_status").on(table.status),
]);

// Order Items (supports both menu items and bundles)
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id),
  bundleId: varchar("bundle_id").references(() => bundles.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  selectedOptions: json("selected_options"),
  notes: text("notes"),
  // Tier 3 — how many units of this line have been refunded/returned so far.
  quantityRefunded: integer("quantity_refunded").notNull().default(0),
  // Tier 8 — the specific product variant purchased, if the item has variants.
  variantId: varchar("variant_id"),
  variantName: varchar("variant_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product Variants (Tier 8) — distinct purchasable units of a menu item.
export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  menuItemId: varchar("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(), // e.g. "Large / Red"
  options: jsonb("options"), // { Size: "Large", Color: "Red" }
  priceCents: integer("price_cents").notNull(),
  sku: varchar("sku", { length: 100 }),
  stockCount: integer("stock_count"), // null = not tracked
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_product_variants_item").on(table.menuItemId),
  index("idx_product_variants_restaurant").on(table.restaurantId),
]);

// Order Refunds (Tier 3) — one row per refund action against an order. An order can
// have several partial refunds. `method` decides where the money goes.
export const orderRefunds = pgTable("order_refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  method: varchar("method", { length: 40 }).notNull().default('original_payment'), // 'original_payment' | 'store_credit' | 'manual'
  restock: boolean("restock").notNull().default(false),
  // [{ orderItemId, quantity }] — the returned lines, if the merchant itemised the refund
  items: jsonb("items"),
  stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_order_refunds_order").on(table.orderId),
  index("idx_order_refunds_restaurant").on(table.restaurantId),
]);

// Order Events (Tier 3) — an append-only timeline shown in the order detail view.
export const orderEvents = pgTable("order_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // 'created' | 'status' | 'driver' | 'refund' | 'note' | 'payment' | 'draft'
  message: text("message").notNull(),
  meta: jsonb("meta"),
  createdBy: varchar("created_by"),
  actorType: varchar("actor_type", { length: 20 }).default('merchant'), // 'merchant' | 'customer' | 'driver' | 'system'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_order_events_order").on(table.orderId),
]);

// Staff
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: varchar("unit", { length: 50 }).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Payment Settings - Global Stripe/PayPal credentials
export const platformPaymentSettings = pgTable("platform_payment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stripePublicKey: text("stripe_public_key"),
  stripeSecretKey: text("stripe_secret_key"),
  paypalClientId: text("paypal_client_id"),
  paypalClientSecret: text("paypal_client_secret"),
  platformFeePercentage: decimal("platform_fee_percentage", { precision: 5, scale: 2 }).default('2.00'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity Logs - Track all admin actions across the platform
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  actionType: varchar("action_type", { length: 100 }).notNull(), // e.g., 'restaurant_deleted', 'driver_approved', 'subscription_cancelled'
  actionCategory: varchar("action_category", { length: 50 }).notNull(), // e.g., 'restaurant', 'driver', 'subscription', 'user', 'payout', 'review'
  targetId: varchar("target_id", { length: 255 }), // ID of the affected entity
  targetType: varchar("target_type", { length: 50 }), // e.g., 'restaurant', 'user', 'subscription'
  targetName: varchar("target_name", { length: 255 }), // Human-readable name of the target
  description: text("description").notNull(), // Human-readable description of the action
  metadata: jsonb("metadata"), // Additional context (old values, new values, etc.)
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurant Payout Accounts - Bank details for restaurant payouts
export const restaurantPayoutAccounts = pgTable("restaurant_payout_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().unique().references(() => restaurants.id, { onDelete: 'cascade' }),
  accountHolderName: varchar("account_holder_name", { length: 255 }),
  bankName: varchar("bank_name", { length: 255 }),
  accountNumber: varchar("account_number", { length: 100 }),
  routingNumber: varchar("routing_number", { length: 50 }),
  iban: varchar("iban", { length: 50 }),
  swiftCode: varchar("swift_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  payoutSchedule: varchar("payout_schedule", { length: 20 }).notNull().default('weekly'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Earnings Ledger - Per-order payment splits and tracking
export const earningsLedger = pgTable("earnings_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  restaurantShare: decimal("restaurant_share", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  paymentProvider: varchar("payment_provider", { length: 50 }).notNull(),
  paymentIntentId: varchar("payment_intent_id", { length: 255 }),
  platformCaptureStatus: varchar("platform_capture_status", { length: 50 }).notNull().default('pending'),
  restaurantPayoutStatus: varchar("restaurant_payout_status", { length: 50 }).notNull().default('pending'),
  restaurantPaidAt: timestamp("restaurant_paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payout Runs - Batched restaurant payouts
export const payoutRuns = pgTable("payout_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  payoutProvider: varchar("payout_provider", { length: 50 }).notNull(),
  payoutTransactionId: varchar("payout_transaction_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  failureReason: text("failure_reason"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payout Run Ledger Entries - Join table for payout runs and earnings ledger
export const payoutRunLedgerEntries = pgTable("payout_run_ledger_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payoutRunId: varchar("payout_run_id").notNull().references(() => payoutRuns.id, { onDelete: 'cascade' }),
  ledgerEntryId: varchar("ledger_entry_id").notNull().references(() => earningsLedger.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers - Customer profiles for marketing, loyalty, and storefront accounts.
// Scoped per-merchant: the same person shopping at two stores has two rows.
// A row with no passwordHash is a "guest" customer (created at checkout);
// setting a password upgrades it to a real account.
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  emailVerifiedAt: timestamp("email_verified_at"),
  // Store credit balance in the smallest currency unit (cents). Ledger lives in
  // customer_credit_transactions. Refunds-to-credit, referral rewards and merchant
  // adjustments all land here.
  storeCreditCents: integer("store_credit_cents").notNull().default(0),
  orderType: varchar("order_type", { length: 50 }).default('pickup'),
  signupSource: varchar("signup_source", { length: 100 }),
  // "MM-DD" — powers the birthday campaign trigger (Tier 8). Year is not stored.
  birthday: varchar("birthday", { length: 5 }),
  firstOrderAt: timestamp("first_order_at"),
  lastOrderAt: timestamp("last_order_at"),
  ordersCount: integer("orders_count").notNull().default(0),
  lifetimeValueCents: integer("lifetime_value_cents").notNull().default(0),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customers_restaurant_email").on(table.restaurantId, table.email),
  index("idx_customers_restaurant_phone").on(table.restaurantId, table.phone),
]);

// Customer Addresses - saved delivery addresses for a storefront account
export const customerAddresses = pgTable("customer_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  label: varchar("label", { length: 100 }),
  recipientName: varchar("recipient_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  addressLine: text("address_line").notNull(),
  notes: text("notes"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customer_addresses_customer").on(table.customerId),
]);

// Customer Reviews - Reviews and ratings for restaurants
export const customerReviews = pgTable("customer_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'set null' }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  response: text("response"), // Restaurant's response to the review
  respondedAt: timestamp("responded_at"),
  isPublished: boolean("is_published").notNull().default(true), // Allow restaurants to hide reviews
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reviews_restaurant").on(table.restaurantId),
  index("idx_reviews_customer").on(table.customerId),
  index("idx_reviews_order").on(table.orderId),
  index("idx_reviews_published").on(table.restaurantId, table.isPublished, table.createdAt),
]);

// Inbox Messages - Customer messages to restaurants
export const inboxMessages = pgTable("inbox_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  subject: varchar("subject", { length: 500 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).notNull().default('new'), // 'new', 'read', 'responded', 'resolved'
  response: text("response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_inbox_restaurant").on(table.restaurantId),
  index("idx_inbox_status").on(table.restaurantId, table.status),
  index("idx_inbox_customer").on(table.customerId),
]);

// Translation Records - Multilingual content for storefront
export const translationRecords = pgTable("translation_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'menu_item', 'category', 'menu', 'restaurant', 'item_option'
  entityId: varchar("entity_id", { length: 255 }).notNull(), // ID of the entity being translated
  locale: varchar("locale", { length: 10 }).notNull(), // Language code: en, ar, fr, es, etc.
  field: varchar("field", { length: 100 }).notNull(), // Field name: 'name', 'description', etc.
  value: text("value").notNull(), // The translated text
  status: varchar("status", { length: 20 }).notNull().default('current'), // 'current', 'needs_review', 'outdated'
  lastUpdatedBy: varchar("last_updated_by"), // User ID who last updated this translation
  sourceUpdatedAt: timestamp("source_updated_at"), // When the source content was last changed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_translation_restaurant").on(table.restaurantId),
  index("idx_translation_entity").on(table.entityType, table.entityId),
  index("idx_translation_locale").on(table.restaurantId, table.locale),
  // Ensure only one translation per restaurant+entity+locale+field combination (creates index automatically)
  unique("unique_translation").on(table.restaurantId, table.entityType, table.entityId, table.locale, table.field),
]);

// Item Options - Modifiers for menu items (sizes, add-ons, extras)
export const itemOptions = pgTable("item_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  menuItemId: varchar("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  label: varchar("label", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'single', 'multi', 'boolean', 'quantity'
  required: boolean("required").notNull().default(false),
  minSelections: integer("min_selections").default(0),
  maxSelections: integer("max_selections"),
  choices: jsonb("choices").notNull(), // [{id, label, priceCents, sku, available}]
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_item_options_restaurant").on(table.restaurantId),
  index("idx_item_options_item").on(table.menuItemId),
]);

// ========================================
// MARKETING SUITE - Promos, Loyalty, Campaigns, Boosts, Segmentation
// ========================================

// Promo Rules - Discount rules and auto-apply conditions
export const promoRules = pgTable("promo_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  promoCode: varchar("promo_code", { length: 100 }),
  promoType: varchar("promo_type", { length: 50 }).notNull(), // 'percentage', 'fixed_amount', 'buy_x_get_y', 'free_delivery'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }), // Percentage or fixed amount
  scope: varchar("scope", { length: 50 }).notNull(), // 'order', 'item', 'category'
  targetItemIds: jsonb("target_item_ids"), // For item/category scoped promos
  conditions: jsonb("conditions"), // {minOrderAmount, maxDiscount, applicableDays, timeRanges}
  buyItemId: varchar("buy_item_id"), // For BOGO: item customer needs to buy
  getItemId: varchar("get_item_id"), // For BOGO: item customer gets free
  buyQuantity: integer("buy_quantity").default(1), // For BOGO: quantity required
  getQuantity: integer("get_quantity").default(1), // For BOGO: quantity free
  autoApply: boolean("auto_apply").notNull().default(false),
  redemptionLimit: integer("redemption_limit"), // Total redemptions allowed
  perCustomerLimit: integer("per_customer_limit").default(1),
  priority: integer("priority").default(0), // Higher priority applies first
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_promo_rules_restaurant").on(table.restaurantId),
  index("idx_promo_rules_code").on(table.promoCode),
  index("idx_promo_rules_active_dates").on(table.restaurantId, table.isActive, table.startsAt, table.endsAt),
  index("idx_promo_rules_auto_apply").on(table.restaurantId, table.autoApply, table.isActive),
  // Promo codes only need to be unique per-merchant, not platform-wide — a global
  // unique constraint meant two unrelated merchants could never both use "SAVE10".
  unique("unique_promo_code_per_restaurant").on(table.restaurantId, table.promoCode),
]);

// Promo Redemptions - Track promo usage
export const promoRedemptions = pgTable("promo_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  promoRuleId: varchar("promo_rule_id").notNull().references(() => promoRules.id, { onDelete: 'cascade' }),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_promo_redemptions_restaurant").on(table.restaurantId),
  index("idx_promo_redemptions_customer").on(table.customerId),
  index("idx_promo_redemptions_promo").on(table.promoRuleId),
]);

// Promo Performance - Analytics for promos
export const promoPerformance = pgTable("promo_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  promoRuleId: varchar("promo_rule_id").notNull().references(() => promoRules.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  impressions: integer("impressions").notNull().default(0),
  redemptions: integer("redemptions").notNull().default(0),
  revenueGenerated: decimal("revenue_generated", { precision: 10, scale: 2 }).default('0'),
  discountGiven: decimal("discount_given", { precision: 10, scale: 2 }).default('0'),
  ordersCount: integer("orders_count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_promo_performance_restaurant_date").on(table.restaurantId, table.date),
  index("idx_promo_performance_promo").on(table.promoRuleId),
]);

// Markets - named regions for storefront price display. Currency conversion is
// display-only (merchant-entered fixed rate, no live FX) since online checkout only
// ever charges/records in the restaurant's base currency (cash-on-delivery today).
// Country coverage is informational only — it does not gate checkout eligibility.
export const markets = pgTable("markets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  conversionRate: decimal("conversion_rate", { precision: 12, scale: 6 }).notNull().default('1'),
  // Null = inherit restaurants.taxRate; an explicit value (including 0) overrides it.
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),
  countries: text("countries").array().notNull().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_markets_restaurant").on(table.restaurantId),
  index("idx_markets_restaurant_active").on(table.restaurantId, table.isActive),
]);

// Loyalty Program - one config row per merchant. Controls earn/redeem rates.
export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().unique().references(() => restaurants.id, { onDelete: 'cascade' }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  programName: varchar("program_name", { length: 120 }).default("Rewards"),
  // points earned per 1 unit of currency spent (on the item subtotal)
  pointsPerUnit: decimal("points_per_unit", { precision: 10, scale: 2 }).notNull().default('1'),
  // currency value (in cents) of one point when redeeming — e.g. 1 => 100 pts = $1
  redeemCentsPerPoint: decimal("redeem_cents_per_point", { precision: 10, scale: 4 }).notNull().default('1'),
  minRedeemPoints: integer("min_redeem_points").notNull().default(100),
  // cap redemption at this fraction of the order subtotal (0-1); null = no cap
  maxRedeemFraction: decimal("max_redeem_fraction", { precision: 3, scale: 2 }).default('0.5'),
  earnOnDeliveryFee: boolean("earn_on_delivery_fee").notNull().default(false),
  pointsExpiryMonths: integer("points_expiry_months"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer store-credit ledger (balance cached on customers.storeCreditCents)
export const customerCreditTransactions = pgTable("customer_credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 40 }).notNull(), // 'earn' | 'redeem' | 'refund' | 'adjustment' | 'expire'
  amountCents: integer("amount_cents").notNull(), // signed: +credit, -spend
  balanceAfterCents: integer("balance_after_cents").notNull(),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'set null' }),
  reason: text("reason"),
  createdBy: varchar("created_by"), // merchant user id for manual adjustments
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_credit_tx_customer").on(table.customerId),
  index("idx_credit_tx_restaurant").on(table.restaurantId),
]);

// Gift Cards (Tier 4) — a prepaid balance redeemable at checkout. Distinct from
// store credit (which is tied to a customer profile): a gift card is a bearer
// instrument identified by its code and can be handed to anyone.
export const giftCards = pgTable("gift_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 40 }).notNull(),
  initialBalance: decimal("initial_balance", { precision: 10, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('USD'),
  status: varchar("status", { length: 20 }).notNull().default('active'), // 'active' | 'disabled' | 'redeemed' | 'expired'
  recipientName: varchar("recipient_name", { length: 255 }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  senderName: varchar("sender_name", { length: 255 }),
  message: text("message"),
  note: text("note"), // internal merchant note
  // set when a customer bought the card through the storefront (vs merchant-issued)
  purchaserOrderId: varchar("purchaser_order_id"),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_gift_cards_restaurant").on(table.restaurantId),
  unique("unique_gift_card_code_per_restaurant").on(table.restaurantId, table.code),
]);

export const giftCardTransactions = pgTable("gift_card_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  giftCardId: varchar("gift_card_id").notNull().references(() => giftCards.id, { onDelete: 'cascade' }),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 20 }).notNull(), // 'issue' | 'redeem' | 'refund' | 'adjustment'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // signed: +load, -spend
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'set null' }),
  note: text("note"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_gift_card_tx_card").on(table.giftCardId),
  index("idx_gift_card_tx_restaurant").on(table.restaurantId),
]);

// Loyalty Tiers - Bronze, Silver, Gold tiers
export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  minPoints: integer("min_points").notNull().default(0),
  benefits: jsonb("benefits"), // {discountPercentage, freeDelivery, prioritySupport, boostCredits}
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_loyalty_tiers_restaurant").on(table.restaurantId),
]);

// Loyalty Accounts - Customer loyalty points and tiers
export const loyaltyAccounts = pgTable("loyalty_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  pointsBalance: integer("points_balance").notNull().default(0),
  lifetimePoints: integer("lifetime_points").notNull().default(0),
  tierId: varchar("tier_id").references(() => loyaltyTiers.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_loyalty_accounts_restaurant").on(table.restaurantId),
  index("idx_loyalty_accounts_customer").on(table.customerId),
]);

// Loyalty Transactions - Points earn/redeem history
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  loyaltyAccountId: varchar("loyalty_account_id").notNull().references(() => loyaltyAccounts.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // 'earn', 'redeem', 'expire', 'adjustment'
  points: integer("points").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'set null' }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_loyalty_transactions_restaurant").on(table.restaurantId),
  index("idx_loyalty_transactions_account").on(table.loyaltyAccountId),
]);

// Bundles - Combo meals and bundle offers
export const bundles = pgTable("bundles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  items: text().array(), // Array of item names for display
  bundlePrice: decimal("bundle_price", { precision: 10, scale: 2 }).notNull(),
  regularPrice: decimal("regular_price", { precision: 10, scale: 2 }), // Regular price before discount
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // Sum of individual items
  sales: integer("sales").default(0), // Number of times this bundle has been sold
  limitPerOrder: integer("limit_per_order").default(1),
  displayPriority: integer("display_priority").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bundle Items - Items included in bundles
export const bundleItems = pgTable("bundle_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  bundleId: varchar("bundle_id").notNull().references(() => bundles.id, { onDelete: 'cascade' }),
  menuItemId: varchar("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bundle_items_restaurant").on(table.restaurantId),
  index("idx_bundle_items_bundle").on(table.bundleId),
]);

// Upsell Rules - Smart pairing and cart suggestions
export const upsellRules = pgTable("upsell_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 'item', 'cart_total', 'category'
  triggerItemId: varchar("trigger_item_id").references(() => menuItems.id, { onDelete: 'cascade' }),
  triggerConditions: jsonb("trigger_conditions"), // {minCartTotal, categoryId}
  suggestionItemIds: jsonb("suggestion_item_ids").notNull(), // Array of menu item IDs
  suggestionText: varchar("suggestion_text", { length: 255 }),
  uiPosition: varchar("ui_position", { length: 50 }).default('cart'), // 'cart', 'checkout', 'item_modal'
  priority: integer("priority").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Boost Credits - Daily boost credits per restaurant
export const boostCredits = pgTable("boost_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().unique().references(() => restaurants.id, { onDelete: 'cascade' }),
  creditsBalance: integer("credits_balance").notNull().default(0),
  dailyAllowance: integer("daily_allowance").notNull().default(1), // Free boosts per day
  lastResetDate: timestamp("last_reset_date").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Boost Slots - Featured placement slots
export const boostSlots = pgTable("boost_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  slotType: varchar("slot_type", { length: 50 }).notNull(), // 'home_featured', 'category_top', 'search_priority'
  startedAt: timestamp("started_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  status: varchar("status", { length: 50 }).notNull().default('active'), // 'active', 'completed', 'cancelled'
  creditsUsed: integer("credits_used").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Boost Impressions - Track boost performance
export const boostImpressions = pgTable("boost_impressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  boostSlotId: varchar("boost_slot_id").notNull().references(() => boostSlots.id, { onDelete: 'cascade' }),
  viewerId: varchar("viewer_id"), // Anonymous or customer ID
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'set null' }),
  converted: boolean("converted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_boost_impressions_restaurant").on(table.restaurantId),
  index("idx_boost_impressions_slot").on(table.boostSlotId),
]);

// Customer Segments - Segmentation for targeted campaigns
export const customerSegments = pgTable("customer_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  rules: jsonb("rules").notNull(), // {ordersCount, lifetimeValue, lastOrderDays, tags}
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Segment Members - Customers in segments (computed/cached)
export const segmentMembers = pgTable("segment_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  segmentId: varchar("segment_id").notNull().references(() => customerSegments.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  index("idx_segment_members_restaurant").on(table.restaurantId),
  index("idx_segment_members_segment").on(table.segmentId),
  index("idx_segment_members_customer").on(table.customerId),
]);

// Campaigns - Marketing campaign definitions
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'welcome', 'reactivation', 'birthday', 'abandoned_cart', 'custom'
  channel: varchar("channel", { length: 50 }).notNull(), // 'push', 'sms', 'email'
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  promoRuleId: varchar("promo_rule_id").references(() => promoRules.id, { onDelete: 'set null' }),
  segmentId: varchar("segment_id").references(() => customerSegments.id, { onDelete: 'set null' }),
  triggerRules: jsonb("trigger_rules"), // {daysInactive, events}
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign Runs - Campaign execution logs
export const campaignRuns = pgTable("campaign_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  scheduledFor: timestamp("scheduled_for").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  recipientsCount: integer("recipients_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),
  redemptionsCount: integer("redemptions_count").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_campaign_runs_restaurant").on(table.restaurantId),
  index("idx_campaign_runs_campaign").on(table.campaignId),
  index("idx_campaign_runs_scheduled").on(table.scheduledFor, table.status),
]);

// Campaign Deliveries (Tier 6) — one row per recipient per send. Channel-agnostic:
// the send step records the rendered message here and (when a provider is wired)
// hands it off; until then this IS the outbox.
export const campaignDeliveries = pgTable("campaign_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  campaignRunId: varchar("campaign_run_id").references(() => campaignRuns.id, { onDelete: 'set null' }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  channel: varchar("channel", { length: 20 }).notNull(),
  toAddress: varchar("to_address", { length: 255 }),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('sent'), // 'sent' | 'failed' | 'skipped'
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_campaign_deliveries_restaurant").on(table.restaurantId),
  index("idx_campaign_deliveries_campaign").on(table.campaignId),
  index("idx_campaign_deliveries_customer").on(table.customerId),
]);

// Abandoned Carts (Tier 6) — the storefront upserts a snapshot as the shopper
// builds a cart; checkout marks it recovered; a cron reminds after a delay.
export const abandonedCarts = pgTable("abandoned_carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerName: varchar("customer_name", { length: 255 }),
  items: jsonb("items").notNull(), // [{name, quantity, unitPrice}]
  itemCount: integer("item_count").notNull().default(0),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('open'), // 'open' | 'recovered' | 'reminded' | 'lost'
  remindedAt: timestamp("reminded_at"),
  recoveredOrderId: varchar("recovered_order_id").references(() => orders.id, { onDelete: 'set null' }),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_abandoned_carts_restaurant").on(table.restaurantId),
  unique("abandoned_carts_session_unique").on(table.restaurantId, table.sessionId),
]);

// Marketing Events - Event tracking for analytics
export const marketingEvents = pgTable("marketing_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type", { length: 100 }).notNull(), // 'view_menu', 'add_to_cart', 'checkout', 'promo_view', etc.
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  sessionId: varchar("session_id", { length: 255 }),
  eventData: jsonb("event_data"), // Context-specific data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_marketing_events_restaurant").on(table.restaurantId),
  index("idx_marketing_events_type").on(table.eventType),
  index("idx_marketing_events_customer").on(table.customerId),
]);

// Storefront Sessions - one row per browser session, deduplicated by sessionId.
// Powers the Growth page's sessions-by-channel report. channel/referrer/UTM are
// captured once on the first track-visit call of the session (landing-page
// attribution), not updated on subsequent pageviews within the same session.
export const storefrontSessions = pgTable("storefront_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  visitorId: varchar("visitor_id", { length: 255 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(), // 'direct'|'organic'|'paid'|'social'|'referral'|'unknown'
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  landingPath: varchar("landing_path", { length: 500 }),
  pageviews: integer("pageviews").notNull().default(1),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_storefront_sessions_restaurant_first_seen").on(table.restaurantId, table.firstSeenAt),
  index("idx_storefront_sessions_visitor").on(table.restaurantId, table.visitorId),
  unique("storefront_sessions_session_unique").on(table.restaurantId, table.sessionId),
]);

// Marketing Metrics Daily - Aggregated daily metrics
export const marketingMetricsDaily = pgTable("marketing_metrics_daily", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  newCustomers: integer("new_customers").notNull().default(0),
  returningCustomers: integer("returning_customers").notNull().default(0),
  ordersCount: integer("orders_count").notNull().default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default('0'),
  promoRevenue: decimal("promo_revenue", { precision: 10, scale: 2 }).default('0'),
  discountsGiven: decimal("discounts_given", { precision: 10, scale: 2 }).default('0'),
  avgOrderValue: decimal("avg_order_value", { precision: 10, scale: 2 }).default('0'),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_marketing_metrics_restaurant_date").on(table.restaurantId, table.date),
]);

// Pixels - Third-party tracking pixels (Meta, TikTok, Google)
export const pixels = pgTable("pixels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  platform: varchar("platform", { length: 50 }).notNull(), // 'meta', 'tiktok', 'google_ads', 'snapchat'
  pixelId: varchar("pixel_id", { length: 255 }).notNull(),
  accessToken: text("access_token"), // For server-side events
  isActive: boolean("is_active").notNull().default(true),
  domainVerified: boolean("domain_verified").notNull().default(false),
  consentRequired: boolean("consent_required").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pixel Events - Track pixel event fires
export const pixelEvents = pgTable("pixel_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  pixelId: varchar("pixel_id").notNull().references(() => pixels.id, { onDelete: 'cascade' }),
  eventName: varchar("event_name", { length: 100 }).notNull(), // 'ViewContent', 'AddToCart', 'Purchase'
  eventData: jsonb("event_data"),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'set null' }),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending', 'sent', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pixel_events_restaurant").on(table.restaurantId),
  index("idx_pixel_events_pixel").on(table.pixelId),
  index("idx_pixel_events_status").on(table.status),
]);

// Referral Programs - Referral program configuration
export const referralPrograms = pgTable("referral_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().unique().references(() => restaurants.id, { onDelete: 'cascade' }),
  referrerRewardType: varchar("referrer_reward_type", { length: 50 }).notNull(), // 'percentage', 'fixed_amount', 'points'
  referrerRewardValue: decimal("referrer_reward_value", { precision: 10, scale: 2 }).notNull(),
  refereeRewardType: varchar("referee_reward_type", { length: 50 }).notNull(),
  refereeRewardValue: decimal("referee_reward_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxRedemptionsPerReferrer: integer("max_redemptions_per_referrer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Referral Links - Unique referral codes per customer
export const referralLinks = pgTable("referral_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  referralProgramId: varchar("referral_program_id").notNull().references(() => referralPrograms.id, { onDelete: 'cascade' }),
  referrerId: varchar("referrer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  referralCode: varchar("referral_code", { length: 50 }).notNull().unique(),
  clicksCount: integer("clicks_count").notNull().default(0),
  conversionsCount: integer("conversions_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_referral_links_restaurant").on(table.restaurantId),
  index("idx_referral_links_code").on(table.referralCode),
  index("idx_referral_links_referrer").on(table.referrerId),
]);

// Referral Rewards - Track referral rewards given
export const referralRewards = pgTable("referral_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  referralLinkId: varchar("referral_link_id").notNull().references(() => referralLinks.id, { onDelete: 'cascade' }),
  refereeId: varchar("referee_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  referrerRewardAmount: decimal("referrer_reward_amount", { precision: 10, scale: 2 }).notNull(),
  refereeRewardAmount: decimal("referee_reward_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending', 'awarded', 'expired'
  awardedAt: timestamp("awarded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_referral_rewards_restaurant").on(table.restaurantId),
  index("idx_referral_rewards_link").on(table.referralLinkId),
  index("idx_referral_rewards_status").on(table.status),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  restaurants: many(restaurants),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, {
    fields: [restaurants.ownerId],
    references: [users.id],
  }),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  tables: many(tables),
  reservations: many(reservations),
  orders: many(orders),
  staff: many(staff),
  inventory: many(inventory),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [menuCategories.restaurantId],
    references: [restaurants.id],
  }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  orderItems: many(orderItems),
  options: many(itemOptions),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [tables.restaurantId],
    references: [restaurants.id],
  }),
  reservations: many(reservations),
  orders: many(orders),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [reservations.restaurantId],
    references: [restaurants.id],
  }),
  table: one(tables, {
    fields: [reservations.tableId],
    references: [tables.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  items: many(orderItems),
  ledgerEntry: one(earningsLedger),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [staff.restaurantId],
    references: [restaurants.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [inventory.restaurantId],
    references: [restaurants.id],
  }),
}));

export const restaurantPayoutAccountsRelations = relations(restaurantPayoutAccounts, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantPayoutAccounts.restaurantId],
    references: [restaurants.id],
  }),
}));

export const earningsLedgerRelations = relations(earningsLedger, ({ one }) => ({
  order: one(orders, {
    fields: [earningsLedger.orderId],
    references: [orders.id],
  }),
  restaurant: one(restaurants, {
    fields: [earningsLedger.restaurantId],
    references: [restaurants.id],
  }),
}));

export const payoutRunsRelations = relations(payoutRuns, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [payoutRuns.restaurantId],
    references: [restaurants.id],
  }),
  ledgerEntries: many(payoutRunLedgerEntries),
}));

export const payoutRunLedgerEntriesRelations = relations(payoutRunLedgerEntries, ({ one }) => ({
  payoutRun: one(payoutRuns, {
    fields: [payoutRunLedgerEntries.payoutRunId],
    references: [payoutRuns.id],
  }),
  ledgerEntry: one(earningsLedger, {
    fields: [payoutRunLedgerEntries.ledgerEntryId],
    references: [earningsLedger.id],
  }),
}));

export const itemOptionsRelations = relations(itemOptions, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [itemOptions.menuItemId],
    references: [menuItems.id],
  }),
}));

// Marketing Relations
export const promoRulesRelations = relations(promoRules, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [promoRules.restaurantId],
    references: [restaurants.id],
  }),
  redemptions: many(promoRedemptions),
  performance: many(promoPerformance),
}));

export const promoRedemptionsRelations = relations(promoRedemptions, ({ one }) => ({
  promoRule: one(promoRules, {
    fields: [promoRedemptions.promoRuleId],
    references: [promoRules.id],
  }),
  order: one(orders, {
    fields: [promoRedemptions.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [promoRedemptions.customerId],
    references: [customers.id],
  }),
}));

export const loyaltyTiersRelations = relations(loyaltyTiers, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [loyaltyTiers.restaurantId],
    references: [restaurants.id],
  }),
  accounts: many(loyaltyAccounts),
}));

export const loyaltyAccountsRelations = relations(loyaltyAccounts, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [loyaltyAccounts.restaurantId],
    references: [restaurants.id],
  }),
  customer: one(customers, {
    fields: [loyaltyAccounts.customerId],
    references: [customers.id],
  }),
  tier: one(loyaltyTiers, {
    fields: [loyaltyAccounts.tierId],
    references: [loyaltyTiers.id],
  }),
  transactions: many(loyaltyTransactions),
}));

export const bundlesRelations = relations(bundles, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [bundles.restaurantId],
    references: [restaurants.id],
  }),
  items: many(bundleItems),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
  bundle: one(bundles, {
    fields: [bundleItems.bundleId],
    references: [bundles.id],
  }),
  menuItem: one(menuItems, {
    fields: [bundleItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const upsellRulesRelations = relations(upsellRules, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [upsellRules.restaurantId],
    references: [restaurants.id],
  }),
  triggerItem: one(menuItems, {
    fields: [upsellRules.triggerItemId],
    references: [menuItems.id],
  }),
}));

export const boostSlotsRelations = relations(boostSlots, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [boostSlots.restaurantId],
    references: [restaurants.id],
  }),
  impressions: many(boostImpressions),
}));

export const customerSegmentsRelations = relations(customerSegments, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [customerSegments.restaurantId],
    references: [restaurants.id],
  }),
  members: many(segmentMembers),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [campaigns.restaurantId],
    references: [restaurants.id],
  }),
  promoRule: one(promoRules, {
    fields: [campaigns.promoRuleId],
    references: [promoRules.id],
  }),
  segment: one(customerSegments, {
    fields: [campaigns.segmentId],
    references: [customerSegments.id],
  }),
  runs: many(campaignRuns),
}));

export const campaignRunsRelations = relations(campaignRuns, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignRuns.campaignId],
    references: [campaigns.id],
  }),
}));

export const pixelsRelations = relations(pixels, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [pixels.restaurantId],
    references: [restaurants.id],
  }),
  events: many(pixelEvents),
}));

export const referralProgramsRelations = relations(referralPrograms, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [referralPrograms.restaurantId],
    references: [restaurants.id],
  }),
  links: many(referralLinks),
}));

export const referralLinksRelations = relations(referralLinks, ({ one, many }) => ({
  program: one(referralPrograms, {
    fields: [referralLinks.referralProgramId],
    references: [referralPrograms.id],
  }),
  referrer: one(customers, {
    fields: [referralLinks.referrerId],
    references: [customers.id],
  }),
  rewards: many(referralRewards),
}));

// Insert Schemas
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

export const insertMenuSchema = createInsertSchema(menus, {
  daysOfWeek: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type Menu = typeof menus.$inferSelect;

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type MenuCategory = typeof menuCategories.$inferSelect;

export const insertMenuItemSchema = createInsertSchema(menuItems, {
  tags: z.array(z.string()).optional(),
  upsellItemIds: z.array(z.string()).optional(),
  crossSellItemIds: z.array(z.string()).optional(),
  downsellItemIds: z.array(z.string()).optional(),
  marketingTactics: z.object({
    enableUrgencyTimer: z.boolean().optional(),
    urgencyTimerMinutes: z.number().optional(),
    urgencyTimerMessage: z.string().optional(),
    enableScarcityNotice: z.boolean().optional(),
    scarcityThreshold: z.number().optional(),
    scarcityMessage: z.string().optional(),
    enableSocialProof: z.boolean().optional(),
    socialProofMessage: z.string().optional(),
    socialProofCount: z.number().optional(),
  }).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export const insertItemOptionSchema = createInsertSchema(itemOptions, {
  choices: z.array(z.object({
    id: z.string(),
    label: z.string(),
    priceCents: z.number(),
    sku: z.string().optional(),
    available: z.boolean().optional(),
  })),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertItemOption = z.infer<typeof insertItemOptionSchema>;
export type ItemOption = typeof itemOptions.$inferSelect;

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;

export const insertCollectionItemSchema = createInsertSchema(collectionItems).omit({
  id: true,
  createdAt: true,
});
export type InsertCollectionItem = z.infer<typeof insertCollectionItemSchema>;
export type CollectionItem = typeof collectionItems.$inferSelect;

export const insertStorefrontPageSchema = createInsertSchema(storefrontPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStorefrontPage = z.infer<typeof insertStorefrontPageSchema>;
export type StorefrontPage = typeof storefrontPages.$inferSelect;

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tables.$inferSelect;

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export const insertOrderRefundSchema = createInsertSchema(orderRefunds).omit({
  id: true,
  createdAt: true,
});
export type InsertOrderRefund = z.infer<typeof insertOrderRefundSchema>;
export type OrderRefund = typeof orderRefunds.$inferSelect;

export const insertOrderEventSchema = createInsertSchema(orderEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertOrderEvent = z.infer<typeof insertOrderEventSchema>;
export type OrderEvent = typeof orderEvents.$inferSelect;

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

export const insertPlatformPaymentSettingsSchema = createInsertSchema(platformPaymentSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlatformPaymentSettings = z.infer<typeof insertPlatformPaymentSettingsSchema>;
export type PlatformPaymentSettings = typeof platformPaymentSettings.$inferSelect;

export const insertRestaurantPayoutAccountSchema = createInsertSchema(restaurantPayoutAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRestaurantPayoutAccount = z.infer<typeof insertRestaurantPayoutAccountSchema>;
export type RestaurantPayoutAccount = typeof restaurantPayoutAccounts.$inferSelect;

export const insertEarningsLedgerSchema = createInsertSchema(earningsLedger).omit({
  id: true,
  createdAt: true,
});
export type InsertEarningsLedger = z.infer<typeof insertEarningsLedgerSchema>;
export type EarningsLedger = typeof earningsLedger.$inferSelect;

export const insertPayoutRunSchema = createInsertSchema(payoutRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertPayoutRun = z.infer<typeof insertPayoutRunSchema>;
export type PayoutRun = typeof payoutRuns.$inferSelect;

export const insertPayoutRunLedgerEntrySchema = createInsertSchema(payoutRunLedgerEntries).omit({
  id: true,
  createdAt: true,
});
export type InsertPayoutRunLedgerEntry = z.infer<typeof insertPayoutRunLedgerEntrySchema>;
export type PayoutRunLedgerEntry = typeof payoutRunLedgerEntries.$inferSelect;

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const insertCustomerAddressSchema = createInsertSchema(customerAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;
export type CustomerAddress = typeof customerAddresses.$inferSelect;

export const insertCustomerReviewSchema = createInsertSchema(customerReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerReview = z.infer<typeof insertCustomerReviewSchema>;
export type CustomerReview = typeof customerReviews.$inferSelect;

export const insertInboxMessageSchema = createInsertSchema(inboxMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInboxMessage = z.infer<typeof insertInboxMessageSchema>;
export type InboxMessage = typeof inboxMessages.$inferSelect;

// Marketing Insert Schemas
export const insertPromoRuleSchema = createInsertSchema(promoRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPromoRule = z.infer<typeof insertPromoRuleSchema>;
export type PromoRule = typeof promoRules.$inferSelect;

export const insertMarketSchema = createInsertSchema(markets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof markets.$inferSelect;

export const insertGiftCardSchema = createInsertSchema(giftCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;
export type GiftCard = typeof giftCards.$inferSelect;

export const insertGiftCardTransactionSchema = createInsertSchema(giftCardTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertGiftCardTransaction = z.infer<typeof insertGiftCardTransactionSchema>;
export type GiftCardTransaction = typeof giftCardTransactions.$inferSelect;

export const insertPromoRedemptionSchema = createInsertSchema(promoRedemptions).omit({
  id: true,
  createdAt: true,
});
export type InsertPromoRedemption = z.infer<typeof insertPromoRedemptionSchema>;
export type PromoRedemption = typeof promoRedemptions.$inferSelect;

export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLoyaltyProgram = z.infer<typeof insertLoyaltyProgramSchema>;
export type LoyaltyProgram = typeof loyaltyPrograms.$inferSelect;

export const insertCustomerCreditTransactionSchema = createInsertSchema(customerCreditTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertCustomerCreditTransaction = z.infer<typeof insertCustomerCreditTransactionSchema>;
export type CustomerCreditTransaction = typeof customerCreditTransactions.$inferSelect;

export const insertLoyaltyTierSchema = createInsertSchema(loyaltyTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLoyaltyTier = z.infer<typeof insertLoyaltyTierSchema>;
export type LoyaltyTier = typeof loyaltyTiers.$inferSelect;

export const insertLoyaltyAccountSchema = createInsertSchema(loyaltyAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLoyaltyAccount = z.infer<typeof insertLoyaltyAccountSchema>;
export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;

export const insertBundleSchema = createInsertSchema(bundles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBundle = z.infer<typeof insertBundleSchema>;
export type Bundle = typeof bundles.$inferSelect;

export const insertBundleItemSchema = createInsertSchema(bundleItems).omit({
  id: true,
  createdAt: true,
});
export type InsertBundleItem = z.infer<typeof insertBundleItemSchema>;
export type BundleItem = typeof bundleItems.$inferSelect;

export const insertUpsellRuleSchema = createInsertSchema(upsellRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUpsellRule = z.infer<typeof insertUpsellRuleSchema>;
export type UpsellRule = typeof upsellRules.$inferSelect;

export const insertBoostCreditSchema = createInsertSchema(boostCredits).omit({
  id: true,
  updatedAt: true,
});
export type InsertBoostCredit = z.infer<typeof insertBoostCreditSchema>;
export type BoostCredit = typeof boostCredits.$inferSelect;

export const insertBoostSlotSchema = createInsertSchema(boostSlots).omit({
  id: true,
  createdAt: true,
});
export type InsertBoostSlot = z.infer<typeof insertBoostSlotSchema>;
export type BoostSlot = typeof boostSlots.$inferSelect;

export const insertCustomerSegmentSchema = createInsertSchema(customerSegments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerSegment = z.infer<typeof insertCustomerSegmentSchema>;
export type CustomerSegment = typeof customerSegments.$inferSelect;

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

export const insertCampaignRunSchema = createInsertSchema(campaignRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertCampaignRun = z.infer<typeof insertCampaignRunSchema>;
export type CampaignRun = typeof campaignRuns.$inferSelect;

export const insertCampaignDeliverySchema = createInsertSchema(campaignDeliveries).omit({
  id: true,
  createdAt: true,
});
export type InsertCampaignDelivery = z.infer<typeof insertCampaignDeliverySchema>;
export type CampaignDelivery = typeof campaignDeliveries.$inferSelect;

export const insertAbandonedCartSchema = createInsertSchema(abandonedCarts).omit({
  id: true,
  createdAt: true,
});
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;
export type AbandonedCart = typeof abandonedCarts.$inferSelect;

export const insertMarketingEventSchema = createInsertSchema(marketingEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertMarketingEvent = z.infer<typeof insertMarketingEventSchema>;
export type MarketingEvent = typeof marketingEvents.$inferSelect;

export const insertStorefrontSessionSchema = createInsertSchema(storefrontSessions).omit({
  id: true,
  createdAt: true,
});
export type InsertStorefrontSession = z.infer<typeof insertStorefrontSessionSchema>;
export type StorefrontSession = typeof storefrontSessions.$inferSelect;

export const insertPixelSchema = createInsertSchema(pixels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPixel = z.infer<typeof insertPixelSchema>;
export type Pixel = typeof pixels.$inferSelect;

export const insertReferralProgramSchema = createInsertSchema(referralPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReferralProgram = z.infer<typeof insertReferralProgramSchema>;
export type ReferralProgram = typeof referralPrograms.$inferSelect;

export const insertReferralLinkSchema = createInsertSchema(referralLinks).omit({
  id: true,
  createdAt: true,
});
export type InsertReferralLink = z.infer<typeof insertReferralLinkSchema>;
export type ReferralLink = typeof referralLinks.$inferSelect;

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const insertTranslationRecordSchema = createInsertSchema(translationRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTranslationRecord = z.infer<typeof insertTranslationRecordSchema>;
export type TranslationRecord = typeof translationRecords.$inferSelect;

// ==========================================
// PHASE 6: AI & MACHINE LEARNING TABLES
// ==========================================

// Prep Time History - Track actual vs predicted prep times
export const prepTimeHistory = pgTable("prep_time_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "set null" }),
  orderedAt: timestamp("ordered_at").notNull(),
  readyAt: timestamp("ready_at"),
  actualPrepMinutes: integer("actual_prep_minutes"),
  predictedPrepMinutes: integer("predicted_prep_minutes").notNull(),
  predictionErrorMinutes: integer("prediction_error_minutes"),
  itemCount: integer("item_count").notNull().default(1),
  orderValue: varchar("order_value").notNull().default('0'),
  hourOfDay: integer("hour_of_day").notNull(), // 0-23
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  indexRestaurant: index("idx_prep_time_restaurant").on(table.restaurantId),
  indexDateTime: index("idx_prep_time_datetime").on(table.orderedAt),
  indexAccuracy: index("idx_prep_time_accuracy").on(table.predictionErrorMinutes),
}));

// ML Training Data - Store feature/label pairs for future ML models
export const mlTrainingData = pgTable("ml_training_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelType: varchar("model_type").notNull(), // prep_time, eta, demand, matching, etc.
  featureData: text("feature_data").notNull(), // JSON string of features
  labelData: text("label_data").notNull(), // JSON string of labels (actual outcomes)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  indexModel: index("idx_ml_model").on(table.modelType),
  indexDate: index("idx_ml_date").on(table.createdAt),
}));

// Phase 6: AI & ML Schema Exports
export const insertPrepTimeHistorySchema = createInsertSchema(prepTimeHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertPrepTimeHistory = z.infer<typeof insertPrepTimeHistorySchema>;
export type PrepTimeHistory = typeof prepTimeHistory.$inferSelect;

export const insertMlTrainingDataSchema = createInsertSchema(mlTrainingData).omit({
  id: true,
  createdAt: true,
});
export type InsertMlTrainingData = z.infer<typeof insertMlTrainingDataSchema>;
export type MlTrainingData = typeof mlTrainingData.$inferSelect;

