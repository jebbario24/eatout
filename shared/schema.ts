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
  
  // Driver profile fields
  phone: varchar("phone", { length: 50 }),
  dateOfBirth: varchar("date_of_birth", { length: 10 }), // YYYY-MM-DD format
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  
  // Driver license info
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseExpiry: varchar("license_expiry", { length: 10 }), // YYYY-MM-DD format
  
  // Vehicle info
  vehicleType: varchar("vehicle_type", { length: 50 }), // car, motorcycle, bicycle, scooter
  vehicleMake: varchar("vehicle_make", { length: 100 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  vehicleYear: varchar("vehicle_year", { length: 4 }),
  vehiclePlate: varchar("vehicle_plate", { length: 50 }),
  vehicleColor: varchar("vehicle_color", { length: 50 }),
  
  // Documents (stored in object storage)
  idProofUrl: text("id_proof_url"),
  insuranceUrl: text("insurance_url"),
  
  // Driver status tracking
  profileComplete: boolean("profile_complete").default(false),
  adminApproved: boolean("admin_approved").default(false),
  adminApprovedAt: timestamp("admin_approved_at"),
  approvedBy: varchar("approved_by"), // Admin user ID who approved
  applicationStatus: varchar("application_status", { length: 50 }).default('pending'), // pending, approved, rejected
  rejectionReason: text("rejection_reason"),

  // Platform-wide account status (admin suspend/activate) and login tracking
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants table - Multi-tenant core
// Business types a merchant storefront can be. Drives catalog terminology/fields —
// e.g. "Menu" vs "Products", and which vertical-specific catalog attributes apply.
export const BUSINESS_TYPES = ['restaurant', 'grocery', 'pharmacy', 'flowers', 'retail'] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  subdomain: varchar("subdomain", { length: 255 }).unique(),
  businessType: varchar("business_type", { length: 50 }).notNull().default('restaurant'),
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
  orderTypes: jsonb("order_types").default('{"pickup": true, "delivery": true}'),
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
  // Manual Access Override (Platform Admin)
  manuallyGrantedAccess: boolean("manually_granted_access").default(false),
  accessGrantedBy: varchar("access_granted_by"), // Admin user ID who granted access
  accessGrantedAt: timestamp("access_granted_at"),
  accessNotes: text("access_notes"),
  isActive: boolean("is_active").notNull().default(true),
  // Geocoded coordinates (derived from address) for driver route optimization
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraints
  uniqueSku: unique().on(table.restaurantId, table.sku),
  uniqueExternalId: unique().on(table.restaurantId, table.externalId),
  // Performance indexes
  restaurantIdx: index("menu_items_restaurant_idx").on(table.restaurantId),
  menuIdx: index("menu_items_menu_idx").on(table.menuId),
  categoryIdx: index("menu_items_category_idx").on(table.categoryId),
  restaurantMenuIdx: index("menu_items_restaurant_menu_idx").on(table.restaurantId, table.menuId),
  restaurantCategoryIdx: index("menu_items_restaurant_category_idx").on(table.restaurantId, table.categoryId),
  availabilityIdx: index("menu_items_availability_idx").on(table.restaurantId, table.isAvailable),
}));

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
  // Geocoded coordinates (derived from delivery address) for driver route optimization
  deliveryLat: decimal("delivery_lat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("delivery_lng", { precision: 10, scale: 7 }),
  // Optional pickup override (e.g. a merchant fulfilling from a different location than their storefront address)
  pickupName: varchar("pickup_name", { length: 255 }),
  pickupPhone: varchar("pickup_phone", { length: 50 }),
  pickupAddress: text("pickup_address"),
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }),
  packageDescription: text("package_description"), // free-text description of what's being delivered
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default('0'),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  promoCode: varchar("promo_code", { length: 100 }),
  promoDiscount: decimal("promo_discount", { precision: 10, scale: 2 }).default('0'),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default('pending'),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentIntentId: varchar("payment_intent_id", { length: 255 }),
  paymentProvider: varchar("payment_provider", { length: 50 }),
  platformCaptureStatus: varchar("platform_capture_status", { length: 50 }).default('pending'),
  restaurantShare: decimal("restaurant_share", { precision: 10, scale: 2 }),
  driverShare: decimal("driver_share", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  assignedDriverId: varchar("assigned_driver_id").references(() => driverProfiles.id, { onDelete: 'set null' }),
  deliveryZoneId: varchar("delivery_zone_id").references(() => deliveryZones.id, { onDelete: 'set null' }),
  batchId: varchar("batch_id"),
  // Delivery Tracking
  driverAcceptedAt: timestamp("driver_accepted_at"),
  pickupTime: timestamp("pickup_time"),
  deliveryTime: timestamp("delivery_time"),
  estimatedPickupTime: timestamp("estimated_pickup_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  driverLocationHistory: jsonb("driver_location_history"), // Array of {lat, lng, timestamp}
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_orders_restaurant").on(table.restaurantId),
  index("idx_orders_status").on(table.status),
  index("idx_orders_delivery_zone").on(table.deliveryZoneId),
  index("idx_orders_available_delivery").on(table.status, table.orderType, table.assignedDriverId, table.paymentStatus, table.deliveryZoneId),
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
  createdAt: timestamp("created_at").defaultNow(),
});

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

