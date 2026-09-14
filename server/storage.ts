import {
  users,
  merchants,
  platformSettings,
  menuCategories,
  menuItems,
  tables,
  reservations,
  orders,
  orderItems,
  orderRefunds,
  orderEvents,
  giftCards,
  giftCardTransactions,
  promoRedemptions,
  collections,
  collectionItems,
  storefrontPages,
  contactMessages,
  storeGenerations,
  newsletterSubscribers,
  productVariants,
  customerSegments,
  segmentMembers,
  campaigns,
  campaignRuns,
  campaignDeliveries,
  abandonedCarts,
  boostCredits,
  boostSlots,
  staff,
  inventory,
  merchantPayoutAccounts,
  earningsLedger,
  payoutRuns,
  payoutRunLedgerEntries,
  customerReviews,
  customers,
  customerAddresses,
  loyaltyPrograms,
  loyaltyTiers,
  loyaltyAccounts,
  loyaltyTransactions,
  customerCreditTransactions,
  inboxMessages,
  promoRules,
  bundles as bundlesTable,
  upsellRules as upsellRulesTable,
  activityLogs,
  translationRecords,
  storefrontSessions,
  markets,
  type User,
  type UpsertUser,
  type Merchant,
  type InsertMerchant,
  type MenuCategory,
  type InsertMenuCategory,
  type MenuItem,
  type InsertMenuItem,
  type Table,
  type InsertTable,
  type Reservation,
  type InsertReservation,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderRefund,
  type OrderEvent,
  type GiftCard,
  type GiftCardTransaction,
  type Collection,
  type CollectionItem,
  type StorefrontPage,
  type InsertStorefrontPage,
  type ContactMessage,
  type InsertContactMessage,
  type StoreGeneration,
  type NewsletterSubscriber,
  type ProductVariant,
  type CustomerSegment,
  type Campaign,
  type CampaignRun,
  type CampaignDelivery,
  type AbandonedCart,
  type BoostSlot,
  type BoostCredit,
  type Staff,
  type InsertStaff,
  type Inventory,
  type InsertInventory,
  type MerchantPayoutAccount,
  type InsertMerchantPayoutAccount,
  type CustomerReview,
  type InsertCustomerReview,
  type Customer,
  type InsertCustomer,
  type CustomerAddress,
  type InsertCustomerAddress,
  type LoyaltyProgram,
  type LoyaltyTier,
  type InsertLoyaltyTier,
  type LoyaltyAccount,
  type LoyaltyTransaction,
  type CustomerCreditTransaction,
  type InboxMessage,
  type InsertInboxMessage,
  type Bundle,
  type ActivityLog,
  type InsertActivityLog,
  type TranslationRecord,
  type InsertTranslationRecord,
  type InsertStorefrontSession,
  type Market,
  type InsertMarket,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, sql, inArray, gte, lte, isNotNull, isNull } from "drizzle-orm";