// Delivery Zones
export const deliveryZones = pgTable("delivery_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 255 }),
  neighborhood: varchar("neighborhood", { length: 255 }),
  centerLat: decimal("center_lat", { precision: 10, scale: 7 }),
  centerLng: decimal("center_lng", { precision: 10, scale: 7 }),
  radiusKm: decimal("radius_km", { precision: 6, scale: 2 }),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
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

// Driver Profiles - Driver information for delivery app
export const driverProfiles = pgTable("driver_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Drivers are not platform accounts — there is no driver login. The owner adds a driver
  // directly and hands them a no-login delivery link keyed by accessToken (see below).
  userId: varchar("user_id").unique().references(() => users.id, { onDelete: 'cascade' }),
  // Each driver belongs to exactly one merchant, who manages their own delivery/drivers.
  restaurantId: varchar("restaurant_id").references(() => restaurants.id, { onDelete: 'cascade' }),
  // Bearer token for the no-login delivery link (/deliver/:accessToken). Long, random,
  // regenerable by the owner if it's ever shared with the wrong person.
  accessToken: varchar("access_token", { length: 64 }).unique(),
  // Personal Information
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  dateOfBirth: varchar("date_of_birth", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  // Service Zones - Array of delivery zone IDs this driver serves
  serviceZones: text("service_zones").array().default(sql`ARRAY[]::text[]`),
  // Emergency Contact
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  // Driver License & Verification
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseExpiry: varchar("license_expiry", { length: 20 }),
  idProofUrl: text("id_proof_url"), // Stored in private object storage
  idProofType: varchar("id_proof_type", { length: 50 }), // driver_license, national_id, passport
  // Vehicle Information
  vehicleType: varchar("vehicle_type", { length: 50 }),
  vehicleMake: varchar("vehicle_make", { length: 100 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  vehicleYear: varchar("vehicle_year", { length: 10 }),
  vehiclePlate: varchar("vehicle_plate", { length: 50 }),
  vehicleColor: varchar("vehicle_color", { length: 50 }),
  vehicleInsuranceUrl: text("vehicle_insurance_url"), // Stored in private object storage
  insuranceExpiry: varchar("insurance_expiry", { length: 20 }),
  // Stripe Connect for payouts (same as restaurants)
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 255 }),
  stripeOnboardingCompleted: boolean("stripe_onboarding_completed").notNull().default(false),
  // Application & Approval
  applicationStatus: varchar("application_status", { length: 50 }).notNull().default('pending'), // pending, approved, rejected
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"), // Admin user ID who approved
  rejectionReason: text("rejection_reason"),
  // Location Tracking
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp("last_location_update"),
  // Status
  isActive: boolean("is_active").notNull().default(true),
  isAvailable: boolean("is_available").notNull().default(false),
  profileComplete: boolean("profile_complete").default(false),
  availabilitySchedule: jsonb("availability_schedule"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver Wallet Balances - Current balance for each driver
export const driverWalletBalances = pgTable("driver_wallet_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().unique().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  pendingBalance: decimal("pending_balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  lifetimeEarnings: decimal("lifetime_earnings", { precision: 10, scale: 2 }).notNull().default('0.00'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Earnings Ledger - Per-order payment splits and tracking
export const earningsLedger = pgTable("earnings_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  driverId: varchar("driver_id").references(() => driverProfiles.id, { onDelete: 'set null' }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  restaurantShare: decimal("restaurant_share", { precision: 10, scale: 2 }).notNull(),
  driverShare: decimal("driver_share", { precision: 10, scale: 2 }).default('0.00'),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  paymentProvider: varchar("payment_provider", { length: 50 }).notNull(),
  paymentIntentId: varchar("payment_intent_id", { length: 255 }),
  platformCaptureStatus: varchar("platform_capture_status", { length: 50 }).notNull().default('pending'),
  restaurantPayoutStatus: varchar("restaurant_payout_status", { length: 50 }).notNull().default('pending'),
  driverPayoutStatus: varchar("driver_payout_status", { length: 50 }).default('pending'),
  restaurantPaidAt: timestamp("restaurant_paid_at"),
  driverPaidAt: timestamp("driver_paid_at"),
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

// Wallet Transactions - Driver wallet credits/debits and payout audit
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  relatedOrderId: varchar("related_order_id").references(() => orders.id, { onDelete: 'set null' }),
  relatedLedgerId: varchar("related_ledger_id").references(() => earningsLedger.id, { onDelete: 'set null' }),
  payoutTransactionId: varchar("payout_transaction_id", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Driver Delivery Status - Track delivery progress in real-time
export const driverDeliveryStatus = pgTable("driver_delivery_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().unique().references(() => orders.id, { onDelete: 'cascade' }),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id, { onDelete: 'cascade' }), // null for API delivery jobs
  status: varchar("status", { length: 50 }).notNull().default('assigned'), // assigned, en_route_to_pickup, arrived_at_restaurant, picked_up, en_route_to_customer, delivered
  assignedAt: timestamp("assigned_at").defaultNow(),
  enRouteToPickupAt: timestamp("en_route_to_pickup_at"),
  arrivedAtRestaurantAt: timestamp("arrived_at_restaurant_at"),
  pickedUpAt: timestamp("picked_up_at"),
  enRouteToCustomerAt: timestamp("en_route_to_customer_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryProofUrl: text("delivery_proof_url"), // Photo of delivery
  deliveryNotes: text("delivery_notes"),
  customerSignature: text("customer_signature"), // Base64 signature image
  estimatedPickupTime: timestamp("estimated_pickup_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_driver_delivery_driver").on(table.driverId),
  index("idx_driver_delivery_restaurant").on(table.restaurantId),
  index("idx_driver_delivery_status").on(table.status),
]);

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
  orderType: varchar("order_type", { length: 50 }).default('delivery'),
  signupSource: varchar("signup_source", { length: 100 }),
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
  deliveryZones: many(deliveryZones),
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
  assignedDriver: one(driverProfiles, {
    fields: [orders.assignedDriverId],
    references: [driverProfiles.id],
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

export const deliveryZonesRelations = relations(deliveryZones, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [deliveryZones.restaurantId],
    references: [restaurants.id],
  }),
}));

export const restaurantPayoutAccountsRelations = relations(restaurantPayoutAccounts, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantPayoutAccounts.restaurantId],
    references: [restaurants.id],
  }),
}));

export const driverProfilesRelations = relations(driverProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [driverProfiles.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [driverProfiles.restaurantId],
    references: [restaurants.id],
  }),
  walletBalance: one(driverWalletBalances),
  ledgerEntries: many(earningsLedger),
  walletTransactions: many(walletTransactions),
}));

export const driverWalletBalancesRelations = relations(driverWalletBalances, ({ one }) => ({
  driver: one(driverProfiles, {
    fields: [driverWalletBalances.driverId],
    references: [driverProfiles.id],
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
  driver: one(driverProfiles, {
    fields: [earningsLedger.driverId],
    references: [driverProfiles.id],
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

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  driver: one(driverProfiles, {
    fields: [walletTransactions.driverId],
    references: [driverProfiles.id],
  }),
  relatedOrder: one(orders, {
    fields: [walletTransactions.relatedOrderId],
    references: [orders.id],
  }),
  relatedLedger: one(earningsLedger, {
    fields: [walletTransactions.relatedLedgerId],
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

export const insertDeliveryZoneSchema = createInsertSchema(deliveryZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDeliveryZone = z.infer<typeof insertDeliveryZoneSchema>;
export type DeliveryZone = typeof deliveryZones.$inferSelect;

// ===== ADVANCED DELIVERY TRACKING TABLES =====

// Real-time Driver Location Tracking - High-frequency updates
export const driverLocationHistory = pgTable("driver_location_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'cascade' }), // null if not on active delivery
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  accuracy: integer("accuracy"), // GPS accuracy in meters
  speed: decimal("speed", { precision: 6, scale: 2 }), // Speed in km/h
  heading: integer("heading"), // Direction in degrees (0-359)
  altitude: decimal("altitude", { precision: 8, scale: 2 }), // Altitude in meters
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("idx_driver_location_driver_time").on(table.driverId, table.timestamp),
  index("idx_driver_location_order").on(table.orderId),
]);

// Delivery Routes - Optimized routes for each delivery
export const deliveryRoutes = pgTable("delivery_routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  batchId: varchar("batch_id"), // Reference to batch if part of multi-order delivery
  
  // Route Information
  originLat: decimal("origin_lat", { precision: 10, scale: 7 }).notNull(),
  originLng: decimal("origin_lng", { precision: 10, scale: 7 }).notNull(),
  destinationLat: decimal("destination_lat", { precision: 10, scale: 7 }).notNull(),
  destinationLng: decimal("destination_lng", { precision: 10, scale: 7 }).notNull(),
  
  // Route Details (from Google Maps)
  distanceMeters: integer("distance_meters"), // Total distance in meters
  durationSeconds: integer("duration_seconds"), // Estimated duration in seconds
  durationInTrafficSeconds: integer("duration_in_traffic_seconds"), // With traffic
  polyline: text("polyline"), // Encoded polyline for route visualization
  
  // Route Steps (JSON array of turn-by-turn directions)
  steps: jsonb("steps"),
  
  // Optimization Data
  optimizationScore: decimal("optimization_score", { precision: 5, scale: 2 }), // 0-100 score
  isOptimized: boolean("is_optimized").default(false),
  alternativeRoutesCount: integer("alternative_routes_count"),
  
  // ETA Tracking
  estimatedPickupTime: timestamp("estimated_pickup_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualPickupTime: timestamp("actual_pickup_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  
  // Status
  routeStatus: varchar("route_status", { length: 50 }).default('planned'), // planned, active, completed, cancelled
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_delivery_routes_order").on(table.orderId),
  index("idx_delivery_routes_driver").on(table.driverId),
  index("idx_delivery_routes_batch").on(table.batchId),
]);

// Batch Deliveries - Multiple orders delivered together
export const deliveryBatches = pgTable("delivery_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  
  // Batch Details
  orderIds: text("order_ids").array(), // Array of order IDs in this batch
  orderCount: integer("order_count").notNull(),
  stopSequence: jsonb("stop_sequence"), // Optimized sequence of stops with coordinates
  
  // Route Information
  totalDistanceMeters: integer("total_distance_meters"),
  totalDurationSeconds: integer("total_duration_seconds"),
  estimatedEarnings: decimal("estimated_earnings", { precision: 10, scale: 2 }),
  actualEarnings: decimal("actual_earnings", { precision: 10, scale: 2 }),
  
  // Optimization Metrics
  routeOptimizationSavings: decimal("route_optimization_savings", { precision: 10, scale: 2 }), // Distance saved vs individual deliveries
  timeOptimizationSavings: integer("time_optimization_savings"), // Time saved in seconds
  
  // Status
  batchStatus: varchar("batch_status", { length: 50 }).default('pending'), // pending, active, completed, cancelled
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_delivery_batches_driver").on(table.driverId),
  index("idx_delivery_batches_status").on(table.batchStatus),
]);

// ETA Updates - Track ETA changes and accuracy
export const etaUpdates = pgTable("eta_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  routeId: varchar("route_id").references(() => deliveryRoutes.id, { onDelete: 'cascade' }),
  
  // ETA Information
  estimatedMinutes: integer("estimated_minutes").notNull(),
  previousEstimatedMinutes: integer("previous_estimated_minutes"),
  changeReason: varchar("change_reason", { length: 100 }), // traffic, route_change, driver_delay
  
  // Location at time of update
  driverLat: decimal("driver_lat", { precision: 10, scale: 7 }),
  driverLng: decimal("driver_lng", { precision: 10, scale: 7 }),
  distanceRemainingMeters: integer("distance_remaining_meters"),
  
  // Traffic conditions
  trafficLevel: varchar("traffic_level", { length: 20 }), // light, moderate, heavy, severe
  
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("idx_eta_updates_order").on(table.orderId),
  index("idx_eta_updates_time").on(table.timestamp),
]);

// Traffic Incidents - Track traffic conditions affecting deliveries
export const trafficIncidents = pgTable("traffic_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Location
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  radius: integer("radius"), // Affected radius in meters
  
  // Incident Details
  incidentType: varchar("incident_type", { length: 50 }), // accident, construction, road_closure, heavy_traffic
  severity: varchar("severity", { length: 20 }), // low, medium, high, critical
  description: text("description"),
  
  // Impact
  delayMinutes: integer("delay_minutes"), // Estimated delay
  affectedOrders: text("affected_orders").array(), // Order IDs affected
  affectedDrivers: text("affected_drivers").array(), // Driver IDs in the area
  
  // Status
  isActive: boolean("is_active").default(true),
  resolvedAt: timestamp("resolved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_traffic_incidents_location").on(table.lat, table.lng),
  index("idx_traffic_incidents_active").on(table.isActive),
]);

// Dispatch Events - Track automated dispatch decisions
export const dispatchEvents = pgTable("dispatch_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Dispatch Decision
  assignedDriverId: varchar("assigned_driver_id").references(() => driverProfiles.id, { onDelete: 'cascade' }),
  dispatchMethod: varchar("dispatch_method", { length: 50 }), // auto, manual, ai
  
  // Scoring (for AI dispatch)
  candidateDrivers: jsonb("candidate_drivers"), // Array of drivers considered with their scores
  matchScore: decimal("match_score", { precision: 5, scale: 2 }), // 0-100
  
  // Decision Factors
  distanceToRestaurant: integer("distance_to_restaurant"), // meters
  distanceToCustomer: integer("distance_to_customer"), // meters
  driverRating: decimal("driver_rating", { precision: 3, scale: 2 }),
  driverAcceptanceRate: decimal("driver_acceptance_rate", { precision: 5, scale: 2 }),
  estimatedPickupTime: integer("estimated_pickup_time"), // seconds
  
  // Result
  wasAccepted: boolean("was_accepted"),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: varchar("rejection_reason", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_dispatch_events_order").on(table.orderId),
  index("idx_dispatch_events_driver").on(table.assignedDriverId),
]);

// Driver Analytics - Aggregated performance data
export const driverAnalytics = pgTable("driver_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  
  // Time Period
  periodType: varchar("period_type", { length: 20 }).notNull(), // hourly, daily, weekly, monthly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Performance Metrics
  totalDeliveries: integer("total_deliveries").default(0),
  completedDeliveries: integer("completed_deliveries").default(0),
  cancelledDeliveries: integer("cancelled_deliveries").default(0),
  
  // Earnings
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default('0'),
  averageEarningsPerDelivery: decimal("average_earnings_per_delivery", { precision: 10, scale: 2 }),
  averageEarningsPerHour: decimal("average_earnings_per_hour", { precision: 10, scale: 2 }),
  
  // Time Metrics
  totalActiveMinutes: integer("total_active_minutes").default(0),
  totalDeliveryMinutes: integer("total_delivery_minutes").default(0),
  averageDeliveryMinutes: decimal("average_delivery_minutes", { precision: 6, scale: 2 }),
  
  // Distance
  totalDistanceMeters: integer("total_distance_meters").default(0),
  averageDistancePerDelivery: integer("average_distance_per_delivery"),
  
  // Efficiency
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }),
  onTimeDeliveryRate: decimal("on_time_delivery_rate", { precision: 5, scale: 2 }),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  
  // Batch Performance
  batchDeliveries: integer("batch_deliveries").default(0),
  averageOrdersPerBatch: decimal("average_orders_per_batch", { precision: 4, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_driver_analytics_driver_period").on(table.driverId, table.periodStart),
  unique("unique_driver_period").on(table.driverId, table.periodType, table.periodStart),
]);

// ============================================
// PHASE 2: ADVANCED ROUTE OPTIMIZATION TABLES
// ============================================

// Vehicle Types - Different vehicle categories and their capabilities
export const vehicleTypes = pgTable("vehicle_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull(), // bike, scooter, car, van
  displayName: varchar("display_name", { length: 100 }).notNull(),
  
  // Performance Characteristics
  avgSpeed: integer("avg_speed").notNull(), // km/h
  maxDistance: integer("max_distance"), // km per trip
  
  // Capacity
  maxOrders: integer("max_orders").default(4),
  maxWeight: decimal("max_weight", { precision: 6, scale: 2 }), // kg
  
  // Features
  hasColdStorage: boolean("has_cold_storage").default(false),
  hasHotStorage: boolean("has_hot_storage").default(true),
  canCarryLarge: boolean("can_carry_large").default(false),
  
  // Costs
  costPerKm: decimal("cost_per_km", { precision: 6, scale: 2 }),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Driver Capabilities - Extended driver profile with vehicle and capacity info
export const driverCapabilities = pgTable("driver_capabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().unique().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  vehicleTypeId: varchar("vehicle_type_id").references(() => vehicleTypes.id),
  
  // Custom Capacity Overrides (if different from vehicle type defaults)
  maxOrders: integer("max_orders"),
  maxWeight: decimal("max_weight", { precision: 6, scale: 2 }),
  
  // Storage Capabilities
  hasColdStorage: boolean("has_cold_storage").default(false),
  hasHotStorage: boolean("has_hot_storage").default(true),
  
  // Special Equipment
  hasInsulatedBag: boolean("has_insulated_bag").default(true),
  hasCateringEquipment: boolean("has_catering_equipment").default(false),
  specialEquipment: text("special_equipment"), // JSON array of equipment
  
  // Restrictions
  canDeliverAlcohol: boolean("can_deliver_alcohol").default(false),
  requiresContactlessOnly: boolean("requires_contactless_only").default(false),
  
  // Preferences
  preferredOrderTypes: text("preferred_order_types"), // JSON array
  avoidHighways: boolean("avoid_highways").default(false),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_driver_capabilities_driver").on(table.driverId),
]);

// Route Constraints - Time windows and constraints for orders
export const routeConstraints = pgTable("route_constraints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Constraint Type
  constraintType: varchar("constraint_type", { length: 50 }).notNull(), // restaurant_ready, customer_window, driver_available, pickup_by, deliver_by
  
  // Time Window
  earliestTime: timestamp("earliest_time"),
  latestTime: timestamp("latest_time"),
  
  // Priority (lower number = higher priority)
  priority: integer("priority").default(5), // 1 (highest) to 10 (lowest)
  isHard: boolean("is_hard").default(true), // Hard constraint (must satisfy) vs soft (prefer to satisfy)
  
  // Violation Penalty (for soft constraints)
  violationPenalty: decimal("violation_penalty", { precision: 6, scale: 2 }),
  
  // Metadata
  reason: text("reason"), // Why this constraint exists
  customData: jsonb("custom_data"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_route_constraints_order").on(table.orderId),
  index("idx_route_constraints_time").on(table.earliestTime, table.latestTime),
]);

// Route Optimization History - Track optimization performance
export const routeOptimizationHistory = pgTable("route_optimization_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").references(() => deliveryBatches.id, { onDelete: 'cascade' }),
  driverId: varchar("driver_id").references(() => driverProfiles.id, { onDelete: 'cascade' }),
  
  // Input
  inputOrders: text("input_orders").array().notNull(), // Order IDs
  inputSequence: jsonb("input_sequence"), // Original order sequence
  
  // Algorithm Used
  algorithm: varchar("algorithm", { length: 50 }).notNull(), // greedy, 2opt, genetic, vrp_solver
  algorithmVersion: varchar("algorithm_version", { length: 20 }),
  
  // Output
  outputSequence: jsonb("output_sequence").notNull(), // Optimized sequence
  
  // Performance
  computeTimeMs: integer("compute_time_ms").notNull(),
  savingsPercentage: decimal("savings_percentage", { precision: 5, scale: 2 }), // % improvement
  distanceSaved: integer("distance_saved"), // meters
  timeSaved: integer("time_saved"), // seconds
  
  // Constraints
  constraintsSatisfied: boolean("constraints_satisfied").default(true),
  constraintsViolated: text("constraints_violated").array(),
  
  // Quality Score
  optimizationScore: integer("optimization_score"), // 0-100
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_route_opt_history_batch").on(table.batchId),
  index("idx_route_opt_history_driver").on(table.driverId),
]);

// Delivery Predictions - ML model predictions for delivery times
export const deliveryPredictions = pgTable("delivery_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  routeId: varchar("route_id").references(() => deliveryRoutes.id, { onDelete: 'cascade' }),
  
  // Prediction
  predictedPickupDuration: integer("predicted_pickup_duration"), // seconds from assignment
  predictedDeliveryDuration: integer("predicted_delivery_duration"), // seconds from pickup
  predictedTotalDuration: integer("predicted_total_duration"), // seconds total
  
  // Actual Results (filled in after delivery)
  actualPickupDuration: integer("actual_pickup_duration"),
  actualDeliveryDuration: integer("actual_delivery_duration"),
  actualTotalDuration: integer("actual_total_duration"),
  
  // Accuracy
  pickupAccuracy: decimal("pickup_accuracy", { precision: 5, scale: 2 }), // % accuracy
  deliveryAccuracy: decimal("delivery_accuracy", { precision: 5, scale: 2 }),
  totalAccuracy: decimal("total_accuracy", { precision: 5, scale: 2 }),
  
  // Model Info
  modelVersion: varchar("model_version", { length: 20 }),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }), // 0-100
  
  // Factors Used in Prediction
  factorsUsed: jsonb("factors_used"), // { weather, traffic, driver_experience, restaurant_prep_time, etc. }
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_delivery_predictions_order").on(table.orderId),
  index("idx_delivery_predictions_route").on(table.routeId),
]);