/** URL handle from a title: lowercase, hyphen-separated, ascii-ish. */
export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 200);
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  createUser(user: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: Date;
  }): Promise<User>;
  
  // Merchant operations
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantByOwnerId(ownerId: string): Promise<Merchant | undefined>;
  getMerchantBySlug(slug: string): Promise<Merchant | undefined>;
  getMerchantBySubdomain(subdomain: string): Promise<Merchant | undefined>;
  getMerchantByCustomDomain(customDomain: string): Promise<Merchant | undefined>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, merchant: Partial<InsertMerchant>): Promise<Merchant>;
  deleteMerchant(id: string): Promise<void>;
  
  // Menu operations
  getMenuCategories(merchantId: string): Promise<MenuCategory[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(id: string, category: Partial<InsertMenuCategory>): Promise<MenuCategory>;
  deleteMenuCategory(id: string): Promise<void>;
  getMenuItems(merchantId: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: string): Promise<void>;
  
  // Table operations
  getTables(merchantId: string): Promise<Table[]>;
  getTable(id: string): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: string, table: Partial<InsertTable>): Promise<Table>;
  deleteTable(id: string): Promise<void>;
  
  // Reservation operations
  getReservations(merchantId: string): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation>;
  deleteReservation(id: string): Promise<void>;
  
  // Order operations
  getOrders(merchantId: string): Promise<Order[]>;
  getRecentOrders(merchantId: string, limit: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getOrderWithItems(orderId: string): Promise<{ order: Order; items: (OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[] } | undefined>;
  getAllOrderItems(merchantId: string): Promise<(OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[]>;
  createOrder(order: InsertOrder, items: Omit<InsertOrderItem, 'orderId'>[]): Promise<Order>;
  updateOrderStatus(orderId: string, status: string, tracking?: { trackingNumber?: string | null; shippingCarrier?: string | null }): Promise<Order>;
  confirmOrderWithPayment(orderId: string, paymentProvider: string, paymentIntentId: string, totalAmount: number, shippingFee?: number): Promise<Order>;
  getLastOrderByPrefix(merchantId: string, prefix: string): Promise<Order | undefined>;
  
  // Staff operations
  getStaff(merchantId: string): Promise<Staff[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;
  
  // Inventory operations
  getInventory(merchantId: string): Promise<Inventory[]>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: string, inventory: Partial<InsertInventory>): Promise<Inventory>;
  deleteInventory(id: string): Promise<void>;
  
  // Payout account operations
  getPayoutAccount(merchantId: string): Promise<MerchantPayoutAccount | undefined>;
  createOrUpdatePayoutAccount(merchantId: string, account: Partial<InsertMerchantPayoutAccount>): Promise<MerchantPayoutAccount>;
  
  // Earnings and Payouts operations
  getEarningsLedger(merchantId: string): Promise<any[]>;
  getPayoutRuns(merchantId: string): Promise<any[]>;
  getPendingEarnings(merchantId: string): Promise<{ total: string; count: number }>;
  createPayoutRun(merchantId: string, amount: number, payoutProvider: string, scheduledFor: Date): Promise<any>;
  updatePayoutRunStatus(payoutRunId: string, status: string, payoutTransactionId?: string, failureReason?: string): Promise<any>;
  markLedgerEntriesAsPaid(payoutRunId: string, ledgerEntryIds: string[]): Promise<void>;
  completePayoutTransaction(payoutRunId: string, ledgerEntryIds: string[], payoutTransactionId: string): Promise<void>;
  
  updateOrder(orderId: string, data: Partial<Order>): Promise<Order>;

  // Upsell operations
  getActiveUpsellRules(merchantId: string): Promise<any[]>;
  getUpsellRules(merchantId: string): Promise<any[]>;
  getUpsellRule(id: string): Promise<any | null>;
  createUpsellRule(rule: any): Promise<any>;
  updateUpsellRule(id: string, updates: any): Promise<any>;
  deleteUpsellRule(id: string): Promise<void>;

  // Admin operations
  getAllMerchants(): Promise<(Merchant & { owner: Omit<User, 'password'> })[]>;
  getAllUsers(): Promise<User[]>;
  getAllUsersForAdmin(): Promise<any[]>;
  updateUser(userId: string, data: Partial<UpsertUser>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  updateUserRole(userId: string, role: string): Promise<User>;
  deleteMerchantCompletely(id: string): Promise<void>;
  
  // Platform Settings operations
  getPlatformSettings(): Promise<any[]>;
  getPlatformSetting(key: string): Promise<any | undefined>;
  updatePlatformSetting(key: string, value: string, updatedBy: string): Promise<any>;
  
  // Admin Financial Dashboard operations
  getFinancialSummary(): Promise<{ totalRevenue: string; totalCommissions: string; totalPayouts: string; pendingPayouts: string }>;
  getMerchantFinancialBreakdown(): Promise<Array<{ merchantId: string; merchantName: string; totalOrders: number; totalRevenue: string; commissionEarned: string; lastPayoutDate: Date | null }>>;
  getRecentPayoutRuns(limit: number): Promise<any[]>;
  
  // Admin Payout Management operations
  getAllPayoutRunsForAdmin(status?: string): Promise<any[]>;
  retryFailedPayout(payoutRunId: string): Promise<any>;
  cancelPayoutRun(payoutRunId: string): Promise<any>;
  manuallyMarkPayoutAsPaid(payoutRunId: string, transactionId: string): Promise<any>;
  
  // Admin Content Moderation operations
  getAllReviewsForAdmin(status?: string): Promise<any[]>;
  updateReviewStatus(reviewId: string, isPublished: boolean): Promise<CustomerReview>;
  deleteReview(reviewId: string): Promise<void>;
  respondToReview(reviewId: string, response: string): Promise<CustomerReview>;
  
  // Admin Activity Logs operations
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getAllActivityLogs(filters?: { actionCategory?: string; userId?: string; startDate?: string; endDate?: string }): Promise<ActivityLog[]>;
  
  // Translation operations
  getTranslationById(id: string): Promise<any | undefined>;
  getTranslations(merchantId: string, entityType: string, entityId: string, locale?: string): Promise<any[]>;
  getTranslationsByLocale(merchantId: string, locale: string): Promise<any[]>;
  createOrUpdateTranslation(merchantId: string, data: { entityType: string; entityId: string; locale: string; field: string; value: string; lastUpdatedBy?: string }): Promise<any>;
  bulkUpsertTranslations(merchantId: string, translations: Array<{ entityType: string; entityId: string; locale: string; field: string; value: string }>): Promise<void>;
  deleteTranslation(id: string): Promise<void>;
  markTranslationsAsNeedingReview(merchantId: string, entityType: string, entityId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db.insert(users).values(userData as UpsertUser).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSubscription(userId: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: Date;
  }): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getMerchant(id: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    return merchant;
  }

  async getMerchantByOwnerId(ownerId: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.ownerId, ownerId));
    return merchant;
  }

  async getMerchantBySlug(slug: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.slug, slug));
    return merchant;
  }

  async getMerchantBySubdomain(subdomain: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.subdomain, subdomain));
    return merchant;
  }

  async getMerchantByCustomDomain(customDomain: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.customDomain, customDomain));
    return merchant;
  }

  async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
    const [newMerchant] = await db.insert(merchants).values(merchant).returning();
    return newMerchant;
  }

  async updateMerchant(id: string, merchant: Partial<InsertMerchant>): Promise<Merchant> {
    const [updated] = await db
      .update(merchants)
      .set({ ...merchant, updatedAt: new Date() })
      .where(eq(merchants.id, id))
      .returning();
    return updated;
  }

  async deleteMerchant(id: string): Promise<void> {
    await db.delete(merchants).where(eq(merchants.id, id));
  }

  async deleteMerchantCompletely(id: string): Promise<void> {
    // Delete all associated data in correct order (respecting foreign keys)
    // Delete order items first, then orders
    const merchantOrders = await db.select().from(orders).where(eq(orders.merchantId, id));
    const orderIds = merchantOrders.map(o => o.id);
    
    if (orderIds.length > 0) {
      await db.delete(orderItems).where(sql`${orderItems.orderId} IN ${orderIds}`);
      await db.delete(orders).where(eq(orders.merchantId, id));
    }
    
    // Delete menu items and categories
    await db.delete(menuItems).where(eq(menuItems.merchantId, id));
    await db.delete(menuCategories).where(eq(menuCategories.merchantId, id));
    
    // Delete staff, inventory
    await db.delete(staff).where(eq(staff.merchantId, id));
    await db.delete(inventory).where(eq(inventory.merchantId, id));
    
    // Delete customer reviews
    await db.delete(customerReviews).where(eq(customerReviews.merchantId, id));
    
    // Delete inbox messages
    await db.delete(inboxMessages).where(eq(inboxMessages.merchantId, id));
    
    // Delete promo rules and bundles
    await db.delete(promoRules).where(eq(promoRules.merchantId, id));
    await db.delete(bundlesTable).where(eq(bundlesTable.merchantId, id));
    await db.delete(upsellRulesTable).where(eq(upsellRulesTable.merchantId, id));
    
    // Delete payout-related data
    await db.delete(earningsLedger).where(eq(earningsLedger.merchantId, id));
    await db.delete(merchantPayoutAccounts).where(eq(merchantPayoutAccounts.merchantId, id));
    
    // Delete tables and reservations
    await db.delete(reservations).where(eq(reservations.merchantId, id));
    await db.delete(tables).where(eq(tables.merchantId, id));
    
    // Finally delete the merchant itself
    await db.delete(merchants).where(eq(merchants.id, id));
  }

  async getMenuCategories(merchantId: string): Promise<MenuCategory[]> {
    return await db.select().from(menuCategories).where(eq(menuCategories.merchantId, merchantId));
  }

  async createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    const [newCategory] = await db.insert(menuCategories).values(category).returning();
    return newCategory;
  }

  async updateMenuCategory(id: string, category: Partial<InsertMenuCategory>): Promise<MenuCategory> {
    const [updated] = await db.update(menuCategories).set(category).where(eq(menuCategories.id, id)).returning();
    return updated;
  }

  async deleteMenuCategory(id: string): Promise<void> {
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  async getMenuItems(merchantId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.merchantId, merchantId));
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  // A menu item with no handle is unreachable on the storefront — its
  // ProductCard link silently falls back to the store's homepage instead of
  // a product page (looks like "clicking it does nothing"). Every create/
  // update resolves through here so a real, unique handle always exists,
  // falling back to the item's name when the merchant didn't type one.
  async resolveMenuItemHandle(merchantId: string, desiredHandle: string | null | undefined, fallbackName: string | null | undefined, ignoreId?: string): Promise<string> {
    const base = slugify(String(desiredHandle || "")) || slugify(String(fallbackName || "")) || "product";
    let candidate = base;
    for (let i = 2; i < 60; i++) {
      const clash = await this.getMenuItemByHandle(merchantId, candidate);
      if (!clash || clash.id === ignoreId) break;
      candidate = `${base}-${i}`;
    }
    return candidate;
  }

  // One-time-per-item healing for products created before every create/update
  // path resolved a handle (see resolveMenuItemHandle) — run at boot so any
  // already-unreachable product self-heals on the next deploy with no manual
  // per-merchant fix needed. Cheap no-op once nothing matches.
  async backfillMissingMenuItemHandles(): Promise<number> {
    const orphans = await db.select().from(menuItems).where(isNull(menuItems.handle));
    for (const item of orphans) {
      const handle = await this.resolveMenuItemHandle(item.merchantId, null, item.name, item.id);
      await db.update(menuItems).set({ handle }).where(eq(menuItems.id, item.id));
    }
    return orphans.length;
  }

  async getMenuItemByHandle(merchantId: string, handle: string): Promise<MenuItem | undefined> {
    const [item] = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.merchantId, merchantId), eq(menuItems.handle, handle)))
      .limit(1);
    if (!item) return item;
    if ((item as any).hasVariants) {
      const variants = await this.listVariants(item.id);
      return { ...item, variants: variants.filter((v) => v.isActive) } as any;
    }
    return item;
  }

  // ---- Product variants (Tier 8) ----

  async listVariants(menuItemId: string): Promise<ProductVariant[]> {
    return db.select().from(productVariants)
      .where(eq(productVariants.menuItemId, menuItemId))
      .orderBy(asc(productVariants.position), asc(productVariants.name));
  }

  async getVariant(id: string): Promise<ProductVariant | undefined> {
    const [v] = await db.select().from(productVariants).where(eq(productVariants.id, id)).limit(1);
    return v;
  }

  /** Replace a menu item's variant set. `variants` may include an `id` to keep a
   *  row (preserving its stock); rows not listed are removed. */
  async setMenuItemVariants(
    menuItemId: string,
    merchantId: string,
    input: { optionNames: string[]; variants: Array<any> },
  ): Promise<ProductVariant[]> {
    const existing = await this.listVariants(menuItemId);
    const keepIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id));
    for (const v of existing) {
      if (!keepIds.has(v.id)) await db.delete(productVariants).where(eq(productVariants.id, v.id));
    }
    for (let i = 0; i < input.variants.length; i++) {
      const v = input.variants[i];
      const row = {
        merchantId,
        menuItemId,
        name: String(v.name || "Variant").slice(0, 255),
        options: v.options ?? null,
        priceCents: Math.max(0, Math.round(Number(v.priceCents) || 0)),
        sku: v.sku || null,
        stockCount: v.stockCount === "" || v.stockCount == null ? null : Math.max(0, Math.floor(Number(v.stockCount))),
        imageUrl: v.imageUrl || null,
        isActive: v.isActive !== false,
        position: i,
        updatedAt: new Date(),
      };
      if (v.id && keepIds.has(v.id)) {
        await db.update(productVariants).set(row).where(eq(productVariants.id, v.id));
      } else {
        await db.insert(productVariants).values(row);
      }
    }
    const hasVariants = input.variants.length > 0;
    await db.update(menuItems).set({
      hasVariants,
      variantOptions: hasVariants ? input.optionNames : null,
      updatedAt: new Date(),
    }).where(eq(menuItems.id, menuItemId));
    return this.listVariants(menuItemId);
  }

  async decrementVariantStock(variantId: string, qty: number): Promise<void> {
    await db.update(productVariants)
      .set({ stockCount: sql`GREATEST(0, COALESCE(${productVariants.stockCount}, 0) - ${qty})`, updatedAt: new Date() })
      .where(and(eq(productVariants.id, variantId), sql`${productVariants.stockCount} IS NOT NULL`));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
  }

  async updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updated] = await db
      .update(menuItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async getTables(merchantId: string): Promise<Table[]> {
    return await db.select().from(tables).where(eq(tables.merchantId, merchantId));
  }

  async getTable(id: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table;
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [newTable] = await db.insert(tables).values(table).returning();
    return newTable;
  }

  async updateTable(id: string, table: Partial<InsertTable>): Promise<Table> {
    const [updatedTable] = await db.update(tables)
      .set({ ...table, updatedAt: new Date() })
      .where(eq(tables.id, id))
      .returning();
    return updatedTable;
  }

  async deleteTable(id: string): Promise<void> {
    await db.delete(tables).where(eq(tables.id, id));
  }

  async getReservations(merchantId: string): Promise<Reservation[]> {
    return await db.select().from(reservations).where(eq(reservations.merchantId, merchantId)).orderBy(desc(reservations.reservationDate));
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const [newReservation] = await db.insert(reservations).values(reservation).returning();
    return newReservation;
  }

  async updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation> {
    const [updated] = await db
      .update(reservations)
      .set({ ...reservation, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async deleteReservation(id: string): Promise<void> {
    await db.delete(reservations).where(eq(reservations.id, id));
  }

  async getOrders(merchantId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.merchantId, merchantId))
      .orderBy(desc(orders.createdAt));
  }

  async getRecentOrders(merchantId: string, limit: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.merchantId, merchantId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getAllOrders(): Promise<Order[]> {
    const results = await db
      .select({
        order: orders,
        merchant: merchants,
      })
      .from(orders)
      .leftJoin(merchants, eq(orders.merchantId, merchants.id))
      .orderBy(desc(orders.createdAt));

    return results.map(result => ({
      ...result.order,
      merchantName: result.merchant?.name || null,
    } as any));
  }

  async getOrder(orderId: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    return order;
  }

  async createOrder(order: InsertOrder, items: Omit<InsertOrderItem, 'orderId'>[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    if (items.length > 0) {
      await db.insert(orderItems).values(
        items.map((item) => ({ ...item, orderId: newOrder.id }))
      );
    }
    
    return newOrder;
  }

  async getOrderWithItems(orderId: string): Promise<{ order: Order; items: (OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[] } | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return undefined;

    const items = await db
      .select()
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(bundlesTable, eq(orderItems.bundleId, bundlesTable.id))
      .where(eq(orderItems.orderId, orderId));

    return {
      order,
      items: items.map(item => ({
        ...item.order_items,
        menuItem: item.menu_items || undefined,
        bundle: item.bundles || undefined,
      }))
    };
  }

  async getAllOrderItems(merchantId: string): Promise<(OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[]> {
    const items = await db
      .select()
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(bundlesTable, eq(orderItems.bundleId, bundlesTable.id))
      .where(eq(orders.merchantId, merchantId));
    
    return items.map(item => ({
      ...item.order_items,
      menuItem: item.menu_items || undefined,
      bundle: item.bundles || undefined,
    }));
  }

  async updateOrderStatus(orderId: string, status: string, tracking?: { trackingNumber?: string | null; shippingCarrier?: string | null }): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
        ...(tracking?.trackingNumber !== undefined ? { trackingNumber: tracking.trackingNumber } : {}),
        ...(tracking?.shippingCarrier !== undefined ? { shippingCarrier: tracking.shippingCarrier } : {}),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  async confirmOrderWithPayment(orderId: string, paymentProvider: string, paymentIntentId: string, totalAmount: number, shippingFee: number = 0): Promise<Order> {
    const currentOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!currentOrder || currentOrder.length === 0) {
      throw new Error("Order not found");
    }

    const order = currentOrder[0];

    // Calculate amounts correctly to avoid double-counting shipping fees
    // totalAmount = subtotal + tax + shippingFee (what customer pays)
    const platformFeeRate = 0.02; // 2% platform fee
    const platformFee = Math.round(totalAmount * platformFeeRate * 100) / 100;

    // Merchant gets: totalAmount - platformFee (fulfillment is shipping/pickup only)
    const merchantShare = Math.round((totalAmount - platformFee) * 100) / 100;

    // Update order with payment tracking data
    const [updated] = await db
      .update(orders)
      .set({
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentProvider,
        platformCaptureStatus: 'captured',
        paymentIntentId,
        merchantShare: merchantShare.toString(),
        platformFee: platformFee.toString(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    // TODO: Create earnings ledger entries
    // This will be implemented fully in task #10 (admin payout management)
    // For now, the payment tracking data is stored in the orders table
    
    return updated;
  }

  async getLastOrderByPrefix(merchantId: string, prefix: string): Promise<Order | undefined> {
    // Only consider order numbers in the exact "PREFIX-NNN" padded format, ordered by
    // the numeric sequence — not by createdAt. A stray non-conforming number (imported
    // data, a manual fix) must not reset the counter and cause duplicates.
    const [lastOrder] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.merchantId, merchantId),
        sql`${orders.orderNumber} ~ ${`^${prefix}-[0-9]{3,}$`}`,
      ))
      .orderBy(sql`length(${orders.orderNumber}) desc, ${orders.orderNumber} desc`)
      .limit(1);

    return lastOrder;
  }

  async getStaff(merchantId: string): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.merchantId, merchantId));
  }

  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffMember).returning();
    return newStaff;
  }

  async updateStaff(id: string, staffData: Partial<InsertStaff>): Promise<Staff> {
    const [updated] = await db
      .update(staff)
      .set({ ...staffData, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updated;
  }

  async deleteStaff(id: string): Promise<void> {
    await db.delete(staff).where(eq(staff.id, id));
  }

  async getInventory(merchantId: string): Promise<Inventory[]> {
    return await db.select().from(inventory).where(eq(inventory.merchantId, merchantId));
  }

  async createInventory(inventoryItem: InsertInventory): Promise<Inventory> {
    const [newInventory] = await db.insert(inventory).values(inventoryItem).returning();
    return newInventory;
  }

  async updateInventory(id: string, inventoryData: Partial<InsertInventory>): Promise<Inventory> {
    const [updated] = await db
      .update(inventory)
      .set({ ...inventoryData, updatedAt: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return updated;
  }

  async deleteInventory(id: string): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  async getPayoutAccount(merchantId: string): Promise<MerchantPayoutAccount | undefined> {
    const [account] = await db
      .select()
      .from(merchantPayoutAccounts)
      .where(eq(merchantPayoutAccounts.merchantId, merchantId));
    return account;
  }

  async createOrUpdatePayoutAccount(merchantId: string, account: Partial<InsertMerchantPayoutAccount>): Promise<MerchantPayoutAccount> {
    // Check if account already exists
    const [existing] = await db
      .select()
      .from(merchantPayoutAccounts)
      .where(eq(merchantPayoutAccounts.merchantId, merchantId));

    if (existing) {
      // Update existing account
      const [updated] = await db
        .update(merchantPayoutAccounts)
        .set({ ...account, updatedAt: new Date() })
        .where(eq(merchantPayoutAccounts.merchantId, merchantId))
        .returning();
      return updated;
    } else {
      // Create new account
      const [newAccount] = await db
        .insert(merchantPayoutAccounts)
        .values({ ...account, merchantId })
        .returning();
      return newAccount;
    }
  }

  async getAllMerchants(): Promise<(Merchant & { owner: Omit<User, 'password'> })[]> {
    const result = await db
      .select()
      .from(merchants)
      .leftJoin(users, eq(merchants.ownerId, users.id));

    return result.map(row => {
      const { password: _password, ...ownerWithoutPassword } = row.users!;
      return {
        // An implicit (unshaped) .select() join groups each row by the
        // table's actual Postgres name, not its TS export name — this stays
        // physically "restaurants" since we kept the DB table name as-is.
        ...row.restaurants,
        owner: ownerWithoutPassword
      };
    });
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getAllUsersForAdmin(): Promise<any[]> {
    // Get all users with their merchant info (if they're owners)
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
        merchantId: merchants.id,
        merchantName: merchants.name,
      })
      .from(users)
      .leftJoin(merchants, eq(users.id, merchants.ownerId));
    
    return allUsers;
  }

  async updateUser(userId: string, data: Partial<UpsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Platform Settings operations
  async getPlatformSettings(): Promise<any[]> {
    const settings = await db
      .select()
      .from(platformSettings)
      .orderBy(asc(platformSettings.category), asc(platformSettings.key));
    return settings;
  }

  async getPlatformSetting(key: string): Promise<any | undefined> {
    const [setting] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key));
    return setting;
  }

  async updatePlatformSetting(key: string, value: string, updatedBy: string): Promise<any> {
    const [updated] = await db
      .update(platformSettings)
      .set({ value, updatedBy, updatedAt: new Date() })
      .where(eq(platformSettings.key, key))
      .returning();
    return updated;
  }

  // Earnings and Payouts operations
  async getEarningsLedger(merchantId: string): Promise<any[]> {
    const ledger = await db
      .select()
      .from(earningsLedger)
      .where(eq(earningsLedger.merchantId, merchantId))
      .orderBy(desc(earningsLedger.createdAt));
    return ledger;
  }

  async getPayoutRuns(merchantId: string): Promise<any[]> {
    const runs = await db
      .select()
      .from(payoutRuns)
      .where(eq(payoutRuns.merchantId, merchantId))
      .orderBy(desc(payoutRuns.createdAt));
    return runs;
  }

  async getPendingEarnings(merchantId: string): Promise<{ total: string; count: number }> {
    const pending = await db
      .select({
        total: sql<string>`COALESCE(SUM(${earningsLedger.merchantShare}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(earningsLedger)
      .where(
        and(
          eq(earningsLedger.merchantId, merchantId),
          eq(earningsLedger.merchantPayoutStatus, 'pending')
        )
      );
    return pending[0] || { total: '0', count: 0 };
  }

  async createPayoutRun(merchantId: string, amount: number, payoutProvider: string, scheduledFor: Date): Promise<any> {
    const [payoutRun] = await db
      .insert(payoutRuns)
      .values({
        merchantId,
        totalAmount: amount.toString(),
        payoutProvider,
        scheduledFor,
        status: 'pending',
      })
      .returning();
    return payoutRun;
  }

  async updatePayoutRunStatus(payoutRunId: string, status: string, payoutTransactionId?: string, failureReason?: string): Promise<any> {
    const updateData: any = { 
      status,
      ...(payoutTransactionId && { payoutTransactionId }),
      ...(failureReason && { failureReason }),
    };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    const [updated] = await db
      .update(payoutRuns)
      .set(updateData)
      .where(eq(payoutRuns.id, payoutRunId))
      .returning();
    return updated;
  }

  async markLedgerEntriesAsPaid(payoutRunId: string, ledgerEntryIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (const ledgerEntryId of ledgerEntryIds) {
        await tx
          .insert(payoutRunLedgerEntries)
          .values({
            payoutRunId,
            ledgerEntryId,
          });
        
        await tx
          .update(earningsLedger)
          .set({
            merchantPayoutStatus: 'paid',
            merchantPaidAt: new Date(),
          })
          .where(eq(earningsLedger.id, ledgerEntryId));
      }
    });
  }

  async completePayoutTransaction(payoutRunId: string, ledgerEntryIds: string[], payoutTransactionId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update payout run status
      await tx
        .update(payoutRuns)
        .set({
          status: 'completed',
          payoutTransactionId,
          completedAt: new Date(),
        })
        .where(eq(payoutRuns.id, payoutRunId));

      // Mark ledger entries as paid and link to payout run
      for (const ledgerEntryId of ledgerEntryIds) {
        await tx
          .insert(payoutRunLedgerEntries)
          .values({
            payoutRunId,
            ledgerEntryId,
          });
        
        await tx
          .update(earningsLedger)
          .set({
            merchantPayoutStatus: 'paid',
            merchantPaidAt: new Date(),
          })
          .where(eq(earningsLedger.id, ledgerEntryId));
      }
    });
  }

  async updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  // Customer Reviews
  async getCustomerReviews(merchantId: string): Promise<CustomerReview[]> {
    const reviews = await db
      .select()
      .from(customerReviews)
      .where(and(
        eq(customerReviews.merchantId, merchantId),
        eq(customerReviews.isPublished, true)
      ))
      .orderBy(desc(customerReviews.createdAt));
    return reviews;
  }

  async getPublishedReviewsByMenuItem(menuItemId: string): Promise<CustomerReview[]> {
    return db
      .select()
      .from(customerReviews)
      .where(and(eq(customerReviews.menuItemId, menuItemId), eq(customerReviews.isPublished, true)))
      .orderBy(desc(customerReviews.createdAt));
  }

  /** All published, product-linked reviews for a merchant — used to compute
   *  per-product rating/count on catalog grids without a query per card. */
  async getPublishedProductReviews(merchantId: string): Promise<CustomerReview[]> {
    return db
      .select()
      .from(customerReviews)
      .where(and(
        eq(customerReviews.merchantId, merchantId),
        eq(customerReviews.isPublished, true),
        isNotNull(customerReviews.menuItemId),
      ));
  }

  async createCustomerReview(review: InsertCustomerReview): Promise<CustomerReview> {
    const [created] = await db
      .insert(customerReviews)
      .values(review)
      .returning();
    return created;
  }

  // ---- Customers & storefront accounts ----

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(eq(customers.id, id));
    return c;
  }

  async findCustomer(
    merchantId: string,
    opts: { email?: string | null; phone?: string | null },
  ): Promise<Customer | undefined> {
    const email = opts.email?.trim().toLowerCase() || null;
    const phone = opts.phone?.trim() || null;
    if (!email && !phone) return undefined;
    const matchers = [];
    if (email) matchers.push(eq(sql`lower(${customers.email})`, email));
    if (phone) matchers.push(eq(customers.phone, phone));
    const [c] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.merchantId, merchantId), or(...matchers)))
      .orderBy(desc(customers.passwordHash), desc(customers.createdAt));
    return c;
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const [created] = await db
      .insert(customers)
      .values({ ...data, email: data.email?.trim().toLowerCase() || null })
      .returning();
    return created;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer> {
    const patch: Record<string, unknown> = { ...updates, updatedAt: new Date() };
    if (typeof updates.email === "string") patch.email = updates.email.trim().toLowerCase();
    const [updated] = await db
      .update(customers)
      .set(patch)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  /**
   * Returns the existing customer matched by email/phone, otherwise creates a
   * lightweight guest row. Returns null only when there's nothing to key on.
   */
  async upsertGuestCustomer(
    merchantId: string,
    data: { name?: string | null; email?: string | null; phone?: string | null; signupSource?: string },
  ): Promise<Customer | null> {
    if (!data.email && !data.phone) return null;
    const existing = await this.findCustomer(merchantId, { email: data.email, phone: data.phone });
    if (existing) {
      // backfill any missing contact detail we just learned
      const patch: Partial<InsertCustomer> = {};
      if (!existing.name && data.name) patch.name = data.name;
      if (!existing.email && data.email) patch.email = data.email;
      if (!existing.phone && data.phone) patch.phone = data.phone;
      return Object.keys(patch).length ? this.updateCustomer(existing.id, patch) : existing;
    }
    return this.createCustomer({
      merchantId,
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      signupSource: data.signupSource || "checkout",
    } as InsertCustomer);
  }

  async recordCustomerOrder(customerId: string, orderTotal: number): Promise<void> {
    const cents = Math.round((Number.isFinite(orderTotal) ? orderTotal : 0) * 100);
    await db
      .update(customers)
      .set({
        ordersCount: sql`${customers.ordersCount} + 1`,
        lifetimeValueCents: sql`${customers.lifetimeValueCents} + ${cents}`,
        lastOrderAt: new Date(),
        firstOrderAt: sql`COALESCE(${customers.firstOrderAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));
  }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }

  async linkOrderToCustomer(orderId: string, customerId: string): Promise<void> {
    await db
      .update(orders)
      .set({ customerId, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }

  async getOrderByNumber(merchantId: string, orderNumber: string): Promise<Order | undefined> {
    const [o] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.merchantId, merchantId), eq(orders.orderNumber, orderNumber.trim().toUpperCase())));
    return o;
  }

  async listCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
    return db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId))
      .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.createdAt));
  }

  async createCustomerAddress(data: InsertCustomerAddress): Promise<CustomerAddress> {
    const existing = await this.listCustomerAddresses(data.customerId);
    const shouldDefault = data.isDefault === true || existing.length === 0;
    const [created] = await db
      .insert(customerAddresses)
      .values({ ...data, isDefault: shouldDefault })
      .returning();
    if (shouldDefault) await this.setDefaultCustomerAddress(created.id, created.customerId);
    return created;
  }

  async updateCustomerAddress(
    id: string,
    customerId: string,
    updates: Partial<InsertCustomerAddress>,
  ): Promise<CustomerAddress | undefined> {
    const [updated] = await db
      .update(customerAddresses)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customerId)))
      .returning();
    if (updated?.isDefault) await this.setDefaultCustomerAddress(id, customerId);
    return updated;
  }

  async deleteCustomerAddress(id: string, customerId: string): Promise<void> {
    await db
      .delete(customerAddresses)
      .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customerId)));
  }

  async setDefaultCustomerAddress(id: string, customerId: string): Promise<void> {
    await db
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(and(eq(customerAddresses.customerId, customerId), sql`${customerAddresses.id} <> ${id}`));
    await db
      .update(customerAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customerId)));
  }

  // ---- Loyalty program config & tiers ----

  async getLoyaltyProgram(merchantId: string): Promise<LoyaltyProgram | undefined> {
    const [p] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.merchantId, merchantId));
    return p;
  }

  async upsertLoyaltyProgram(merchantId: string, patch: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> {
    const existing = await this.getLoyaltyProgram(merchantId);
    if (existing) {
      const [updated] = await db
        .update(loyaltyPrograms)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(loyaltyPrograms.merchantId, merchantId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(loyaltyPrograms)
      .values({ merchantId, ...patch } as any)
      .returning();
    return created;
  }

  async listLoyaltyTiers(merchantId: string): Promise<LoyaltyTier[]> {
    return db
      .select()
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.merchantId, merchantId))
      .orderBy(asc(loyaltyTiers.minPoints));
  }

  async createLoyaltyTier(data: InsertLoyaltyTier): Promise<LoyaltyTier> {
    const [t] = await db.insert(loyaltyTiers).values(data).returning();
    return t;
  }

  async updateLoyaltyTier(id: string, merchantId: string, patch: Partial<InsertLoyaltyTier>): Promise<LoyaltyTier | undefined> {
    const [t] = await db
      .update(loyaltyTiers)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(loyaltyTiers.id, id), eq(loyaltyTiers.merchantId, merchantId)))
      .returning();
    return t;
  }

  async deleteLoyaltyTier(id: string, merchantId: string): Promise<void> {
    await db.delete(loyaltyTiers).where(and(eq(loyaltyTiers.id, id), eq(loyaltyTiers.merchantId, merchantId)));
  }

  // ---- Loyalty accounts & points ledger ----

  async getLoyaltyAccount(merchantId: string, customerId: string): Promise<LoyaltyAccount | undefined> {
    const [a] = await db
      .select()
      .from(loyaltyAccounts)
      .where(and(eq(loyaltyAccounts.merchantId, merchantId), eq(loyaltyAccounts.customerId, customerId)));
    return a;
  }

  private async getOrCreateLoyaltyAccount(merchantId: string, customerId: string): Promise<LoyaltyAccount> {
    const existing = await this.getLoyaltyAccount(merchantId, customerId);
    if (existing) return existing;
    const [created] = await db
      .insert(loyaltyAccounts)
      .values({ merchantId, customerId })
      .returning();
    return created;
  }

  async listLoyaltyTransactions(loyaltyAccountId: string, limit = 50): Promise<LoyaltyTransaction[]> {
    return db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.loyaltyAccountId, loyaltyAccountId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(limit);
  }

  /** Real loyalty stats for the Reports page — replaces order-count-derived fake numbers. */
  async getLoyaltyReportStats(merchantId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    tierDistribution: Array<{ tier: string; members: number }>;
  }> {
    const [totals] = await db
      .select({
        totalMembers: sql<number>`COUNT(*)::int`,
        activeMembers: sql<number>`COUNT(*) FILTER (WHERE ${loyaltyAccounts.pointsBalance} > 0)::int`,
      })
      .from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.merchantId, merchantId));

    const tierRows = await db
      .select({
        tier: sql<string>`COALESCE(${loyaltyTiers.name}, 'Unassigned')`,
        members: sql<number>`COUNT(${loyaltyAccounts.id})::int`,
      })
      .from(loyaltyAccounts)
      .leftJoin(loyaltyTiers, eq(loyaltyAccounts.tierId, loyaltyTiers.id))
      .where(eq(loyaltyAccounts.merchantId, merchantId))
      .groupBy(sql`COALESCE(${loyaltyTiers.name}, 'Unassigned')`);

    return {
      totalMembers: totals?.totalMembers || 0,
      activeMembers: totals?.activeMembers || 0,
      tierDistribution: tierRows,
    };
  }

  /** Move points on an account, write the ledger row, and re-evaluate the tier. */
  private async applyLoyaltyDelta(
    merchantId: string,
    customerId: string,
    points: number,
    type: "earn" | "redeem" | "expire" | "adjustment",
    opts: { orderId?: string | null; description?: string } = {},
  ): Promise<LoyaltyAccount> {
    const account = await this.getOrCreateLoyaltyAccount(merchantId, customerId);
    const before = account.pointsBalance;
    const after = Math.max(0, before + points);
    const lifetime = points > 0 ? account.lifetimePoints + points : account.lifetimePoints;

    // pick the highest tier whose threshold the lifetime points have reached
    const tiers = await this.listLoyaltyTiers(merchantId);
    const activeTiers = tiers.filter((t) => t.isActive);
    const tierId =
      [...activeTiers].reverse().find((t) => lifetime >= t.minPoints)?.id ?? null;

    const [updated] = await db
      .update(loyaltyAccounts)
      .set({ pointsBalance: after, lifetimePoints: lifetime, tierId, updatedAt: new Date() })
      .where(eq(loyaltyAccounts.id, account.id))
      .returning();

    await db.insert(loyaltyTransactions).values({
      merchantId,
      loyaltyAccountId: account.id,
      type,
      points,
      balanceBefore: before,
      balanceAfter: after,
      orderId: opts.orderId ?? null,
      description: opts.description ?? null,
    });

    return updated;
  }

  /** Idempotent: award earn points for a confirmed order. No-op if already awarded or program off. */
  async awardLoyaltyForOrder(orderId: string): Promise<void> {
    const [existing] = await db
      .select({ id: loyaltyTransactions.id })
      .from(loyaltyTransactions)
      .where(and(eq(loyaltyTransactions.orderId, orderId), eq(loyaltyTransactions.type, "earn")))
      .limit(1);
    if (existing) return;

    const order = await this.getOrder(orderId);
    if (!order?.customerId || !order.merchantId) return;
    const program = await this.getLoyaltyProgram(order.merchantId);
    if (!program?.isEnabled) return;

    const base =
      parseFloat(order.subtotal || "0") +
      (program.earnOnDeliveryFee ? parseFloat(order.shippingFee || "0") : 0);
    const points = Math.floor(base * parseFloat(program.pointsPerUnit || "1"));
    if (points <= 0) return;

    await this.applyLoyaltyDelta(order.merchantId, order.customerId, points, "earn", {
      orderId,
      description: `Earned on order ${order.orderNumber}`,
    });
  }

  /** Validate a redemption request and compute the discount. No side effects. */
  async previewLoyaltyRedemption(
    merchantId: string,
    customerId: string,
    points: number,
    maxDiscountCents?: number,
  ): Promise<{ discountCents: number; pointsUsed: number }> {
    const program = await this.getLoyaltyProgram(merchantId);
    if (!program?.isEnabled) throw new Error("Loyalty program is not active");
    const account = await this.getLoyaltyAccount(merchantId, customerId);
    const balance = account?.pointsBalance ?? 0;

    let use = Math.min(Math.floor(points), balance);
    if (use < program.minRedeemPoints) {
      throw new Error(`Redeem at least ${program.minRedeemPoints} points`);
    }
    let discountCents = Math.round(use * parseFloat(program.redeemCentsPerPoint || "1"));
    if (maxDiscountCents != null && discountCents > maxDiscountCents) {
      discountCents = maxDiscountCents;
      use = Math.floor(discountCents / parseFloat(program.redeemCentsPerPoint || "1"));
      discountCents = Math.round(use * parseFloat(program.redeemCentsPerPoint || "1"));
    }
    return { discountCents, pointsUsed: use };
  }

  /** Burn points for a completed redemption, linked to the order. */
  async burnLoyaltyPoints(merchantId: string, customerId: string, points: number, orderId: string): Promise<void> {
    if (points <= 0) return;
    await this.applyLoyaltyDelta(merchantId, customerId, -points, "redeem", {
      orderId,
      description: "Redeemed at checkout",
    });
  }

  async adjustLoyaltyPoints(
    merchantId: string,
    customerId: string,
    points: number,
    reason: string,
  ): Promise<LoyaltyAccount> {
    return this.applyLoyaltyDelta(merchantId, customerId, points, "adjustment", { description: reason });
  }

  async listMerchantCustomers(merchantId: string, search?: string): Promise<any[]> {
    const conds = [eq(customers.merchantId, merchantId)];
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conds.push(
        or(
          sql`lower(${customers.name}) like ${q}`,
          sql`lower(${customers.email}) like ${q}`,
          sql`${customers.phone} like ${q}`,
        )!,
      );
    }
    const rows = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        ordersCount: customers.ordersCount,
        lifetimeValueCents: customers.lifetimeValueCents,
        storeCreditCents: customers.storeCreditCents,
        hasAccount: sql<boolean>`${customers.passwordHash} is not null`,
        lastOrderAt: customers.lastOrderAt,
        createdAt: customers.createdAt,
        pointsBalance: loyaltyAccounts.pointsBalance,
        tierId: loyaltyAccounts.tierId,
      })
      .from(customers)
      .leftJoin(loyaltyAccounts, eq(loyaltyAccounts.customerId, customers.id))
      .where(and(...conds))
      .orderBy(desc(customers.lastOrderAt), desc(customers.createdAt))
      .limit(200);
    return rows;
  }

  // ---- Store credit ----

  async listCreditTransactions(customerId: string, limit = 50): Promise<CustomerCreditTransaction[]> {
    return db
      .select()
      .from(customerCreditTransactions)
      .where(eq(customerCreditTransactions.customerId, customerId))
      .orderBy(desc(customerCreditTransactions.createdAt))
      .limit(limit);
  }

  /** Move store credit and write the ledger row. amountCents signed (+credit / -spend). Returns new balance (cents). */
  async applyStoreCredit(
    merchantId: string,
    customerId: string,
    amountCents: number,
    type: "earn" | "redeem" | "refund" | "adjustment" | "expire",
    opts: { orderId?: string | null; reason?: string; createdBy?: string } = {},
  ): Promise<number> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error("Customer not found");
    const before = customer.storeCreditCents;
    const after = Math.max(0, before + Math.round(amountCents));
    await db
      .update(customers)
      .set({ storeCreditCents: after, updatedAt: new Date() })
      .where(eq(customers.id, customerId));
    await db.insert(customerCreditTransactions).values({
      merchantId,
      customerId,
      type,
      amountCents: after - before,
      balanceAfterCents: after,
      orderId: opts.orderId ?? null,
      reason: opts.reason ?? null,
      createdBy: opts.createdBy ?? null,
    });
    return after;
  }

  // ---- Order operations: drafts, refunds, timeline (Tier 3) ----

  async logOrderEvent(input: {
    orderId: string;
    merchantId?: string | null;
    type: string;
    message: string;
    meta?: any;
    createdBy?: string | null;
    actorType?: "merchant" | "customer" | "driver" | "system";
  }): Promise<void> {
    await db.insert(orderEvents).values({
      orderId: input.orderId,
      merchantId: input.merchantId ?? null,
      type: input.type,
      message: input.message,
      meta: input.meta ?? null,
      createdBy: input.createdBy ?? null,
      actorType: input.actorType ?? "merchant",
    });
  }

  async listOrderEvents(orderId: string): Promise<OrderEvent[]> {
    return db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, orderId))
      .orderBy(desc(orderEvents.createdAt));
  }

  async listOrderRefunds(orderId: string): Promise<OrderRefund[]> {
    return db
      .select()
      .from(orderRefunds)
      .where(eq(orderRefunds.orderId, orderId))
      .orderBy(desc(orderRefunds.createdAt));
  }

  /**
   * Record a refund against an order. Bumps orders.refundedAmount + per-line
   * quantityRefunded, moves paymentStatus, and returns the created refund row.
   * The caller is responsible for moving the actual money (Stripe / store credit)
   * and passing stripeRefundId when relevant.
   */
  async recordOrderRefund(input: {
    orderId: string;
    merchantId: string;
    amount: number;
    reason?: string | null;
    method: "original_payment" | "store_credit" | "manual";
    restock?: boolean;
    items?: Array<{ orderItemId: string; quantity: number }> | null;
    stripeRefundId?: string | null;
    createdBy?: string | null;
  }): Promise<{ refund: OrderRefund; order: Order }> {
    const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Order not found");

    const prevRefunded = parseFloat(order.refundedAmount || "0");
    const total = parseFloat(order.total || "0");
    const newRefunded = Math.round((prevRefunded + input.amount) * 100) / 100;
    if (input.amount <= 0) throw new Error("Refund amount must be greater than 0");
    if (newRefunded > total + 0.001) {
      throw new Error(`Refund exceeds remaining balance ($${(total - prevRefunded).toFixed(2)})`);
    }

    const [refund] = await db
      .insert(orderRefunds)
      .values({
        orderId: input.orderId,
        merchantId: input.merchantId,
        amount: input.amount.toFixed(2),
        reason: input.reason ?? null,
        method: input.method,
        restock: input.restock ?? false,
        items: input.items ?? null,
        stripeRefundId: input.stripeRefundId ?? null,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    for (const line of input.items ?? []) {
      if (!line.quantity) continue;
      await db
        .update(orderItems)
        .set({ quantityRefunded: sql`${orderItems.quantityRefunded} + ${line.quantity}` })
        .where(eq(orderItems.id, line.orderItemId));
    }

    const paymentStatus = newRefunded >= total - 0.001 ? "refunded" : "partially_refunded";
    const [updated] = await db
      .update(orders)
      .set({ refundedAmount: newRefunded.toFixed(2), paymentStatus, updatedAt: new Date() })
      .where(eq(orders.id, input.orderId))
      .returning();

    return { refund, order: updated };
  }

  /** Create a merchant-built draft order (not in the kitchen queue until finalized). */
  async createDraftOrder(
    order: InsertOrder,
    items: Omit<InsertOrderItem, "orderId">[],
  ): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, isDraft: true, status: "draft", paymentStatus: "pending" })
      .returning();
    if (items.length > 0) {
      await db.insert(orderItems).values(items.map((item) => ({ ...item, orderId: newOrder.id })));
    }
    return newOrder;
  }

  /** Replace a draft's line items and money fields. Only valid while isDraft. */
  async updateDraftOrder(
    orderId: string,
    patch: Partial<InsertOrder>,
    items?: Omit<InsertOrderItem, "orderId">[],
  ): Promise<Order> {
    const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing) throw new Error("Order not found");
    if (!existing.isDraft) throw new Error("Only draft orders can be edited");

    const [updated] = await db
      .update(orders)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (items) {
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      if (items.length > 0) {
        await db.insert(orderItems).values(items.map((item) => ({ ...item, orderId })));
      }
    }
    return updated;
  }

  /** Turn a draft into a live order. */
  async finalizeDraftOrder(orderId: string, opts: { markPaid?: boolean; paymentMethod?: string | null }): Promise<Order> {
    const [existing] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing) throw new Error("Order not found");
    if (!existing.isDraft) throw new Error("Order is not a draft");

    const [updated] = await db
      .update(orders)
      .set({
        isDraft: false,
        status: opts.markPaid ? "confirmed" : "pending",
        paymentStatus: opts.markPaid ? "paid" : "pending",
        paymentMethod: opts.paymentMethod ?? existing.paymentMethod ?? "manual",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  async deleteOrder(orderId: string): Promise<void> {
    await db.delete(orders).where(eq(orders.id, orderId));
  }

  // ---- Collections (Tier 5 merchandising) ----

  async listCollections(merchantId: string): Promise<(Collection & { itemCount: number })[]> {
    const rows = await db
      .select({
        collection: collections,
        itemCount: sql<number>`count(${collectionItems.id})::int`,
      })
      .from(collections)
      .leftJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
      .where(eq(collections.merchantId, merchantId))
      .groupBy(collections.id)
      .orderBy(asc(collections.sortOrder), asc(collections.title));
    return rows.map((r) => ({ ...r.collection, itemCount: r.itemCount }));
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const [c] = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
    return c;
  }

  async getCollectionByHandle(merchantId: string, handle: string): Promise<Collection | undefined> {
    const [c] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.merchantId, merchantId), eq(collections.handle, handle.toLowerCase())))
      .limit(1);
    return c;
  }

  private async uniqueCollectionHandle(merchantId: string, base: string, ignoreId?: string): Promise<string> {
    let handle = slugify(base) || "collection";
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? handle : `${handle}-${i + 1}`;
      const existing = await this.getCollectionByHandle(merchantId, candidate);
      if (!existing || existing.id === ignoreId) return candidate;
    }
    return `${handle}-${Date.now().toString(36)}`;
  }

  async createCollection(merchantId: string, data: Partial<Collection>): Promise<Collection> {
    const handle = await this.uniqueCollectionHandle(merchantId, data.handle || data.title || "collection");
    const [created] = await db
      .insert(collections)
      .values({
        merchantId,
        title: (data.title || "Untitled collection").slice(0, 255),
        handle,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        isActive: data.isActive ?? true,
        showOnStorefront: data.showOnStorefront ?? true,
        sortOrder: data.sortOrder ?? 0,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      })
      .returning();
    return created;
  }

  async updateCollection(id: string, merchantId: string, data: Partial<Collection>): Promise<Collection | undefined> {
    const patch: any = { updatedAt: new Date() };
    for (const k of ["title", "description", "imageUrl", "isActive", "showOnStorefront", "sortOrder", "seoTitle", "seoDescription"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (data.handle !== undefined) {
      patch.handle = await this.uniqueCollectionHandle(merchantId, data.handle, id);
    }
    const [updated] = await db
      .update(collections)
      .set(patch)
      .where(and(eq(collections.id, id), eq(collections.merchantId, merchantId)))
      .returning();
    return updated;
  }

  async deleteCollection(id: string, merchantId: string): Promise<void> {
    await db.delete(collections).where(and(eq(collections.id, id), eq(collections.merchantId, merchantId)));
  }

  async listCollectionItems(collectionId: string): Promise<any[]> {
    const rows = await db
      .select({ ci: collectionItems, item: menuItems })
      .from(collectionItems)
      .innerJoin(menuItems, eq(collectionItems.menuItemId, menuItems.id))
      .where(eq(collectionItems.collectionId, collectionId))
      .orderBy(asc(collectionItems.position));
    return rows.map((r) => ({ ...r.item, position: r.ci.position, collectionItemId: r.ci.id }));
  }

  async setCollectionItems(collectionId: string, menuItemIds: string[]): Promise<void> {
    await db.delete(collectionItems).where(eq(collectionItems.collectionId, collectionId));
    if (menuItemIds.length > 0) {
      await db.insert(collectionItems).values(
        menuItemIds.map((menuItemId, i) => ({ collectionId, menuItemId, position: i })),
      );
    }
  }

  // ---- Storefront CMS pages (About, FAQ, Terms, Privacy, Contact copy) ----

  async listStorefrontPages(merchantId: string): Promise<StorefrontPage[]> {
    return await db
      .select()
      .from(storefrontPages)
      .where(eq(storefrontPages.merchantId, merchantId))
      .orderBy(asc(storefrontPages.sortOrder), asc(storefrontPages.title));
  }

  async getStorefrontPage(id: string): Promise<StorefrontPage | undefined> {
    const [p] = await db.select().from(storefrontPages).where(eq(storefrontPages.id, id)).limit(1);
    return p;
  }

  async getStorefrontPageByHandle(merchantId: string, handle: string): Promise<StorefrontPage | undefined> {
    const [p] = await db
      .select()
      .from(storefrontPages)
      .where(and(eq(storefrontPages.merchantId, merchantId), eq(storefrontPages.handle, handle.toLowerCase())))
      .limit(1);
    return p;
  }

  private async uniqueStorefrontPageHandle(merchantId: string, base: string, ignoreId?: string): Promise<string> {
    let handle = slugify(base) || "page";
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? handle : `${handle}-${i + 1}`;
      const existing = await this.getStorefrontPageByHandle(merchantId, candidate);
      if (!existing || existing.id === ignoreId) return candidate;
    }
    return `${handle}-${Date.now().toString(36)}`;
  }

  async createStorefrontPage(merchantId: string, data: Partial<InsertStorefrontPage>): Promise<StorefrontPage> {
    const handle = await this.uniqueStorefrontPageHandle(merchantId, data.handle || data.title || "page");
    const [created] = await db
      .insert(storefrontPages)
      .values({
        merchantId,
        title: (data.title || "Untitled page").slice(0, 255),
        handle,
        body: data.body ?? null,
        isPublished: data.isPublished ?? false,
        showInFooter: data.showInFooter ?? false,
        footerGroup: data.footerGroup ?? null,
        sortOrder: data.sortOrder ?? 0,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      })
      .returning();
    return created;
  }

  async updateStorefrontPage(id: string, merchantId: string, data: Partial<InsertStorefrontPage>): Promise<StorefrontPage | undefined> {
    const patch: any = { updatedAt: new Date() };
    for (const k of ["title", "body", "isPublished", "showInFooter", "footerGroup", "sortOrder", "seoTitle", "seoDescription"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (data.handle !== undefined) {
      patch.handle = await this.uniqueStorefrontPageHandle(merchantId, data.handle, id);
    }
    const [updated] = await db
      .update(storefrontPages)
      .set(patch)
      .where(and(eq(storefrontPages.id, id), eq(storefrontPages.merchantId, merchantId)))
      .returning();
    return updated;
  }

  async deleteStorefrontPage(id: string, merchantId: string): Promise<void> {
    await db.delete(storefrontPages).where(and(eq(storefrontPages.id, id), eq(storefrontPages.merchantId, merchantId)));
  }

  // ---- Storefront CMS — Contact page submissions ----

  async createContactMessage(merchantId: string, data: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db
      .insert(contactMessages)
      .values({
        merchantId,
        name: data.name.slice(0, 255),
        email: data.email.slice(0, 255),
        subject: data.subject ? data.subject.slice(0, 255) : null,
        message: data.message,
      })
      .returning();
    return created;
  }

  async listContactMessages(merchantId: string): Promise<ContactMessage[]> {
    return await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.merchantId, merchantId))
      .orderBy(desc(contactMessages.createdAt));
  }

  async markContactMessageRead(id: string, merchantId: string, isRead: boolean): Promise<ContactMessage | undefined> {
    const [updated] = await db
      .update(contactMessages)
      .set({ isRead })
      .where(and(eq(contactMessages.id, id), eq(contactMessages.merchantId, merchantId)))
      .returning();
    return updated;
  }

  // ---- AI store builder ----

  async createStoreGeneration(merchantId: string, data: { kind: string; brief: any; blueprint: any; copy: any }): Promise<StoreGeneration> {
    const [created] = await db.insert(storeGenerations).values({
      merchantId,
      kind: data.kind,
      brief: data.brief ?? null,
      blueprint: data.blueprint,
      copy: data.copy ?? null,
    }).returning();
    return created;
  }
  async getStoreGeneration(id: string): Promise<StoreGeneration | undefined> {
    const [g] = await db.select().from(storeGenerations).where(eq(storeGenerations.id, id)).limit(1);
    return g;
  }
  async getLatestStoreGeneration(merchantId: string, kind?: string, status?: string): Promise<StoreGeneration | undefined> {
    const conditions = [eq(storeGenerations.merchantId, merchantId)];
    if (kind) conditions.push(eq(storeGenerations.kind, kind));
    if (status) conditions.push(eq(storeGenerations.status, status));
    const [g] = await db.select().from(storeGenerations)
      .where(and(...conditions))
      .orderBy(desc(storeGenerations.createdAt))
      .limit(1);
    return g;
  }
  async markStoreGenerationStatus(id: string, merchantId: string, status: 'applied' | 'discarded'): Promise<StoreGeneration | undefined> {
    const [updated] = await db.update(storeGenerations)
      .set({ status, appliedAt: status === 'applied' ? new Date() : undefined })
      .where(and(eq(storeGenerations.id, id), eq(storeGenerations.merchantId, merchantId)))
      .returning();
    return updated;
  }

  async createNewsletterSubscriber(merchantId: string, email: string): Promise<NewsletterSubscriber> {
    const [existing] = await db.select().from(newsletterSubscribers)
      .where(and(eq(newsletterSubscribers.merchantId, merchantId), eq(newsletterSubscribers.email, email))).limit(1);
    if (existing) return existing;
    const [created] = await db.insert(newsletterSubscribers).values({ merchantId, email }).returning();
    return created;
  }

  // ---- Marketing: segments, campaigns, abandoned carts, boosts (Tier 6) ----

  async listSegments(merchantId: string): Promise<(CustomerSegment & { memberCount: number })[]> {
    const rows = await db
      .select({ seg: customerSegments, memberCount: sql<number>`count(${segmentMembers.id})::int` })
      .from(customerSegments)
      .leftJoin(segmentMembers, eq(segmentMembers.segmentId, customerSegments.id))
      .where(eq(customerSegments.merchantId, merchantId))
      .groupBy(customerSegments.id)
      .orderBy(desc(customerSegments.createdAt));
    return rows.map((r) => ({ ...r.seg, memberCount: r.memberCount }));
  }

  async getSegment(id: string): Promise<CustomerSegment | undefined> {
    const [s] = await db.select().from(customerSegments).where(eq(customerSegments.id, id)).limit(1);
    return s;
  }

  async createSegment(merchantId: string, data: any): Promise<CustomerSegment> {
    const [created] = await db.insert(customerSegments).values({
      merchantId,
      name: String(data.name || "Untitled segment").slice(0, 255),
      description: data.description ?? null,
      rules: data.rules ?? {},
      isActive: data.isActive ?? true,
    }).returning();
    return created;
  }

  async updateSegment(id: string, merchantId: string, data: any): Promise<CustomerSegment | undefined> {
    const patch: any = { updatedAt: new Date() };
    if (data.name !== undefined) patch.name = String(data.name).slice(0, 255);
    if (data.description !== undefined) patch.description = data.description;
    if (data.rules !== undefined) patch.rules = data.rules;
    if (data.isActive !== undefined) patch.isActive = !!data.isActive;
    const [updated] = await db.update(customerSegments).set(patch)
      .where(and(eq(customerSegments.id, id), eq(customerSegments.merchantId, merchantId))).returning();
    return updated;
  }

  async deleteSegment(id: string, merchantId: string): Promise<void> {
    await db.delete(customerSegments).where(and(eq(customerSegments.id, id), eq(customerSegments.merchantId, merchantId)));
  }

  /** Evaluate a segment's rules against the merchant's customers, matching purely
   *  by cached customer fields. Returns the matching customer rows. */
  async evaluateSegmentCustomers(merchantId: string, rules: any): Promise<any[]> {
    const all = await this.listMerchantCustomers(merchantId);
    const now = Date.now();
    const r = rules || {};
    return all.filter((c: any) => {
      if (r.minOrders != null && (c.ordersCount ?? 0) < Number(r.minOrders)) return false;
      if (r.maxOrders != null && (c.ordersCount ?? 0) > Number(r.maxOrders)) return false;
      if (r.minLifetimeCents != null && (c.lifetimeValueCents ?? 0) < Number(r.minLifetimeCents)) return false;
      if (r.hasAccount === true && !c.hasAccount) return false;
      if (r.hasAccount === false && c.hasAccount) return false;
      if (r.hasLoyalty === true && !(c.pointsBalance > 0)) return false;
      const lastOrderMs = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : null;
      if (r.lastOrderWithinDays != null) {
        if (!lastOrderMs || (now - lastOrderMs) > Number(r.lastOrderWithinDays) * 86400000) return false;
      }
      if (r.lastOrderBeforeDays != null) {
        if (lastOrderMs && (now - lastOrderMs) < Number(r.lastOrderBeforeDays) * 86400000) return false;
      }
      return true;
    });
  }

  async recomputeSegment(segmentId: string): Promise<number> {
    const seg = await this.getSegment(segmentId);
    if (!seg) return 0;
    const matches = await this.evaluateSegmentCustomers(seg.merchantId, seg.rules);
    await db.delete(segmentMembers).where(eq(segmentMembers.segmentId, segmentId));
    if (matches.length > 0) {
      await db.insert(segmentMembers).values(
        matches.map((c: any) => ({ merchantId: seg.merchantId, segmentId, customerId: c.id })),
      );
    }
    return matches.length;
  }

  async listSegmentCustomers(segmentId: string): Promise<any[]> {
    const rows = await db
      .select({ c: customers })
      .from(segmentMembers)
      .innerJoin(customers, eq(segmentMembers.customerId, customers.id))
      .where(eq(segmentMembers.segmentId, segmentId));
    return rows.map((x) => x.c);
  }

  // Campaigns
  async listCampaigns(merchantId: string): Promise<any[]> {
    const rows = await db
      .select({
        campaign: campaigns,
        lastRunAt: sql<string>`max(${campaignRuns.completedAt})`,
        totalSent: sql<number>`coalesce(sum(${campaignRuns.sentCount}),0)::int`,
      })
      .from(campaigns)
      .leftJoin(campaignRuns, eq(campaignRuns.campaignId, campaigns.id))
      .where(eq(campaigns.merchantId, merchantId))
      .groupBy(campaigns.id)
      .orderBy(desc(campaigns.createdAt));
    return rows.map((r) => ({ ...r.campaign, lastRunAt: r.lastRunAt, totalSent: r.totalSent }));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return c;
  }

  async createCampaign(merchantId: string, data: any): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values({
      merchantId,
      name: String(data.name || "Untitled campaign").slice(0, 255),
      type: data.type || "custom",
      channel: data.channel || "email",
      subject: data.subject ?? null,
      message: String(data.message || ""),
      segmentId: data.segmentId || null,
      promoRuleId: data.promoRuleId || null,
      triggerRules: data.triggerRules ?? null,
      isActive: data.isActive ?? true,
    }).returning();
    return created;
  }

  async updateCampaign(id: string, merchantId: string, data: any): Promise<Campaign | undefined> {
    const patch: any = { updatedAt: new Date() };
    for (const k of ["name", "type", "channel", "subject", "message", "isActive"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (data.segmentId !== undefined) patch.segmentId = data.segmentId || null;
    if (data.promoRuleId !== undefined) patch.promoRuleId = data.promoRuleId || null;
    if (data.triggerRules !== undefined) patch.triggerRules = data.triggerRules;
    const [updated] = await db.update(campaigns).set(patch)
      .where(and(eq(campaigns.id, id), eq(campaigns.merchantId, merchantId))).returning();
    return updated;
  }

  async deleteCampaign(id: string, merchantId: string): Promise<void> {
    await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.merchantId, merchantId)));
  }

  async listCampaignRuns(campaignId: string): Promise<CampaignRun[]> {
    return db.select().from(campaignRuns).where(eq(campaignRuns.campaignId, campaignId)).orderBy(desc(campaignRuns.createdAt));
  }

  async listCampaignDeliveries(campaignId: string, limit = 100): Promise<CampaignDelivery[]> {
    return db.select().from(campaignDeliveries).where(eq(campaignDeliveries.campaignId, campaignId))
      .orderBy(desc(campaignDeliveries.createdAt)).limit(limit);
  }

  /** Render {{token}} placeholders from a customer + store context. */
  private renderTemplate(tpl: string, ctx: Record<string, string>): string {
    return (tpl || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => ctx[k] ?? "");
  }

  /**
   * Send a campaign to its audience now. Resolves recipients (segment members, or
   * every customer with a contact on the chosen channel), renders the message per
   * recipient and writes a delivery row. Returns the run.
   */
  async sendCampaignNow(campaignId: string, opts: { audienceOverride?: any[]; runType?: string } = {}): Promise<CampaignRun> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    const merchant = await this.getMerchant(campaign.merchantId);
    const storeName = merchant?.name || "our store";

    let audience: any[];
    if (opts.audienceOverride) {
      audience = opts.audienceOverride;
    } else if (campaign.segmentId) {
      const seg = await this.getSegment(campaign.segmentId);
      audience = seg ? await this.evaluateSegmentCustomers(seg.merchantId, seg.rules) : [];
    } else {
      audience = await this.listMerchantCustomers(campaign.merchantId);
    }

    // Only recipients we can actually reach on this channel.
    const contactable = audience.filter((c: any) =>
      campaign.channel === "sms" ? !!c.phone : !!c.email,
    );

    const [run] = await db.insert(campaignRuns).values({
      merchantId: campaign.merchantId,
      campaignId: campaign.id,
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: "running",
      recipientsCount: contactable.length,
    }).returning();

    const { sendEmail, sendSms, sendPush } = await import("./services/messaging");

    let sent = 0;
    let delivered = 0;
    for (const c of contactable) {
      const ctx = {
        firstName: (c.name || "").split(" ")[0] || "there",
        name: c.name || "there",
        storeName,
        email: c.email || "",
      };
      const subject = campaign.subject ? this.renderTemplate(campaign.subject, ctx) : null;
      const body = this.renderTemplate(campaign.message, ctx);
      const toAddress = campaign.channel === "sms" ? c.phone : c.email;

      let result: { status: "sent" | "failed" | "skipped"; error?: string };
      try {
        if (campaign.channel === "sms") {
          result = await sendSms({ to: c.phone, body });
        } else if (campaign.channel === "push") {
          result = c.pushSubscription
            ? await sendPush({ subscription: c.pushSubscription, title: subject || storeName, body, url: `/store/${merchant?.slug || ""}` })
            : { status: "skipped", error: "no push subscription" };
        } else {
          result = await sendEmail({ to: c.email, subject: subject || storeName, body, fromName: storeName });
        }
      } catch (e: any) {
        result = { status: "failed", error: String(e?.message || e) };
      }

      await db.insert(campaignDeliveries).values({
        merchantId: campaign.merchantId,
        campaignId: campaign.id,
        campaignRunId: run.id,
        customerId: c.id,
        channel: campaign.channel,
        toAddress,
        subject,
        body,
        status: result.status,
        error: result.error ?? null,
      });
      // "sent" = handed to the provider; "skipped" still counts as attempted so
      // the run total matches the audience, but only real sends bump delivered.
      if (result.status !== "failed") sent++;
      if (result.status === "sent") delivered++;
    }

    const [updated] = await db.update(campaignRuns).set({
      completedAt: new Date(), sentCount: sent, deliveredCount: delivered, status: "completed",
    }).where(eq(campaignRuns.id, run.id)).returning();
    return updated;
  }

  // Abandoned carts
  async upsertAbandonedCart(input: {
    merchantId: string; sessionId: string; customerId?: string | null;
    customerEmail?: string | null; customerName?: string | null;
    items: any[]; subtotal: number;
  }): Promise<void> {
    const itemCount = input.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    const existing = await db.select().from(abandonedCarts)
      .where(and(eq(abandonedCarts.merchantId, input.merchantId), eq(abandonedCarts.sessionId, input.sessionId))).limit(1);
    if (existing[0]) {
      if (existing[0].status === "recovered") return;
      await db.update(abandonedCarts).set({
        items: input.items, itemCount, subtotal: input.subtotal.toFixed(2),
        customerId: input.customerId ?? existing[0].customerId,
        customerEmail: input.customerEmail ?? existing[0].customerEmail,
        customerName: input.customerName ?? existing[0].customerName,
        status: "open", lastSeenAt: new Date(),
      }).where(eq(abandonedCarts.id, existing[0].id));
    } else {
      await db.insert(abandonedCarts).values({
        merchantId: input.merchantId, sessionId: input.sessionId,
        customerId: input.customerId ?? null, customerEmail: input.customerEmail ?? null,
        customerName: input.customerName ?? null, items: input.items, itemCount,
        subtotal: input.subtotal.toFixed(2), status: "open", lastSeenAt: new Date(),
      });
    }
  }

  async markCartRecovered(merchantId: string, opts: { sessionId?: string | null; customerEmail?: string | null; orderId: string }): Promise<void> {
    const conds = [eq(abandonedCarts.merchantId, merchantId), eq(abandonedCarts.status, "open") as any];
    const or1: any[] = [];
    if (opts.sessionId) or1.push(eq(abandonedCarts.sessionId, opts.sessionId));
    if (opts.customerEmail) or1.push(sql`lower(${abandonedCarts.customerEmail}) = ${opts.customerEmail.toLowerCase()}`);
    if (or1.length === 0) return;
    await db.update(abandonedCarts)
      .set({ status: "recovered", recoveredOrderId: opts.orderId })
      .where(and(...conds, or(...or1)!));
  }

  async listAbandonedCarts(merchantId: string): Promise<AbandonedCart[]> {
    return db.select().from(abandonedCarts)
      .where(eq(abandonedCarts.merchantId, merchantId))
      .orderBy(desc(abandonedCarts.lastSeenAt)).limit(200);
  }

  /** Carts idle long enough to remind, not yet reminded, with an email. */
  async findCartsToRemind(minIdleMinutes = 30, maxIdleHours = 24): Promise<AbandonedCart[]> {
    const now = Date.now();
    return db.select().from(abandonedCarts).where(and(
      eq(abandonedCarts.status, "open"),
      sql`${abandonedCarts.remindedAt} IS NULL`,
      sql`${abandonedCarts.customerEmail} IS NOT NULL`,
      sql`${abandonedCarts.lastSeenAt} < ${new Date(now - minIdleMinutes * 60000)}`,
      sql`${abandonedCarts.lastSeenAt} > ${new Date(now - maxIdleHours * 3600000)}`,
    ));
  }

  async markCartReminded(id: string): Promise<void> {
    await db.update(abandonedCarts).set({ status: "reminded", remindedAt: new Date() }).where(eq(abandonedCarts.id, id));
  }

  async getActiveCampaignByType(merchantId: string, type: string): Promise<Campaign | undefined> {
    const [c] = await db.select().from(campaigns).where(and(
      eq(campaigns.merchantId, merchantId), eq(campaigns.type, type), eq(campaigns.isActive, true),
    )).limit(1);
    return c;
  }

  // ---- Automated campaign triggers (Tier 8) ----

  async listActiveCampaignsByTypes(types: string[]): Promise<Campaign[]> {
    return db.select().from(campaigns).where(and(eq(campaigns.isActive, true), inArray(campaigns.type, types)));
  }

  /** True if this customer already got this campaign within `sinceDays`. Guards
   *  against a trigger re-firing on every cron tick. */
  async hasRecentDelivery(campaignId: string, customerId: string, sinceDays: number): Promise<boolean> {
    const [row] = await db.select({ n: sql<number>`count(*)::int` })
      .from(campaignDeliveries)
      .where(and(
        eq(campaignDeliveries.campaignId, campaignId),
        eq(campaignDeliveries.customerId, customerId),
        sql`${campaignDeliveries.createdAt} > ${new Date(Date.now() - sinceDays * 86400000)}`,
      ));
    return (row?.n ?? 0) > 0;
  }

  async findCustomersWithFirstOrderSince(merchantId: string, hours: number): Promise<any[]> {
    return db.select().from(customers).where(and(
      eq(customers.merchantId, merchantId),
      sql`${customers.firstOrderAt} IS NOT NULL`,
      sql`${customers.firstOrderAt} > ${new Date(Date.now() - hours * 3600000)}`,
      sql`${customers.email} IS NOT NULL`,
    ));
  }

  async findLapsedCustomers(merchantId: string, minDays: number, maxDays: number): Promise<any[]> {
    const now = Date.now();
    return db.select().from(customers).where(and(
      eq(customers.merchantId, merchantId),
      sql`${customers.lastOrderAt} IS NOT NULL`,
      sql`${customers.lastOrderAt} < ${new Date(now - minDays * 86400000)}`,
      sql`${customers.lastOrderAt} > ${new Date(now - maxDays * 86400000)}`,
      sql`${customers.email} IS NOT NULL`,
    ));
  }

  async findBirthdayCustomers(merchantId: string, mmdd: string): Promise<any[]> {
    return db.select().from(customers).where(and(
      eq(customers.merchantId, merchantId),
      eq(customers.birthday, mmdd),
      sql`${customers.email} IS NOT NULL`,
    ));
  }

  async updateCustomerBirthday(customerId: string, mmdd: string | null): Promise<void> {
    await db.update(customers).set({ birthday: mmdd, updatedAt: new Date() }).where(eq(customers.id, customerId));
  }

  // Boosts
  async getBoostState(merchantId: string): Promise<{ credits: BoostCredit; slots: BoostSlot[] }> {
    let [credit] = await db.select().from(boostCredits).where(eq(boostCredits.merchantId, merchantId)).limit(1);
    if (!credit) {
      [credit] = await db.insert(boostCredits).values({ merchantId, creditsBalance: 1, dailyAllowance: 1, lastResetDate: new Date() }).returning();
    } else {
      // Daily top-up to the allowance.
      const last = credit.lastResetDate ? new Date(credit.lastResetDate) : new Date(0);
      const sameDay = last.toDateString() === new Date().toDateString();
      if (!sameDay) {
        [credit] = await db.update(boostCredits).set({
          creditsBalance: Math.max(credit.creditsBalance, credit.dailyAllowance),
          lastResetDate: new Date(), updatedAt: new Date(),
        }).where(eq(boostCredits.id, credit.id)).returning();
      }
    }
    const slots = await db.select().from(boostSlots)
      .where(eq(boostSlots.merchantId, merchantId)).orderBy(desc(boostSlots.startedAt)).limit(50);
    return { credits: credit, slots };
  }

  async createBoostSlot(merchantId: string, input: { slotType: string; hours: number }): Promise<BoostSlot> {
    const { credits } = await this.getBoostState(merchantId);
    if (credits.creditsBalance < 1) throw new Error("No boost credits left today");
    const now = new Date();
    const endsAt = new Date(now.getTime() + Math.min(Math.max(input.hours, 1), 24) * 3600000);
    const [slot] = await db.insert(boostSlots).values({
      merchantId, slotType: input.slotType || "home_featured",
      startedAt: now, endsAt, status: "active", creditsUsed: 1,
    }).returning();
    await db.update(boostCredits).set({ creditsBalance: credits.creditsBalance - 1, updatedAt: new Date() })
      .where(eq(boostCredits.id, credits.id));
    return slot;
  }

  async cancelBoostSlot(id: string, merchantId: string): Promise<void> {
    await db.update(boostSlots).set({ status: "cancelled" })
      .where(and(eq(boostSlots.id, id), eq(boostSlots.merchantId, merchantId)));
  }

  // ---- Gift cards (Tier 4) ----

  async listGiftCards(merchantId: string, search?: string): Promise<GiftCard[]> {
    const conds = [eq(giftCards.merchantId, merchantId)];
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conds.push(
        or(
          sql`lower(${giftCards.code}) like ${q}`,
          sql`lower(${giftCards.recipientEmail}) like ${q}`,
          sql`lower(${giftCards.recipientName}) like ${q}`,
        )!,
      );
    }
    return db.select().from(giftCards).where(and(...conds)).orderBy(desc(giftCards.createdAt)).limit(300);
  }

  async getGiftCardById(id: string): Promise<GiftCard | undefined> {
    const [g] = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
    return g;
  }

  async getGiftCardByCode(merchantId: string, code: string): Promise<GiftCard | undefined> {
    const [g] = await db
      .select()
      .from(giftCards)
      .where(and(eq(giftCards.merchantId, merchantId), sql`upper(${giftCards.code}) = ${code.toUpperCase()}`))
      .limit(1);
    return g;
  }

  async listGiftCardTransactions(giftCardId: string): Promise<GiftCardTransaction[]> {
    return db
      .select()
      .from(giftCardTransactions)
      .where(eq(giftCardTransactions.giftCardId, giftCardId))
      .orderBy(desc(giftCardTransactions.createdAt));
  }

  /** Generate a code unique for this merchant. Format XXXX-XXXX-XXXX (no ambiguous chars). */
  private async generateGiftCardCode(merchantId: string): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const block = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    for (let i = 0; i < 8; i++) {
      const code = `${block()}-${block()}-${block()}`;
      const existing = await this.getGiftCardByCode(merchantId, code);
      if (!existing) return code;
    }
    return `${block()}-${block()}-${block()}-${Date.now().toString(36).toUpperCase()}`;
  }

  async issueGiftCard(input: {
    merchantId: string;
    amount: number;
    currency?: string;
    code?: string;
    recipientName?: string | null;
    recipientEmail?: string | null;
    senderName?: string | null;
    message?: string | null;
    note?: string | null;
    expiresAt?: Date | null;
    purchaserOrderId?: string | null;
    createdBy?: string | null;
  }): Promise<GiftCard> {
    const code = (input.code?.trim().toUpperCase()) || (await this.generateGiftCardCode(input.merchantId));
    const [card] = await db
      .insert(giftCards)
      .values({
        merchantId: input.merchantId,
        code,
        initialBalance: input.amount.toFixed(2),
        balance: input.amount.toFixed(2),
        currency: input.currency || "USD",
        status: "active",
        recipientName: input.recipientName ?? null,
        recipientEmail: input.recipientEmail ?? null,
        senderName: input.senderName ?? null,
        message: input.message ?? null,
        note: input.note ?? null,
        expiresAt: input.expiresAt ?? null,
        purchaserOrderId: input.purchaserOrderId ?? null,
        createdBy: input.createdBy ?? null,
      })
      .returning();
    await db.insert(giftCardTransactions).values({
      giftCardId: card.id,
      merchantId: input.merchantId,
      type: "issue",
      amount: input.amount.toFixed(2),
      balanceAfter: input.amount.toFixed(2),
      note: "Gift card issued",
      createdBy: input.createdBy ?? null,
    });
    return card;
  }

  async setGiftCardStatus(id: string, merchantId: string, status: string): Promise<GiftCard | undefined> {
    const [updated] = await db
      .update(giftCards)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(giftCards.id, id), eq(giftCards.merchantId, merchantId)))
      .returning();
    return updated;
  }

  /** Move a gift card's balance and write the ledger row. `delta` signed. Returns new balance. */
  async applyGiftCardDelta(input: {
    giftCardId: string;
    merchantId: string;
    delta: number;
    type: "redeem" | "refund" | "adjustment";
    orderId?: string | null;
    note?: string | null;
    createdBy?: string | null;
  }): Promise<{ card: GiftCard; balanceAfter: number }> {
    const card = await this.getGiftCardById(input.giftCardId);
    if (!card) throw new Error("Gift card not found");
    const before = parseFloat(card.balance);
    const after = Math.round(Math.max(0, before + input.delta) * 100) / 100;
    const [updated] = await db
      .update(giftCards)
      .set({
        balance: after.toFixed(2),
        status: after === 0 && card.status === "active" ? "redeemed" : card.status,
        updatedAt: new Date(),
      })
      .where(eq(giftCards.id, input.giftCardId))
      .returning();
    await db.insert(giftCardTransactions).values({
      giftCardId: input.giftCardId,
      merchantId: input.merchantId,
      type: input.type,
      amount: (after - before).toFixed(2),
      balanceAfter: after.toFixed(2),
      orderId: input.orderId ?? null,
      note: input.note ?? null,
      createdBy: input.createdBy ?? null,
    });
    return { card: updated, balanceAfter: after };
  }

  // ---- Promo redemption tracking (Tier 4) ----

  async countPromoRedemptions(promoRuleId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(promoRedemptions)
      .where(eq(promoRedemptions.promoRuleId, promoRuleId));
    return row?.n ?? 0;
  }

  async countCustomerPromoRedemptions(promoRuleId: string, customerId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(promoRedemptions)
      .where(and(eq(promoRedemptions.promoRuleId, promoRuleId), eq(promoRedemptions.customerId, customerId)));
    return row?.n ?? 0;
  }

  async recordPromoRedemption(input: {
    merchantId: string;
    promoRuleId: string;
    orderId: string;
    customerId?: string | null;
    discountAmount: number;
  }): Promise<void> {
    await db.insert(promoRedemptions).values({
      merchantId: input.merchantId,
      promoRuleId: input.promoRuleId,
      orderId: input.orderId,
      customerId: input.customerId ?? null,
      discountAmount: input.discountAmount.toFixed(2),
    });
  }

  // Inbox Messages
  async getInboxMessages(merchantId: string): Promise<InboxMessage[]> {
    const messages = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.merchantId, merchantId))
      .orderBy(desc(inboxMessages.createdAt));
    return messages;
  }

  async createInboxMessage(message: InsertInboxMessage): Promise<InboxMessage> {
    const [created] = await db
      .insert(inboxMessages)
      .values(message)
      .returning();
    return created;
  }

  async respondToReview(reviewId: string, response: string): Promise<CustomerReview> {
    const [updated] = await db
      .update(customerReviews)
      .set({
        response,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customerReviews.id, reviewId))
      .returning();
    return updated;
  }

  async respondToMessage(messageId: string, response: string): Promise<InboxMessage> {
    const [updated] = await db
      .update(inboxMessages)
      .set({
        response,
        respondedAt: new Date(),
        status: 'responded',
        updatedAt: new Date(),
      })
      .where(eq(inboxMessages.id, messageId))
      .returning();
    return updated;
  }

  async updateMessageStatus(messageId: string, status: string): Promise<InboxMessage> {
    const [updated] = await db
      .update(inboxMessages)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(inboxMessages.id, messageId))
      .returning();
    return updated;
  }

  // Promo Management
  async getPromos(merchantId: string): Promise<any[]> {
    const promos = await db
      .select()
      .from(promoRules)
      .where(eq(promoRules.merchantId, merchantId))
      .orderBy(desc(promoRules.createdAt));
    return promos;
  }

  async getPromo(id: string): Promise<any | null> {
    const [promo] = await db
      .select()
      .from(promoRules)
      .where(eq(promoRules.id, id));
    return promo || null;
  }

  async createPromo(data: any): Promise<any> {
    const [promo] = await db
      .insert(promoRules)
      .values(data)
      .returning();
    return promo;
  }

  async updatePromo(id: string, data: any): Promise<any> {
    const [updated] = await db
      .update(promoRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promoRules.id, id))
      .returning();
    return updated;
  }

  async deletePromo(id: string): Promise<void> {
    await db.delete(promoRules).where(eq(promoRules.id, id));
  }

  // Market Management
  async getMarkets(merchantId: string): Promise<Market[]> {
    return db
      .select()
      .from(markets)
      .where(eq(markets.merchantId, merchantId))
      .orderBy(desc(markets.createdAt));
  }

  /** Active markets only — this is what the public storefront selector fetches, so
   *  an inactive market never reaches a visitor. */
  async getActiveMarkets(merchantId: string): Promise<Market[]> {
    return db
      .select()
      .from(markets)
      .where(and(eq(markets.merchantId, merchantId), eq(markets.isActive, true)))
      .orderBy(desc(markets.createdAt));
  }

  async getMarket(id: string): Promise<Market | null> {
    const [market] = await db.select().from(markets).where(eq(markets.id, id));
    return market || null;
  }

  async createMarket(data: InsertMarket): Promise<Market> {
    const [market] = await db.insert(markets).values(data).returning();
    return market;
  }

  async updateMarket(id: string, data: Partial<InsertMarket>): Promise<Market> {
    const [updated] = await db
      .update(markets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(markets.id, id))
      .returning();
    return updated;
  }

  async deleteMarket(id: string): Promise<void> {
    await db.delete(markets).where(eq(markets.id, id));
  }

  async getActiveAutoApplyPromos(merchantId: string): Promise<any[]> {
    const now = new Date();
    const promos = await db
      .select()
      .from(promoRules)
      .where(and(
        eq(promoRules.merchantId, merchantId),
        eq(promoRules.isActive, true),
        eq(promoRules.autoApply, true),
        sql`${promoRules.startsAt} <= ${now}`,
        sql`(${promoRules.endsAt} IS NULL OR ${promoRules.endsAt} >= ${now})`
      ))
      .orderBy(desc(promoRules.priority));
    return promos;
  }

  /** Real per-promo redemption/revenue/discount totals for the Reports page. */
  async getPromoPerformance(merchantId: string): Promise<Array<{ code: string | null; name: string; redemptions: number; revenue: string; discount: string }>> {
    const rows = await db
      .select({
        code: promoRules.promoCode,
        name: promoRules.name,
        redemptions: sql<number>`COUNT(${promoRedemptions.id})::int`,
        revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
        discount: sql<string>`COALESCE(SUM(${promoRedemptions.discountAmount}), 0)`,
      })
      .from(promoRedemptions)
      .innerJoin(promoRules, eq(promoRedemptions.promoRuleId, promoRules.id))
      .leftJoin(orders, eq(promoRedemptions.orderId, orders.id))
      .where(eq(promoRedemptions.merchantId, merchantId))
      .groupBy(promoRules.id, promoRules.promoCode, promoRules.name);
    return rows;
  }

  /** Upserts one row per browser tab session; channel/referrer/UTM are set only on
   *  the initial insert so a session is always attributed to its landing channel. */
  async recordStorefrontVisit(merchantId: string, data: {
    sessionId: string;
    visitorId: string;
    channel: string;
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    landingPath?: string | null;
  }): Promise<void> {
    await db
      .insert(storefrontSessions)
      .values({
        merchantId,
        sessionId: data.sessionId,
        visitorId: data.visitorId,
        channel: data.channel,
        referrer: data.referrer ?? null,
        utmSource: data.utmSource ?? null,
        utmMedium: data.utmMedium ?? null,
        utmCampaign: data.utmCampaign ?? null,
        landingPath: data.landingPath ?? null,
      } satisfies InsertStorefrontSession)
      .onConflictDoUpdate({
        target: [storefrontSessions.merchantId, storefrontSessions.sessionId],
        set: {
          lastSeenAt: new Date(),
          pageviews: sql`${storefrontSessions.pageviews} + 1`,
        },
      });
  }

  /** Real sessions-by-channel totals for the Growth page. */
  async getSessionsByChannel(merchantId: string, startDate: Date, endDate?: Date | null): Promise<Array<{ channel: string; sessions: number }>> {
    return db
      .select({
        channel: storefrontSessions.channel,
        sessions: sql<number>`COUNT(*)::int`,
      })
      .from(storefrontSessions)
      .where(and(
        eq(storefrontSessions.merchantId, merchantId),
        gte(storefrontSessions.firstSeenAt, startDate),
        endDate ? lte(storefrontSessions.firstSeenAt, endDate) : sql`true`,
      ))
      .groupBy(storefrontSessions.channel);
  }

  /** Real sessions-per-day totals for the Growth page's trend chart. */
  async getSessionsOverTime(merchantId: string, startDate: Date, endDate?: Date | null): Promise<Array<{ date: string; sessions: number }>> {
    const dateExpr = sql<string>`TO_CHAR(${storefrontSessions.firstSeenAt}, 'YYYY-MM-DD')`;
    return db
      .select({ date: dateExpr, sessions: sql<number>`COUNT(*)::int` })
      .from(storefrontSessions)
      .where(and(
        eq(storefrontSessions.merchantId, merchantId),
        gte(storefrontSessions.firstSeenAt, startDate),
        endDate ? lte(storefrontSessions.firstSeenAt, endDate) : sql`true`,
      ))
      .groupBy(dateExpr)
      .orderBy(dateExpr);
  }

  /** Most recent session's channel for a visitor, used to attribute an order placed
   *  from the same browser. Returns null if no matching session exists. */
  async getLatestSessionForVisitor(merchantId: string, visitorId: string, before: Date): Promise<{ channel: string } | null> {
    const [row] = await db
      .select({ channel: storefrontSessions.channel })
      .from(storefrontSessions)
      .where(and(
        eq(storefrontSessions.merchantId, merchantId),
        eq(storefrontSessions.visitorId, visitorId),
        lte(storefrontSessions.firstSeenAt, before),
      ))
      .orderBy(desc(storefrontSessions.firstSeenAt))
      .limit(1);
    return row ?? null;
  }

  /** Real orders-by-channel totals for the Growth page. Orders with no matching
   *  same-browser session (or predating this feature) fall under 'unattributed'. */
  async getSalesByChannel(merchantId: string, startDate: Date, endDate?: Date | null): Promise<Array<{ channel: string; orders: number; revenue: string }>> {
    return db
      .select({
        channel: sql<string>`COALESCE(${orders.channel}, 'unattributed')`,
        orders: sql<number>`COUNT(*)::int`,
        revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(and(
        eq(orders.merchantId, merchantId),
        gte(orders.createdAt, startDate),
        endDate ? lte(orders.createdAt, endDate) : sql`true`,
      ))
      .groupBy(sql`COALESCE(${orders.channel}, 'unattributed')`);
  }

  async validatePromoCode(merchantId: string, promoCode: string): Promise<any | null> {
    const now = new Date();
    const [promo] = await db
      .select()
      .from(promoRules)
      .where(and(
        eq(promoRules.merchantId, merchantId),
        eq(promoRules.promoCode, promoCode),
        eq(promoRules.isActive, true),
        sql`${promoRules.startsAt} <= ${now}`,
        sql`(${promoRules.endsAt} IS NULL OR ${promoRules.endsAt} >= ${now})`
      ));
    return promo || null;
  }

  // Bundle Management
  async getBundles(merchantId: string): Promise<any[]> {
    const bundles = await db
      .select()
      .from(bundlesTable)
      .where(eq(bundlesTable.merchantId, merchantId))
      .orderBy(desc(bundlesTable.createdAt));
    return bundles;
  }

  async getActiveBundles(merchantId: string): Promise<any[]> {
    const bundles = await db
      .select()
      .from(bundlesTable)
      .where(and(
        eq(bundlesTable.merchantId, merchantId),
        eq(bundlesTable.isActive, true)
      ))
      .orderBy(desc(bundlesTable.sales));
    return bundles;
  }

  async getActiveUpsellRules(merchantId: string): Promise<any[]> {
    const rules = await db
      .select()
      .from(upsellRulesTable)
      .where(and(
        eq(upsellRulesTable.merchantId, merchantId),
        eq(upsellRulesTable.isActive, true)
      ))
      .orderBy(asc(upsellRulesTable.priority));
    return rules;
  }

  async getBundle(id: string): Promise<any | null> {
    const [bundle] = await db
      .select()
      .from(bundlesTable)
      .where(eq(bundlesTable.id, id));
    return bundle || null;
  }

  async createBundle(bundle: any): Promise<any> {
    const [created] = await db
      .insert(bundlesTable)
      .values(bundle)
      .returning();
    return created;
  }

  async updateBundle(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(bundlesTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bundlesTable.id, id))
      .returning();
    return updated;
  }

  async deleteBundle(id: string): Promise<void> {
    await db
      .delete(bundlesTable)
      .where(eq(bundlesTable.id, id));
  }

  // Upsell Rule Management (owner-facing CRUD; getActiveUpsellRules above serves the storefront)
  async getUpsellRules(merchantId: string): Promise<any[]> {
    const rules = await db
      .select()
      .from(upsellRulesTable)
      .where(eq(upsellRulesTable.merchantId, merchantId))
      .orderBy(asc(upsellRulesTable.priority));
    return rules;
  }

  async getUpsellRule(id: string): Promise<any | null> {
    const [rule] = await db
      .select()
      .from(upsellRulesTable)
      .where(eq(upsellRulesTable.id, id));
    return rule || null;
  }

  async createUpsellRule(rule: any): Promise<any> {
    const [created] = await db
      .insert(upsellRulesTable)
      .values(rule)
      .returning();
    return created;
  }

  async updateUpsellRule(id: string, updates: any): Promise<any> {
    const [updated] = await db
      .update(upsellRulesTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(upsellRulesTable.id, id))
      .returning();
    return updated;
  }

  async deleteUpsellRule(id: string): Promise<void> {
    await db
      .delete(upsellRulesTable)
      .where(eq(upsellRulesTable.id, id));
  }

  async incrementBundleSales(id: string, quantity: number = 1): Promise<void> {
    await db
      .update(bundlesTable)
      .set({ sales: sql`${bundlesTable.sales} + ${quantity}` })
      .where(eq(bundlesTable.id, id));
  }

  // Admin Financial Dashboard operations
  async getFinancialSummary(): Promise<{ totalRevenue: string; totalCommissions: string; totalPayouts: string; pendingPayouts: string }> {
    const COMMISSION_RATE = 0.02;

    const [revenueResult] = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(eq(orders.paymentStatus, 'paid'));

    const totalRevenue = parseFloat(revenueResult?.totalRevenue || '0');
    const totalCommissions = (totalRevenue * COMMISSION_RATE).toFixed(2);

    // Sum merchant payout amounts (not platform fee) for paid payouts
    const [payoutsResult] = await db
      .select({
        totalPayouts: sql<string>`COALESCE(SUM(${earningsLedger.merchantShare}), 0)`,
      })
      .from(earningsLedger)
      .where(eq(earningsLedger.merchantPayoutStatus, 'paid'));

    // Sum merchant payout amounts (not platform fee) for pending payouts
    const [pendingResult] = await db
      .select({
        pendingPayouts: sql<string>`COALESCE(SUM(${earningsLedger.merchantShare}), 0)`,
      })
      .from(earningsLedger)
      .where(eq(earningsLedger.merchantPayoutStatus, 'pending'));

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalCommissions,
      totalPayouts: payoutsResult?.totalPayouts || '0',
      pendingPayouts: pendingResult?.pendingPayouts || '0',
    };
  }

  async getMerchantFinancialBreakdown(): Promise<Array<{ merchantId: string; merchantName: string; totalOrders: number; totalRevenue: string; commissionEarned: string; lastPayoutDate: Date | null }>> {
    const COMMISSION_RATE = 0.02;

    const breakdown = await db
      .select({
        merchantId: merchants.id,
        merchantName: merchants.name,
        totalOrders: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(merchants)
      .leftJoin(orders, and(
        eq(orders.merchantId, merchants.id),
        eq(orders.paymentStatus, 'paid')
      ))
      .groupBy(merchants.id, merchants.name);

    const result = await Promise.all(
      breakdown.map(async (item) => {
        const revenue = parseFloat(item.totalRevenue);
        const commission = (revenue * COMMISSION_RATE).toFixed(2);

        const [lastPayout] = await db
          .select({ completedAt: payoutRuns.completedAt })
          .from(payoutRuns)
          .where(and(
            eq(payoutRuns.merchantId, item.merchantId),
            eq(payoutRuns.status, 'completed')
          ))
          .orderBy(desc(payoutRuns.completedAt))
          .limit(1);

        return {
          merchantId: item.merchantId,
          merchantName: item.merchantName,
          totalOrders: item.totalOrders,
          totalRevenue: revenue.toFixed(2),
          commissionEarned: commission,
          lastPayoutDate: lastPayout?.completedAt || null,
        };
      })
    );

    return result;
  }

  async getRecentPayoutRuns(limit: number): Promise<any[]> {
    const runs = await db
      .select({
        id: payoutRuns.id,
        merchantId: payoutRuns.merchantId,
        merchantName: merchants.name,
        totalAmount: payoutRuns.totalAmount,
        status: payoutRuns.status,
        payoutTransactionId: payoutRuns.payoutTransactionId,
        scheduledFor: payoutRuns.scheduledFor,
        completedAt: payoutRuns.completedAt,
        createdAt: payoutRuns.createdAt,
      })
      .from(payoutRuns)
      .leftJoin(merchants, eq(payoutRuns.merchantId, merchants.id))
      .orderBy(desc(payoutRuns.createdAt))
      .limit(limit);

    return runs;
  }

  async getAllPayoutRunsForAdmin(status?: string): Promise<any[]> {
    let query = db
      .select({
        id: payoutRuns.id,
        merchantId: payoutRuns.merchantId,
        merchantName: merchants.name,
        totalAmount: payoutRuns.totalAmount,
        status: payoutRuns.status,
        payoutProvider: payoutRuns.payoutProvider,
        payoutTransactionId: payoutRuns.payoutTransactionId,
        failureReason: payoutRuns.failureReason,
        scheduledFor: payoutRuns.scheduledFor,
        completedAt: payoutRuns.completedAt,
        createdAt: payoutRuns.createdAt,
      })
      .from(payoutRuns)
      .leftJoin(merchants, eq(payoutRuns.merchantId, merchants.id))
      .orderBy(desc(payoutRuns.createdAt));

    if (status) {
      query = query.where(eq(payoutRuns.status, status)) as any;
    }

    return await query;
  }

  async retryFailedPayout(payoutRunId: string): Promise<any> {
    const [updated] = await db
      .update(payoutRuns)
      .set({
        status: 'pending',
        failureReason: null,
        scheduledFor: new Date(),
      })
      .where(eq(payoutRuns.id, payoutRunId))
      .returning();
    return updated;
  }

  async cancelPayoutRun(payoutRunId: string): Promise<any> {
    const [updated] = await db
      .update(payoutRuns)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(eq(payoutRuns.id, payoutRunId))
      .returning();
    return updated;
  }

  async manuallyMarkPayoutAsPaid(payoutRunId: string, transactionId: string): Promise<any> {
    const [updated] = await db
      .update(payoutRuns)
      .set({
        status: 'completed',
        payoutTransactionId: transactionId,
        completedAt: new Date(),
      })
      .where(eq(payoutRuns.id, payoutRunId))
      .returning();
    
    const ledgerEntries = await db
      .select({ ledgerEntryId: payoutRunLedgerEntries.ledgerEntryId })
      .from(payoutRunLedgerEntries)
      .where(eq(payoutRunLedgerEntries.payoutRunId, payoutRunId));

    const ledgerEntryIds = ledgerEntries.map(e => e.ledgerEntryId);
    
    if (ledgerEntryIds.length > 0) {
      await this.markLedgerEntriesAsPaid(payoutRunId, ledgerEntryIds);
    }

    return updated;
  }

  async getAllReviewsForAdmin(status?: string): Promise<any[]> {
    let query = db
      .select({
        id: customerReviews.id,
        merchantId: customerReviews.merchantId,
        merchantName: merchants.name,
        customerId: customerReviews.customerId,
        orderId: customerReviews.orderId,
        customerName: customerReviews.customerName,
        rating: customerReviews.rating,
        comment: customerReviews.comment,
        response: customerReviews.response,
        respondedAt: customerReviews.respondedAt,
        isPublished: customerReviews.isPublished,
        createdAt: customerReviews.createdAt,
      })
      .from(customerReviews)
      .leftJoin(merchants, eq(customerReviews.merchantId, merchants.id))
      .orderBy(desc(customerReviews.createdAt));

    if (status === 'published') {
      query = query.where(eq(customerReviews.isPublished, true)) as any;
    } else if (status === 'hidden') {
      query = query.where(eq(customerReviews.isPublished, false)) as any;
    }

    return await query;
  }

  async updateReviewStatus(reviewId: string, isPublished: boolean): Promise<CustomerReview> {
    const [updated] = await db
      .update(customerReviews)
      .set({ isPublished, updatedAt: new Date() })
      .where(eq(customerReviews.id, reviewId))
      .returning();
    return updated;
  }

  async deleteReview(reviewId: string): Promise<void> {
    await db.delete(customerReviews).where(eq(customerReviews.id, reviewId));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return created;
  }

  async getAllActivityLogs(filters?: { actionCategory?: string; userId?: string; startDate?: string; endDate?: string }): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogs);
    
    const conditions = [];
    
    if (filters?.actionCategory) {
      conditions.push(eq(activityLogs.actionCategory, filters.actionCategory));
    }
    
    if (filters?.userId) {
      conditions.push(eq(activityLogs.userId, filters.userId));
    }
    
    if (filters?.startDate) {
      conditions.push(sql`${activityLogs.createdAt} >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      conditions.push(sql`${activityLogs.createdAt} <= ${filters.endDate}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const logs = await query.orderBy(desc(activityLogs.createdAt));
    return logs;
  }

  // Translation operations
  async getTranslationById(id: string): Promise<TranslationRecord | undefined> {
    const [translation] = await db
      .select()
      .from(translationRecords)
      .where(eq(translationRecords.id, id));
    return translation;
  }

  async getTranslations(merchantId: string, entityType: string, entityId: string, locale?: string): Promise<TranslationRecord[]> {
    const conditions = [
      eq(translationRecords.merchantId, merchantId),
      eq(translationRecords.entityType, entityType),
      eq(translationRecords.entityId, entityId)
    ];
    
    if (locale) {
      conditions.push(eq(translationRecords.locale, locale));
    }
    
    return await db
      .select()
      .from(translationRecords)
      .where(and(...conditions));
  }

  async getTranslationsByLocale(merchantId: string, locale: string): Promise<TranslationRecord[]> {
    return await db
      .select()
      .from(translationRecords)
      .where(
        and(
          eq(translationRecords.merchantId, merchantId),
          eq(translationRecords.locale, locale)
        )
      );
  }

  async createOrUpdateTranslation(
    merchantId: string,
    data: { entityType: string; entityId: string; locale: string; field: string; value: string; lastUpdatedBy?: string }
  ): Promise<TranslationRecord> {
    const [result] = await db
      .insert(translationRecords)
      .values({
        merchantId,
        entityType: data.entityType,
        entityId: data.entityId,
        locale: data.locale,
        field: data.field,
        value: data.value,
        lastUpdatedBy: data.lastUpdatedBy,
        status: 'current',
      })
      .onConflictDoUpdate({
        target: [
          translationRecords.merchantId,
          translationRecords.entityType,
          translationRecords.entityId,
          translationRecords.locale,
          translationRecords.field,
        ],
        set: {
          value: data.value,
          lastUpdatedBy: data.lastUpdatedBy,
          status: 'current',
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async bulkUpsertTranslations(
    merchantId: string,
    translations: Array<{ entityType: string; entityId: string; locale: string; field: string; value: string }>
  ): Promise<void> {
    if (translations.length === 0) return;

    const values = translations.map(t => ({
      merchantId,
      entityType: t.entityType,
      entityId: t.entityId,
      locale: t.locale,
      field: t.field,
      value: t.value,
      status: 'current' as const,
    }));

    await db
      .insert(translationRecords)
      .values(values)
      .onConflictDoUpdate({
        target: [
          translationRecords.merchantId,
          translationRecords.entityType,
          translationRecords.entityId,
          translationRecords.locale,
          translationRecords.field,
        ],
        set: {
          value: sql`EXCLUDED.value`,
          status: 'current',
          updatedAt: new Date(),
        },
      });
  }

  async deleteTranslation(id: string): Promise<void> {
    await db.delete(translationRecords).where(eq(translationRecords.id, id));
  }

  async markTranslationsAsNeedingReview(merchantId: string, entityType: string, entityId: string): Promise<void> {
    await db
      .update(translationRecords)
      .set({
        status: 'needs_review',
        sourceUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(translationRecords.merchantId, merchantId),
          eq(translationRecords.entityType, entityType),
          eq(translationRecords.entityId, entityId)
        )
      );
  }

}

export const storage = new DatabaseStorage();