// Route Replays - Store actual path taken for analysis
export const routeReplays = pgTable("route_replays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").notNull().references(() => deliveryRoutes.id, { onDelete: 'cascade' }),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  
  // Planned vs Actual
  plannedPath: jsonb("planned_path").notNull(), // Array of {lat, lng, timestamp}
  actualPath: jsonb("actual_path").notNull(), // Actual GPS points
  
  // Deviations
  deviations: jsonb("deviations"), // Array of {location, reason, delay}
  totalDeviationDistance: integer("total_deviation_distance"), // meters off planned route
  totalDeviationTime: integer("total_deviation_time"), // seconds delay
  
  // Events
  events: jsonb("events"), // Array of {type, timestamp, location, description}
  // Event types: pickup_completed, delivery_completed, traffic_encountered, detour_taken, customer_unavailable, etc.
  
  // Analysis
  efficiencyScore: integer("efficiency_score"), // 0-100
  suggestions: text("suggestions").array(), // AI-generated suggestions for improvement
  
  // Weather & Traffic
  weatherConditions: varchar("weather_conditions", { length: 50 }),
  trafficLevel: varchar("traffic_level", { length: 20 }),
  
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_route_replays_route").on(table.routeId),
  index("idx_route_replays_driver").on(table.driverId),
  index("idx_route_replays_completed").on(table.completedAt),
]);

// ==========================================
// PHASE 3: AUTOMATED DISPATCHING TABLES
// ==========================================

// Dispatch Assignments - Track all order assignments to drivers
export const dispatchAssignments = pgTable("dispatch_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  driverId: varchar("driver_id").references(() => driverProfiles.id, { onDelete: 'set null' }),
  
  // Assignment Details
  assignmentType: varchar("assignment_type", { length: 20 }).notNull(), // 'auto', 'manual', 'broadcast'
  assignedBy: varchar("assigned_by"), // Admin user ID for manual assignments
  assignmentScore: decimal("assignment_score", { precision: 5, scale: 2 }), // 0-100, higher = better match
  
  // Status Tracking
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, accepted, rejected, expired, cancelled
  responseTime: integer("response_time"), // seconds taken to respond
  
  // Driver Position at Assignment
  driverLat: decimal("driver_lat", { precision: 10, scale: 7 }),
  driverLng: decimal("driver_lng", { precision: 10, scale: 7 }),
  distanceToRestaurant: decimal("distance_to_restaurant", { precision: 8, scale: 2 }), // km
  estimatedPickupTime: integer("estimated_pickup_time"), // minutes
  
  // Rejection Details (if rejected)
  rejectionReason: varchar("rejection_reason", { length: 100 }),
  rejectionCategory: varchar("rejection_category", { length: 50 }), // 'too_far', 'break', 'ending_shift', 'other'
  
  // Expiry
  expiresAt: timestamp("expires_at"),
  
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  index("idx_dispatch_order").on(table.orderId),
  index("idx_dispatch_driver").on(table.driverId),
  index("idx_dispatch_status").on(table.status),
  index("idx_dispatch_type").on(table.assignmentType),
  index("idx_dispatch_assigned_at").on(table.assignedAt),
]);

// Driver Scores - Real-time scores for matching algorithm
export const driverScores = pgTable("driver_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().unique().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  
  // Performance Metrics
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }).notNull().default('100'), // 0-100
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).notNull().default('100'), // 0-100
  onTimeRate: decimal("on_time_rate", { precision: 5, scale: 2 }).notNull().default('100'), // 0-100
  customerRating: decimal("customer_rating", { precision: 3, scale: 2 }).notNull().default('5.00'), // 0-5.00
  
  // Reliability Score (composite)
  reliabilityScore: decimal("reliability_score", { precision: 5, scale: 2 }).notNull().default('100'), // 0-100
  
  // Activity Metrics
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  deliveriesLast7Days: integer("deliveries_last_7_days").notNull().default(0),
  deliveriesLast30Days: integer("deliveries_last_30_days").notNull().default(0),
  
  // Speed Metrics
  avgPickupTime: integer("avg_pickup_time"), // minutes
  avgDeliveryTime: integer("avg_delivery_time"), // minutes
  avgResponseTime: integer("avg_response_time"), // seconds
  
  // Penalties
  activePenalties: integer("active_penalties").notNull().default(0),
  penaltyPoints: integer("penalty_points").notNull().default(0),
  
  // Current Status
  isOnline: boolean("is_online").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(false),
  hasActiveDelivery: boolean("has_active_delivery").notNull().default(false),
  
  // Priority & Preferences
  priorityLevel: integer("priority_level").notNull().default(1), // 1-5, higher = higher priority
  preferredZones: text("preferred_zones").array(), // Zone IDs
  
  lastDeliveryAt: timestamp("last_delivery_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_driver_scores_reliability").on(table.reliabilityScore),
  index("idx_driver_scores_online").on(table.isOnline),
  index("idx_driver_scores_available").on(table.isAvailable),
  index("idx_driver_scores_priority").on(table.priorityLevel),
]);

// Dispatch Preferences - Driver auto-dispatch settings
export const dispatchPreferences = pgTable("dispatch_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().unique().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  
  // Auto-Accept Settings
  autoAcceptEnabled: boolean("auto_accept_enabled").notNull().default(false),
  autoAcceptMaxDistance: decimal("auto_accept_max_distance", { precision: 5, scale: 2 }), // km
  autoAcceptMinPayout: decimal("auto_accept_min_payout", { precision: 8, scale: 2 }), // minimum delivery fee
  autoAcceptOnlyPreferredZones: boolean("auto_accept_only_preferred_zones").notNull().default(false),
  
  // Restrictions
  maxConcurrentOrders: integer("max_concurrent_orders").notNull().default(1),
  blockListRestaurants: text("block_list_restaurants").array(), // Restaurant IDs to avoid
  preferredRestaurants: text("preferred_restaurants").array(), // Restaurant IDs to prefer
  
  // Notification Preferences
  notificationSound: boolean("notification_sound").notNull().default(true),
  vibration: boolean("vibration").notNull().default(true),
  notificationPriority: varchar("notification_priority", { length: 20 }).notNull().default('high'), // high, medium, low
  
  // Schedule Preferences
  scheduleEnabled: boolean("schedule_enabled").notNull().default(false),
  availabilitySchedule: jsonb("availability_schedule"), // Weekly schedule
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rejection Penalties - Track and manage rejection penalties
export const rejectionPenalties = pgTable("rejection_penalties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  assignmentId: varchar("assignment_id").references(() => dispatchAssignments.id, { onDelete: 'set null' }),
  
  // Penalty Details
  penaltyType: varchar("penalty_type", { length: 50 }).notNull(), // 'rejection', 'timeout', 'cancellation', 'no_show'
  penaltyPoints: integer("penalty_points").notNull().default(1),
  severity: varchar("severity", { length: 20 }).notNull(), // 'minor', 'moderate', 'severe'
  
  // Impact
  durationMinutes: integer("duration_minutes"), // How long penalty lasts (null = permanent)
  reducedPriority: boolean("reduced_priority").notNull().default(false),
  temporarySuspension: boolean("temporary_suspension").notNull().default(false),
  
  reason: text("reason"),
  notes: text("notes"),
  
  // Resolution
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, expired, waived, appealed
  resolvedBy: varchar("resolved_by"), // Admin user ID
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_penalties_driver").on(table.driverId),
  index("idx_penalties_status").on(table.status),
  index("idx_penalties_created").on(table.createdAt),
  index("idx_penalties_expires").on(table.expiresAt),
]);

// Dispatch Queue - Priority queue for pending orders
export const dispatchQueue = pgTable("dispatch_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().unique().references(() => orders.id, { onDelete: 'cascade' }),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id, { onDelete: 'cascade' }), // null for API delivery jobs (no restaurant)

  // Priority Calculation
  priority: integer("priority").notNull().default(50), // 0-100, higher = more urgent
  urgencyScore: decimal("urgency_score", { precision: 5, scale: 2 }), // Based on wait time
  distanceScore: decimal("distance_score", { precision: 5, scale: 2 }), // Proximity to available drivers
  valueScore: decimal("value_score", { precision: 5, scale: 2 }), // Order value
  
  // Wait Time Tracking
  orderPlacedAt: timestamp("order_placed_at").notNull(),
  estimatedPrepTime: integer("estimated_prep_time"), // minutes
  targetPickupTime: timestamp("target_pickup_time"),
  maxWaitTime: integer("max_wait_time"), // minutes before escalation
  
  // Assignment Attempts
  assignmentAttempts: integer("assignment_attempts").notNull().default(0),
  lastAssignmentAttempt: timestamp("last_assignment_attempt"),
  rejectionCount: integer("rejection_count").notNull().default(0),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, assigning, assigned, failed, cancelled
  assignedDriverId: varchar("assigned_driver_id").references(() => driverProfiles.id, { onDelete: 'set null' }),
  assignedAt: timestamp("assigned_at"),
  
  // Escalation
  isEscalated: boolean("is_escalated").notNull().default(false),
  escalatedAt: timestamp("escalated_at"),
  escalationReason: varchar("escalation_reason", { length: 100 }),
  
  // Location
  restaurantLat: decimal("restaurant_lat", { precision: 10, scale: 7 }).notNull(),
  restaurantLng: decimal("restaurant_lng", { precision: 10, scale: 7 }).notNull(),
  deliveryLat: decimal("delivery_lat", { precision: 10, scale: 7 }).notNull(),
  deliveryLng: decimal("delivery_lng", { precision: 10, scale: 7 }).notNull(),
  
  metadata: jsonb("metadata"), // Additional data for custom logic
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_queue_priority").on(table.priority),
  index("idx_queue_status").on(table.status),
  index("idx_queue_created").on(table.createdAt),
  index("idx_queue_restaurant").on(table.restaurantId),
  index("idx_queue_escalated").on(table.isEscalated),
]);

// Assignment History - Historical record for analytics
export const assignmentHistory = pgTable("assignment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Assignment Flow
  timeInQueue: integer("time_in_queue"), // seconds
  assignmentAttempts: integer("assignment_attempts").notNull(),
  driversOffered: text("drivers_offered").array(), // Driver IDs
  driversRejected: text("drivers_rejected").array(), // Driver IDs who rejected
  
  // Final Assignment
  finalDriverId: varchar("final_driver_id").references(() => driverProfiles.id, { onDelete: 'set null' }),
  assignmentMethod: varchar("assignment_method", { length: 20 }), // 'auto', 'manual', 'broadcast', 'fallback'
  finalScore: decimal("final_score", { precision: 5, scale: 2 }),
  
  // Performance
  timeToAcceptance: integer("time_to_acceptance"), // seconds
  wasEscalated: boolean("was_escalated").notNull().default(false),
  escalationCount: integer("escalation_count").notNull().default(0),
  
  // Quality Metrics
  matchQuality: varchar("match_quality", { length: 20 }), // 'excellent', 'good', 'fair', 'poor'
  driverDistanceAtAssignment: decimal("driver_distance_at_assignment", { precision: 8, scale: 2 }), // km
  
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_assignment_history_order").on(table.orderId),
  index("idx_assignment_history_driver").on(table.finalDriverId),
  index("idx_assignment_history_method").on(table.assignmentMethod),
  index("idx_assignment_history_created").on(table.createdAt),
]);

// ==========================================
// PHASE 4: ADVANCED BATCH DELIVERY TABLES
// ==========================================

// Batch Stops - Track each stop in a batch delivery
export const batchStops = pgTable("batch_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => deliveryBatches.id, { onDelete: 'cascade' }),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Stop Details
  stopType: varchar("stop_type", { length: 20 }).notNull(), // 'pickup', 'dropoff'
  stopNumber: integer("stop_number").notNull(), // Sequence number in batch (1, 2, 3...)
  
  // Location
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  address: text("address").notNull(),
  
  // Timing
  estimatedArrivalTime: timestamp("estimated_arrival_time"),
  actualArrivalTime: timestamp("actual_arrival_time"),
  estimatedDuration: integer("estimated_duration"), // minutes at stop
  actualDuration: integer("actual_duration"), // minutes spent at stop
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, in_progress, completed, skipped, failed
  completedAt: timestamp("completed_at"),
  
  // Special Instructions
  instructions: text("instructions"),
  contactName: varchar("contact_name", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  
  // Issues
  hasIssues: boolean("has_issues").default(false),
  issueDescription: text("issue_description"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_batch_stops_batch").on(table.batchId),
  index("idx_batch_stops_order").on(table.orderId),
  index("idx_batch_stops_status").on(table.status),
  index("idx_batch_stops_sequence").on(table.batchId, table.stopNumber),
]);

// Batch Modifications - Track changes to batches during delivery
export const batchModifications = pgTable("batch_modifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => deliveryBatches.id, { onDelete: 'cascade' }),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  
  // Modification Details
  modificationType: varchar("modification_type", { length: 50 }).notNull(), // 'reorder', 'add', 'remove', 'split'
  reason: varchar("reason", { length: 100 }), // 'customer_request', 'traffic', 'driver_decision', 'order_cancelled'
  
  // Before/After State
  beforeState: jsonb("before_state"), // Previous stop sequence
  afterState: jsonb("after_state"), // New stop sequence
  affectedOrderIds: text("affected_order_ids").array(),
  
  // Impact Analysis
  distanceImpact: integer("distance_impact"), // Meters added/saved (negative = saved)
  timeImpact: integer("time_impact"), // Seconds added/saved (negative = saved)
  earningsImpact: decimal("earnings_impact", { precision: 8, scale: 2 }), // $ added/lost
  
  // Approval
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: varchar("approved_by"), // Admin user ID
  approvedAt: timestamp("approved_at"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_batch_mods_batch").on(table.batchId),
  index("idx_batch_mods_driver").on(table.driverId),
  index("idx_batch_mods_type").on(table.modificationType),
  index("idx_batch_mods_created").on(table.createdAt),
]);

// Batch Compatibility - Track order compatibility for batch grouping
export const batchCompatibility = pgTable("batch_compatibility", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  order1Id: varchar("order1_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  order2Id: varchar("order2_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Compatibility Scores
  locationScore: decimal("location_score", { precision: 5, scale: 2 }), // 0-100
  timeScore: decimal("time_score", { precision: 5, scale: 2 }), // 0-100
  valueScore: decimal("value_score", { precision: 5, scale: 2 }), // 0-100
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(), // 0-100
  
  // Compatibility Factors
  distanceBetween: decimal("distance_between", { precision: 8, scale: 2 }), // km
  timeDifference: integer("time_difference"), // seconds between order times
  sameRestaurant: boolean("same_restaurant").notNull().default(false),
  sameNeighborhood: boolean("same_neighborhood").default(false),
  
  // Constraints
  isCompatible: boolean("is_compatible").notNull(),
  incompatibilityReasons: text("incompatibility_reasons").array(),
  
  // Caching
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Cache expiry
}, (table) => [
  index("idx_batch_compat_order1").on(table.order1Id),
  index("idx_batch_compat_order2").on(table.order2Id),
  index("idx_batch_compat_score").on(table.overallScore),
  index("idx_batch_compat_compatible").on(table.isCompatible),
]);

// Batch Performance - Analytics for batch delivery performance
export const batchPerformance = pgTable("batch_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => deliveryBatches.id, { onDelete: 'cascade' }),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
  
  // Performance Metrics
  totalStops: integer("total_stops").notNull(),
  completedStops: integer("completed_stops").notNull(),
  skippedStops: integer("skipped_stops").default(0),
  failedStops: integer("failed_stops").default(0),
  
  // Time Metrics
  plannedDuration: integer("planned_duration"), // seconds
  actualDuration: integer("actual_duration"), // seconds
  idleTime: integer("idle_time"), // seconds waiting between stops
  
  // Distance Metrics
  plannedDistance: decimal("planned_distance", { precision: 10, scale: 2 }), // km
  actualDistance: decimal("actual_distance", { precision: 10, scale: 2 }), // km
  
  // Earnings
  plannedEarnings: decimal("planned_earnings", { precision: 10, scale: 2 }),
  actualEarnings: decimal("actual_earnings", { precision: 10, scale: 2 }),
  bonusEarnings: decimal("bonus_earnings", { precision: 10, scale: 2 }).default('0'), // Performance bonus
  
  // Efficiency Scores
  routeEfficiency: decimal("route_efficiency", { precision: 5, scale: 2 }), // 0-100
  timeEfficiency: decimal("time_efficiency", { precision: 5, scale: 2 }), // 0-100
  customerSatisfaction: decimal("customer_satisfaction", { precision: 3, scale: 2 }), // 0-5.00
  
  // Issues
  totalIssues: integer("total_issues").default(0),
  modificationsCount: integer("modifications_count").default(0),
  
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_batch_perf_batch").on(table.batchId),
  index("idx_batch_perf_driver").on(table.driverId),
  index("idx_batch_perf_completed").on(table.completedAt),
  index("idx_batch_perf_efficiency").on(table.routeEfficiency),
]);

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

export const insertDriverProfileSchema = createInsertSchema(driverProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDriverProfile = z.infer<typeof insertDriverProfileSchema>;
export type DriverProfile = typeof driverProfiles.$inferSelect;

export const insertDriverWalletBalanceSchema = createInsertSchema(driverWalletBalances).omit({
  id: true,
  updatedAt: true,
});
export type InsertDriverWalletBalance = z.infer<typeof insertDriverWalletBalanceSchema>;
export type DriverWalletBalance = typeof driverWalletBalances.$inferSelect;

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

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export const insertDriverDeliveryStatusSchema = createInsertSchema(driverDeliveryStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDriverDeliveryStatus = z.infer<typeof insertDriverDeliveryStatusSchema>;
export type DriverDeliveryStatus = typeof driverDeliveryStatus.$inferSelect;

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

export const insertMarketingEventSchema = createInsertSchema(marketingEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertMarketingEvent = z.infer<typeof insertMarketingEventSchema>;
export type MarketingEvent = typeof marketingEvents.$inferSelect;

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

// Phase 3: Automated Dispatching Schema Exports
export const insertDispatchAssignmentSchema = createInsertSchema(dispatchAssignments).omit({
  id: true,
  assignedAt: true,
});
export type InsertDispatchAssignment = z.infer<typeof insertDispatchAssignmentSchema>;
export type DispatchAssignment = typeof dispatchAssignments.$inferSelect;

export const insertDriverScoreSchema = createInsertSchema(driverScores).omit({
  id: true,
  updatedAt: true,
});
export type InsertDriverScore = z.infer<typeof insertDriverScoreSchema>;
export type DriverScore = typeof driverScores.$inferSelect;

export const insertDispatchPreferenceSchema = createInsertSchema(dispatchPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDispatchPreference = z.infer<typeof insertDispatchPreferenceSchema>;
export type DispatchPreference = typeof dispatchPreferences.$inferSelect;

export const insertRejectionPenaltySchema = createInsertSchema(rejectionPenalties).omit({
  id: true,
  createdAt: true,
});
export type InsertRejectionPenalty = z.infer<typeof insertRejectionPenaltySchema>;
export type RejectionPenalty = typeof rejectionPenalties.$inferSelect;

export const insertDispatchQueueSchema = createInsertSchema(dispatchQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDispatchQueue = z.infer<typeof insertDispatchQueueSchema>;
export type DispatchQueue = typeof dispatchQueue.$inferSelect;

export const insertAssignmentHistorySchema = createInsertSchema(assignmentHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertAssignmentHistory = z.infer<typeof insertAssignmentHistorySchema>;
export type AssignmentHistory = typeof assignmentHistory.$inferSelect;

// Phase 4: Advanced Batch Delivery Schema Exports
export const insertBatchStopSchema = createInsertSchema(batchStops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBatchStop = z.infer<typeof insertBatchStopSchema>;
export type BatchStop = typeof batchStops.$inferSelect;

export const insertBatchModificationSchema = createInsertSchema(batchModifications).omit({
  id: true,
  createdAt: true,
});
export type InsertBatchModification = z.infer<typeof insertBatchModificationSchema>;
export type BatchModification = typeof batchModifications.$inferSelect;

export const insertBatchCompatibilitySchema = createInsertSchema(batchCompatibility).omit({
  id: true,
  calculatedAt: true,
});
export type InsertBatchCompatibility = z.infer<typeof insertBatchCompatibilitySchema>;
export type BatchCompatibility = typeof batchCompatibility.$inferSelect;

export const insertBatchPerformanceSchema = createInsertSchema(batchPerformance).omit({
  id: true,
  createdAt: true,
});
export type InsertBatchPerformance = z.infer<typeof insertBatchPerformanceSchema>;
export type BatchPerformance = typeof batchPerformance.$inferSelect;

// ==========================================
// PHASE 5: ANALYTICS & PERFORMANCE TABLES
// ==========================================

// Driver Earnings History - Daily aggregated earnings data
export const driverEarningsHistory = pgTable("driver_earnings_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  totalEarnings: varchar("total_earnings").notNull().default('0'),
  deliveryCount: integer("delivery_count").notNull().default(0),
  totalDistanceKm: varchar("total_distance_km").notNull().default('0'),
  totalDurationMinutes: integer("total_duration_minutes").notNull().default(0),
  tipsAmount: varchar("tips_amount").notNull().default('0'),
  basePayAmount: varchar("base_pay_amount").notNull().default('0'),
  bonusesAmount: varchar("bonuses_amount").notNull().default('0'),
  avgEarningsPerDelivery: varchar("avg_earnings_per_delivery").notNull().default('0'),
  avgEarningsPerKm: varchar("avg_earnings_per_km").notNull().default('0'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  indexDriverDate: index("idx_earnings_driver_date").on(table.driverId, table.date),
  indexDate: index("idx_earnings_date").on(table.date),
  uniqueDriverDate: unique("idx_earnings_unique").on(table.driverId, table.date),
}));

// Driver Performance Metrics - Daily performance tracking
export const driverPerformanceMetrics = pgTable("driver_performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  deliveriesCompleted: integer("deliveries_completed").notNull().default(0),
  deliveriesAccepted: integer("deliveries_accepted").notNull().default(0),
  deliveriesRejected: integer("deliveries_rejected").notNull().default(0),
  acceptanceRate: varchar("acceptance_rate").notNull().default('0'), // percentage 0-100
  onTimeDeliveries: integer("on_time_deliveries").notNull().default(0),
  lateDeliveries: integer("late_deliveries").notNull().default(0),
  onTimeRate: varchar("on_time_rate").notNull().default('0'), // percentage 0-100
  avgDeliveryTimeMinutes: integer("avg_delivery_time_minutes").notNull().default(0),
  avgCustomerRating: varchar("avg_customer_rating").notNull().default('0'),
  efficiencyScore: varchar("efficiency_score").notNull().default('0'), // deliveries per hour
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  indexDriverDate: index("idx_performance_driver_date").on(table.driverId, table.date),
  indexDate: index("idx_performance_date").on(table.date),
  uniqueDriverDate: unique("idx_performance_unique").on(table.driverId, table.date),
}));

// Delivery Heat Map Data - Grid-based delivery and earnings data
export const deliveryHeatMapData = pgTable("delivery_heat_map_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gridLat: varchar("grid_lat").notNull(), // Rounded to 3 decimals (~111m grid)
  gridLng: varchar("grid_lng").notNull(), // Rounded to 3 decimals
  date: varchar("date").notNull(), // YYYY-MM-DD format
  hourOfDay: integer("hour_of_day").notNull(), // 0-23
  deliveryCount: integer("delivery_count").notNull().default(0),
  totalEarnings: varchar("total_earnings").notNull().default('0'),
  avgDeliveryTimeMinutes: integer("avg_delivery_time_minutes").notNull().default(0),
  demandScore: varchar("demand_score").notNull().default('0'), // 0-100 calculated score
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  indexGrid: index("idx_heatmap_grid").on(table.gridLat, table.gridLng),
  indexDateHour: index("idx_heatmap_date_hour").on(table.date, table.hourOfDay),
  uniqueGridDateHour: unique("idx_heatmap_unique").on(table.gridLat, table.gridLng, table.date, table.hourOfDay),
}));

// Driver Time Slots - Earnings by day of week and hour
export const driverTimeSlots = pgTable("driver_time_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  hourOfDay: integer("hour_of_day").notNull(), // 0-23
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  totalEarnings: varchar("total_earnings").notNull().default('0'),
  avgEarningsPerHour: varchar("avg_earnings_per_hour").notNull().default('0'),
  sampleCount: integer("sample_count").notNull().default(0), // Times worked this slot
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  indexDriver: index("idx_timeslots_driver").on(table.driverId),
  indexDayHour: index("idx_timeslots_day_hour").on(table.dayOfWeek, table.hourOfDay),
  uniqueDriverDayHour: unique("idx_timeslots_unique").on(table.driverId, table.dayOfWeek, table.hourOfDay),
}));

// Zone Performance Stats - Performance metrics by delivery zone
export const zonePerformanceStats = pgTable("zone_performance_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: varchar("zone_id").notNull().references(() => deliveryZones.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  totalOrders: integer("total_orders").notNull().default(0),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  avgDeliveryTimeMinutes: integer("avg_delivery_time_minutes").notNull().default(0),
  avgEarningsPerDelivery: varchar("avg_earnings_per_delivery").notNull().default('0'),
  demandLevel: varchar("demand_level").notNull().default('medium'), // low, medium, high, very_high
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  indexZoneDate: index("idx_zone_stats_zone_date").on(table.zoneId, table.date),
  indexDate: index("idx_zone_stats_date").on(table.date),
  uniqueZoneDate: unique("idx_zone_stats_unique").on(table.zoneId, table.date),
}));

// Driver Goals - Gamification and goal tracking
export const driverGoals = pgTable("driver_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: "cascade" }),
  goalType: varchar("goal_type").notNull(), // daily_earnings, weekly_deliveries, acceptance_rate, etc.
  targetValue: varchar("target_value").notNull(),
  currentValue: varchar("current_value").notNull().default('0'),
  startDate: varchar("start_date").notNull(), // YYYY-MM-DD
  endDate: varchar("end_date").notNull(), // YYYY-MM-DD
  status: varchar("status").notNull().default('in_progress'), // in_progress, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  indexDriver: index("idx_goals_driver").on(table.driverId),
  indexStatus: index("idx_goals_status").on(table.status),
  indexDates: index("idx_goals_dates").on(table.startDate, table.endDate),
}));

// Phase 5: Analytics & Performance Schema Exports
export const insertDriverEarningsHistorySchema = createInsertSchema(driverEarningsHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertDriverEarningsHistory = z.infer<typeof insertDriverEarningsHistorySchema>;
export type DriverEarningsHistory = typeof driverEarningsHistory.$inferSelect;

export const insertDriverPerformanceMetricsSchema = createInsertSchema(driverPerformanceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDriverPerformanceMetrics = z.infer<typeof insertDriverPerformanceMetricsSchema>;
export type DriverPerformanceMetrics = typeof driverPerformanceMetrics.$inferSelect;

export const insertDeliveryHeatMapDataSchema = createInsertSchema(deliveryHeatMapData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDeliveryHeatMapData = z.infer<typeof insertDeliveryHeatMapDataSchema>;
export type DeliveryHeatMapData = typeof deliveryHeatMapData.$inferSelect;

export const insertDriverTimeSlotsSchema = createInsertSchema(driverTimeSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDriverTimeSlots = z.infer<typeof insertDriverTimeSlotsSchema>;
export type DriverTimeSlots = typeof driverTimeSlots.$inferSelect;

export const insertZonePerformanceStatsSchema = createInsertSchema(zonePerformanceStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertZonePerformanceStats = z.infer<typeof insertZonePerformanceStatsSchema>;
export type ZonePerformanceStats = typeof zonePerformanceStats.$inferSelect;

export const insertDriverGoalsSchema = createInsertSchema(driverGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDriverGoals = z.infer<typeof insertDriverGoalsSchema>;
export type DriverGoals = typeof driverGoals.$inferSelect;

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

// ETA Predictions - Track predicted vs actual arrival times
export const etaPredictions = pgTable("eta_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryId: varchar("delivery_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: "cascade" }),
  predictedEta: timestamp("predicted_eta").notNull(),
  actualArrival: timestamp("actual_arrival"),
  predictionErrorMinutes: integer("prediction_error_minutes"),
  trafficLevel: varchar("traffic_level").notNull().default('medium'), // low, medium, high, very_high
  weatherCondition: varchar("weather_condition"),
  routeDistanceKm: varchar("route_distance_km").notNull(),
  routeDurationMinutes: integer("route_duration_minutes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  indexDelivery: index("idx_eta_delivery").on(table.deliveryId),
  indexDriver: index("idx_eta_driver").on(table.driverId),
  indexAccuracy: index("idx_eta_accuracy").on(table.predictionErrorMinutes),
}));

// Driver Behavior Patterns - AI-identified patterns for insights
export const driverBehaviorPatterns = pgTable("driver_behavior_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: "cascade" }),
  patternType: varchar("pattern_type").notNull(), // speed, efficiency, zone_mastery, acceptance, etc.
  patternData: varchar("pattern_data").notNull(), // JSON string with pattern details
  confidenceScore: varchar("confidence_score").notNull().default('0'), // 0-100
  sampleSize: integer("sample_size").notNull().default(0), // Number of deliveries analyzed
  date: varchar("date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  indexDriver: index("idx_behavior_driver").on(table.driverId),
  indexPattern: index("idx_behavior_pattern").on(table.patternType),
  indexDate: index("idx_behavior_date").on(table.date),
  uniqueDriverPatternDate: unique("idx_behavior_unique").on(table.driverId, table.patternType, table.date),
}));

// Smart Recommendations - AI-generated actionable suggestions
export const smartRecommendations = pgTable("smart_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => driverProfiles.id, { onDelete: "cascade" }),
  recommendationType: varchar("recommendation_type").notNull(), // work_now, best_zone, batch, peak_incoming, go_home
  priority: integer("priority").notNull().default(3), // 1-5 (5 = urgent)
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  actionUrl: varchar("action_url"), // Deep link to relevant page
  expiresAt: timestamp("expires_at").notNull(),
  dismissedAt: timestamp("dismissed_at"),
  actedUponAt: timestamp("acted_upon_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  indexDriver: index("idx_recommendations_driver").on(table.driverId),
  indexActive: index("idx_recommendations_active").on(table.expiresAt, table.dismissedAt),
  indexPriority: index("idx_recommendations_priority").on(table.priority),
}));

// Surge Pricing Log - Track surge multipliers and effectiveness
export const surgePricingLog = pgTable("surge_pricing_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: varchar("zone_id").references(() => deliveryZones.id, { onDelete: "set null" }),
  surgeMultiplier: varchar("surge_multiplier").notNull(), // 1.0 - 3.0
  demandScore: varchar("demand_score").notNull(), // 0-100
  supplyScore: varchar("supply_score").notNull(), // 0-100
  activeOrders: integer("active_orders").notNull().default(0),
  availableDrivers: integer("available_drivers").notNull().default(0),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  indexZone: index("idx_surge_zone").on(table.zoneId),
  indexTime: index("idx_surge_time").on(table.startTime),
  indexActive: index("idx_surge_active").on(table.endTime),
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

export const insertEtaPredictionsSchema = createInsertSchema(etaPredictions).omit({
  id: true,
  createdAt: true,
});
export type InsertEtaPredictions = z.infer<typeof insertEtaPredictionsSchema>;
export type EtaPredictions = typeof etaPredictions.$inferSelect;

export const insertDriverBehaviorPatternsSchema = createInsertSchema(driverBehaviorPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDriverBehaviorPatterns = z.infer<typeof insertDriverBehaviorPatternsSchema>;
export type DriverBehaviorPatterns = typeof driverBehaviorPatterns.$inferSelect;

export const insertSmartRecommendationsSchema = createInsertSchema(smartRecommendations).omit({
  id: true,
  createdAt: true,
});
export type InsertSmartRecommendations = z.infer<typeof insertSmartRecommendationsSchema>;
export type SmartRecommendations = typeof smartRecommendations.$inferSelect;

export const insertSurgePricingLogSchema = createInsertSchema(surgePricingLog).omit({
  id: true,
  createdAt: true,
});
export type InsertSurgePricingLog = z.infer<typeof insertSurgePricingLogSchema>;
export type SurgePricingLog = typeof surgePricingLog.$inferSelect;

export const insertMlTrainingDataSchema = createInsertSchema(mlTrainingData).omit({
  id: true,
  createdAt: true,
});
export type InsertMlTrainingData = z.infer<typeof insertMlTrainingDataSchema>;
export type MlTrainingData = typeof mlTrainingData.$inferSelect;

