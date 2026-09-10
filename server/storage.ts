import {
  users,
  restaurants,
  platformSettings,
  menuCategories,
  menuItems,
  tables,
  reservations,
  orders,
  orderItems,
  orderRefunds,
  orderEvents,
  staff,
  inventory,
  deliveryZones,
  driverProfiles,
  driverDeliveryStatus,
  restaurantPayoutAccounts,
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
  type User,
  type UpsertUser,
  type Restaurant,
  type InsertRestaurant,
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
  type Staff,
  type InsertStaff,
  type Inventory,
  type InsertInventory,
  type DeliveryZone,
  type InsertDeliveryZone,
  type DriverProfile,
  type DriverDeliveryStatus,
  type RestaurantPayoutAccount,
  type InsertRestaurantPayoutAccount,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// A driver can be attached to an order two ways: the merchant assigns one directly
// (orders.assignedDriverId), or a self-serve driver accepts via the delivery link
// (driverDeliveryStatus). List/detail queries must resolve a name from either path.
const assignedDriverProfile = alias(driverProfiles, "assigned_driver_profile");
const assignedDriverUser = alias(users, "assigned_driver_user");

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
  
  // Restaurant operations
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | undefined>;
  getRestaurantBySlug(slug: string): Promise<Restaurant | undefined>;
  getRestaurantBySubdomain(subdomain: string): Promise<Restaurant | undefined>;
  getRestaurantByCustomDomain(customDomain: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, restaurant: Partial<InsertRestaurant>): Promise<Restaurant>;
  deleteRestaurant(id: string): Promise<void>;
  
  // Menu operations
  getMenuCategories(restaurantId: string): Promise<MenuCategory[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(id: string, category: Partial<InsertMenuCategory>): Promise<MenuCategory>;
  deleteMenuCategory(id: string): Promise<void>;
  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: string): Promise<void>;
  
  // Table operations
  getTables(restaurantId: string): Promise<Table[]>;
  getTable(id: string): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: string, table: Partial<InsertTable>): Promise<Table>;
  deleteTable(id: string): Promise<void>;
  
  // Reservation operations
  getReservations(restaurantId: string): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation>;
  deleteReservation(id: string): Promise<void>;
  
  // Order operations
  getOrders(restaurantId: string): Promise<Order[]>;
  getRecentOrders(restaurantId: string, limit: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getOrderWithItems(orderId: string): Promise<{ order: Order; items: (OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[] } | undefined>;
  getAllOrderItems(restaurantId: string): Promise<(OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[]>;
  createOrder(order: InsertOrder, items: Omit<InsertOrderItem, 'orderId'>[]): Promise<Order>;
  updateOrderStatus(orderId: string, status: string): Promise<Order>;
  confirmOrderWithPayment(orderId: string, paymentProvider: string, paymentIntentId: string, totalAmount: number, deliveryFee?: number): Promise<Order>;
  getLastOrderByPrefix(restaurantId: string, prefix: string): Promise<Order | undefined>;
  
  // Staff operations
  getStaff(restaurantId: string): Promise<Staff[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;
  
  // Inventory operations
  getInventory(restaurantId: string): Promise<Inventory[]>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: string, inventory: Partial<InsertInventory>): Promise<Inventory>;
  deleteInventory(id: string): Promise<void>;
  
  // Delivery zone operations
  getDeliveryZones(restaurantId: string): Promise<DeliveryZone[]>;
  createDeliveryZone(zone: InsertDeliveryZone): Promise<DeliveryZone>;
  updateDeliveryZone(id: string, zone: Partial<InsertDeliveryZone>): Promise<DeliveryZone>;
  deleteDeliveryZone(id: string): Promise<void>;
  
  // Payout account operations
  getPayoutAccount(restaurantId: string): Promise<RestaurantPayoutAccount | undefined>;
  createOrUpdatePayoutAccount(restaurantId: string, account: Partial<InsertRestaurantPayoutAccount>): Promise<RestaurantPayoutAccount>;
  
  // Earnings and Payouts operations
  getEarningsLedger(restaurantId: string): Promise<any[]>;
  getPayoutRuns(restaurantId: string): Promise<any[]>;
  getPendingEarnings(restaurantId: string): Promise<{ total: string; count: number }>;
  createPayoutRun(restaurantId: string, amount: number, payoutProvider: string, scheduledFor: Date): Promise<any>;
  updatePayoutRunStatus(payoutRunId: string, status: string, payoutTransactionId?: string, failureReason?: string): Promise<any>;
  markLedgerEntriesAsPaid(payoutRunId: string, ledgerEntryIds: string[]): Promise<void>;
  completePayoutTransaction(payoutRunId: string, ledgerEntryIds: string[], payoutTransactionId: string): Promise<void>;
  
  // Driver operations
  getAllDrivers(): Promise<DriverProfile[]>;
  getDriver(id: string): Promise<DriverProfile | undefined>;
  getDriverByUserId(userId: string): Promise<DriverProfile | undefined>;
  getDriverByAccessToken(token: string): Promise<DriverProfile | undefined>;
  getDriverByEmail(email: string): Promise<DriverProfile | undefined>;
  createDriverApplication(application: Partial<DriverProfile>): Promise<DriverProfile>;
  updateDriverProfile(id: string, data: Partial<DriverProfile>): Promise<DriverProfile>;
  getPendingDriverApplications(): Promise<DriverProfile[]>;
  approveDriverApplication(driverId: string, approvedBy: string): Promise<DriverProfile>;
  rejectDriverApplication(driverId: string, reason: string): Promise<DriverProfile>;
  getDriverOrders(driverId: string): Promise<Order[]>;
  updateOrderDeliveryTracking(orderId: string, data: { pickupTime?: Date; deliveryTime?: Date; driverLocation?: any }): Promise<Order>;
  assignDriverToOrder(orderId: string, driverId: string): Promise<Order>;
  updateDriverAvailability(id: string, isAvailable: boolean): Promise<DriverProfile>;
  getDriverAssignments(): Promise<(Order & { driver?: DriverProfile })[]>;
  getDriverPerformance(): Promise<{ driverId: string; driver: DriverProfile; deliveries: number; earnings: string; rating: string }[]>;
  
  // Driver Delivery operations
  getAvailableDeliveryOrders(driverId?: string): Promise<(Order & { restaurant?: Restaurant; deliveryZone?: any })[]>;
  createDriverDeliveryStatus(data: { orderId: string; driverId: string; restaurantId: string }): Promise<DriverDeliveryStatus>;
  updateDriverDeliveryStatus(orderId: string, data: Partial<DriverDeliveryStatus>): Promise<DriverDeliveryStatus>;
  getDriverDeliveryStatus(orderId: string): Promise<DriverDeliveryStatus | undefined>;
  getDriverActiveDelivery(driverId: string): Promise<(DriverDeliveryStatus & { order: Order; restaurant: Restaurant }) | null>;
  getDriverStats(driverId: string): Promise<{ totalDeliveries: number; totalEarnings: string; weeklyEarnings: string; isAvailable: boolean }>;
  getDriverEarnings(driverId: string): Promise<{ today: string; week: string; month: string; allTime: string; pendingPayouts: string; completedPayouts: string }>;
  updateOrder(orderId: string, data: Partial<Order>): Promise<Order>;
  
  // Admin Driver Monitoring operations
  getActiveDeliveries(): Promise<any[]>;
  getDriverActivityStats(): Promise<{ totalDrivers: number; onlineDrivers: number; approvedDrivers: number; pendingDrivers: number; todaysDeliveries: number; todaysEarnings: string }>;

  
  // Upsell operations
  getActiveUpsellRules(restaurantId: string): Promise<any[]>;
  getUpsellRules(restaurantId: string): Promise<any[]>;
  getUpsellRule(id: string): Promise<any | null>;
  createUpsellRule(rule: any): Promise<any>;
  updateUpsellRule(id: string, updates: any): Promise<any>;
  deleteUpsellRule(id: string): Promise<void>;

  // Admin operations
  getAllRestaurants(): Promise<(Restaurant & { owner: Omit<User, 'password'> })[]>;
  getAllUsers(): Promise<User[]>;
  getAllUsersForAdmin(): Promise<any[]>;
  updateUser(userId: string, data: Partial<UpsertUser>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  updateUserRole(userId: string, role: string): Promise<User>;
  deleteRestaurantCompletely(id: string): Promise<void>;
  
  // Platform Settings operations
  getPlatformSettings(): Promise<any[]>;
  getPlatformSetting(key: string): Promise<any | undefined>;
  updatePlatformSetting(key: string, value: string, updatedBy: string): Promise<any>;
  
  // Admin Financial Dashboard operations
  getFinancialSummary(): Promise<{ totalRevenue: string; totalCommissions: string; totalPayouts: string; pendingPayouts: string }>;
  getRestaurantFinancialBreakdown(): Promise<Array<{ restaurantId: string; restaurantName: string; totalOrders: number; totalRevenue: string; commissionEarned: string; lastPayoutDate: Date | null }>>;
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
  getTranslations(restaurantId: string, entityType: string, entityId: string, locale?: string): Promise<any[]>;
  getTranslationsByLocale(restaurantId: string, locale: string): Promise<any[]>;
  createOrUpdateTranslation(restaurantId: string, data: { entityType: string; entityId: string; locale: string; field: string; value: string; lastUpdatedBy?: string }): Promise<any>;
  bulkUpsertTranslations(restaurantId: string, translations: Array<{ entityType: string; entityId: string; locale: string; field: string; value: string }>): Promise<void>;
  deleteTranslation(id: string): Promise<void>;
  markTranslationsAsNeedingReview(restaurantId: string, entityType: string, entityId: string): Promise<void>;
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

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerId));
    return restaurant;
  }

  async getRestaurantBySlug(slug: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, slug));
    return restaurant;
  }

  async getRestaurantBySubdomain(subdomain: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.subdomain, subdomain));
    return restaurant;
  }

  async getRestaurantByCustomDomain(customDomain: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.customDomain, customDomain));
    return restaurant;
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await db.insert(restaurants).values(restaurant).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: string, restaurant: Partial<InsertRestaurant>): Promise<Restaurant> {
    const [updated] = await db
      .update(restaurants)
      .set({ ...restaurant, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return updated;
  }

  async deleteRestaurant(id: string): Promise<void> {
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  async deleteRestaurantCompletely(id: string): Promise<void> {
    // Delete all associated data in correct order (respecting foreign keys)
    // Delete order items first, then orders
    const restaurantOrders = await db.select().from(orders).where(eq(orders.restaurantId, id));
    const orderIds = restaurantOrders.map(o => o.id);
    
    if (orderIds.length > 0) {
      await db.delete(orderItems).where(sql`${orderItems.orderId} IN ${orderIds}`);
      await db.delete(orders).where(eq(orders.restaurantId, id));
    }
    
    // Delete menu items and categories
    await db.delete(menuItems).where(eq(menuItems.restaurantId, id));
    await db.delete(menuCategories).where(eq(menuCategories.restaurantId, id));
    
    // Delete staff, inventory, delivery zones
    await db.delete(staff).where(eq(staff.restaurantId, id));
    await db.delete(inventory).where(eq(inventory.restaurantId, id));
    await db.delete(deliveryZones).where(eq(deliveryZones.restaurantId, id));
    
    // Delete customer reviews
    await db.delete(customerReviews).where(eq(customerReviews.restaurantId, id));
    
    // Delete inbox messages
    await db.delete(inboxMessages).where(eq(inboxMessages.restaurantId, id));
    
    // Delete promo rules and bundles
    await db.delete(promoRules).where(eq(promoRules.restaurantId, id));
    await db.delete(bundlesTable).where(eq(bundlesTable.restaurantId, id));
    await db.delete(upsellRulesTable).where(eq(upsellRulesTable.restaurantId, id));
    
    // Delete payout-related data
    await db.delete(earningsLedger).where(eq(earningsLedger.restaurantId, id));
    await db.delete(restaurantPayoutAccounts).where(eq(restaurantPayoutAccounts.restaurantId, id));
    
    // Delete tables and reservations
    await db.delete(reservations).where(eq(reservations.restaurantId, id));
    await db.delete(tables).where(eq(tables.restaurantId, id));
    
    // Finally delete the restaurant itself
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  async getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
    return await db.select().from(menuCategories).where(eq(menuCategories.restaurantId, restaurantId));
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

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
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

  async getTables(restaurantId: string): Promise<Table[]> {
    return await db.select().from(tables).where(eq(tables.restaurantId, restaurantId));
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

  async getReservations(restaurantId: string): Promise<Reservation[]> {
    return await db.select().from(reservations).where(eq(reservations.restaurantId, restaurantId)).orderBy(desc(reservations.reservationDate));
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

  async getOrders(restaurantId: string): Promise<Order[]> {
    const results = await db
      .select({
        order: orders,
        deliveryStatus: driverDeliveryStatus,
        driverProfile: driverProfiles,
        driverUser: users,
        assignedProfile: assignedDriverProfile,
        assignedUser: assignedDriverUser,
      })
      .from(orders)
      .leftJoin(driverDeliveryStatus, eq(orders.id, driverDeliveryStatus.orderId))
      .leftJoin(driverProfiles, eq(driverDeliveryStatus.driverId, driverProfiles.id))
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .leftJoin(assignedDriverProfile, eq(orders.assignedDriverId, assignedDriverProfile.id))
      .leftJoin(assignedDriverUser, eq(assignedDriverProfile.userId, assignedDriverUser.id))
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));

    return results.map(result => {
      const profile = result.driverProfile || result.assignedProfile;
      const user = result.driverUser || result.assignedUser;
      return {
        ...result.order,
        driverId: profile?.id || null,
        driverName: user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || null
          : null,
        driverPhone: profile?.phone || null,
        deliveryStatus: result.deliveryStatus?.status || null,
        deliveryUpdatedAt: result.deliveryStatus?.updatedAt || null,
      } as any;
    });
  }

  async getRecentOrders(restaurantId: string, limit: number): Promise<Order[]> {
    const results = await db
      .select({
        order: orders,
        deliveryStatus: driverDeliveryStatus,
        driverProfile: driverProfiles,
        driverUser: users,
      })
      .from(orders)
      .leftJoin(driverDeliveryStatus, eq(orders.id, driverDeliveryStatus.orderId))
      .leftJoin(driverProfiles, eq(driverDeliveryStatus.driverId, driverProfiles.id))
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return results.map(result => ({
      ...result.order,
      driverId: result.driverProfile?.id || null,
      driverName: result.driverUser
        ? `${result.driverUser.firstName || ''} ${result.driverUser.lastName || ''}`.trim()
        : null,
      driverPhone: result.driverProfile?.phone || null,
      deliveryStatus: result.deliveryStatus?.status || null,
      deliveryUpdatedAt: result.deliveryStatus?.updatedAt || null,
    } as any));
  }

  async getAllOrders(): Promise<Order[]> {
    const results = await db
      .select({
        order: orders,
        restaurant: restaurants,
        deliveryStatus: driverDeliveryStatus,
        driverProfile: driverProfiles,
        driverUser: users,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .leftJoin(driverDeliveryStatus, eq(orders.id, driverDeliveryStatus.orderId))
      .leftJoin(driverProfiles, eq(driverDeliveryStatus.driverId, driverProfiles.id))
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .orderBy(desc(orders.createdAt));

    return results.map(result => ({
      ...result.order,
      restaurantName: result.restaurant?.name || null,
      driverId: result.driverProfile?.id || null,
      driverName: result.driverUser
        ? `${result.driverUser.firstName || ''} ${result.driverUser.lastName || ''}`.trim()
        : null,
      driverPhone: result.driverProfile?.phone || null,
      deliveryStatus: result.deliveryStatus?.status || null,
      deliveryUpdatedAt: result.deliveryStatus?.updatedAt || null,
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
    const orderResults = await db
      .select({
        order: orders,
        deliveryStatus: driverDeliveryStatus,
        driverProfile: driverProfiles,
        driverUser: users,
        assignedProfile: assignedDriverProfile,
        assignedUser: assignedDriverUser,
      })
      .from(orders)
      .leftJoin(driverDeliveryStatus, eq(orders.id, driverDeliveryStatus.orderId))
      .leftJoin(driverProfiles, eq(driverDeliveryStatus.driverId, driverProfiles.id))
      .leftJoin(users, eq(driverProfiles.userId, users.id))
      .leftJoin(assignedDriverProfile, eq(orders.assignedDriverId, assignedDriverProfile.id))
      .leftJoin(assignedDriverUser, eq(assignedDriverProfile.userId, assignedDriverUser.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderResults.length === 0) return undefined;

    const result = orderResults[0];
    const dProfile = result.driverProfile || result.assignedProfile;
    const dUser = result.driverUser || result.assignedUser;
    const orderWithDriver = {
      ...result.order,
      driverId: dProfile?.id || null,
      driverName: dUser
        ? `${dUser.firstName || ''} ${dUser.lastName || ''}`.trim() || null
        : null,
      driverPhone: dProfile?.phone || null,
      deliveryStatus: result.deliveryStatus?.status || null,
      deliveryUpdatedAt: result.deliveryStatus?.updatedAt || null,
    };
    
    const items = await db
      .select()
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(bundlesTable, eq(orderItems.bundleId, bundlesTable.id))
      .where(eq(orderItems.orderId, orderId));
    
    return {
      order: orderWithDriver as any,
      items: items.map(item => ({
        ...item.order_items,
        menuItem: item.menu_items || undefined,
        bundle: item.bundles || undefined,
      }))
    };
  }

  async getAllOrderItems(restaurantId: string): Promise<(OrderItem & { menuItem?: MenuItem; bundle?: Bundle })[]> {
    const items = await db
      .select()
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(bundlesTable, eq(orderItems.bundleId, bundlesTable.id))
      .where(eq(orders.restaurantId, restaurantId));
    
    return items.map(item => ({
      ...item.order_items,
      menuItem: item.menu_items || undefined,
      bundle: item.bundles || undefined,
    }));
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  async confirmOrderWithPayment(orderId: string, paymentProvider: string, paymentIntentId: string, totalAmount: number, deliveryFee: number = 0): Promise<Order> {
    const currentOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!currentOrder || currentOrder.length === 0) {
      throw new Error("Order not found");
    }
    
    const order = currentOrder[0];
    
    // Calculate amounts correctly to avoid double-counting delivery fees
    // totalAmount = subtotal + tax + deliveryFee (what customer pays)
    const platformFeeRate = 0.02; // 2% platform fee
    const platformFee = Math.round(totalAmount * platformFeeRate * 100) / 100;
    
    // Driver gets 100% of delivery fee (if delivery order)
    const driverShare = order.orderType === 'delivery' ? deliveryFee : 0;
    
    // Restaurant gets: totalAmount - platformFee - driverShare
    const restaurantShare = Math.round((totalAmount - platformFee - driverShare) * 100) / 100;
    
    // Update order with payment tracking data
    const [updated] = await db
      .update(orders)
      .set({
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentProvider,
        platformCaptureStatus: 'captured',
        paymentIntentId,
        restaurantShare: restaurantShare.toString(),
        driverShare: driverShare.toString(),
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

  async getLastOrderByPrefix(restaurantId: string, prefix: string): Promise<Order | undefined> {
    // Only consider order numbers in the exact "PREFIX-NNN" padded format, ordered by
    // the numeric sequence — not by createdAt. A stray non-conforming number (imported
    // data, a manual fix) must not reset the counter and cause duplicates.
    const [lastOrder] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.restaurantId, restaurantId),
        sql`${orders.orderNumber} ~ ${`^${prefix}-[0-9]{3,}$`}`,
      ))
      .orderBy(sql`length(${orders.orderNumber}) desc, ${orders.orderNumber} desc`)
      .limit(1);

    return lastOrder;
  }

  async getStaff(restaurantId: string): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.restaurantId, restaurantId));
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

  async getInventory(restaurantId: string): Promise<Inventory[]> {
    return await db.select().from(inventory).where(eq(inventory.restaurantId, restaurantId));
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

  async getDeliveryZone(zoneId: string): Promise<DeliveryZone | undefined> {
    const [zone] = await db
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.id, zoneId));
    return zone;
  }

  async getDeliveryZones(restaurantId: string): Promise<DeliveryZone[]> {
    return await db.select().from(deliveryZones).where(eq(deliveryZones.restaurantId, restaurantId));
  }

  async createDeliveryZone(zone: InsertDeliveryZone): Promise<DeliveryZone> {
    const [newZone] = await db.insert(deliveryZones).values(zone).returning();
    return newZone;
  }

  async updateDeliveryZone(id: string, zone: Partial<InsertDeliveryZone>): Promise<DeliveryZone> {
    const [updated] = await db
      .update(deliveryZones)
      .set({ ...zone, updatedAt: new Date() })
      .where(eq(deliveryZones.id, id))
      .returning();
    return updated;
  }

  async deleteDeliveryZone(id: string): Promise<void> {
    await db.delete(deliveryZones).where(eq(deliveryZones.id, id));
  }

  // Find matching delivery zone based on delivery address (city/neighborhood)
  async findMatchingDeliveryZone(restaurantId: string, deliveryCity: string | null, deliveryAddress: string | null): Promise<DeliveryZone | null> {
    if (!deliveryCity && !deliveryAddress) {
      return null;
    }

    const zones = await db
      .select()
      .from(deliveryZones)
      .where(and(
        eq(deliveryZones.restaurantId, restaurantId),
        eq(deliveryZones.isActive, true)
      ));

    if (zones.length === 0) {
      return null;
    }

    // Try to match by city first (case-insensitive)
    if (deliveryCity) {
      const cityMatch = zones.find(zone => 
        zone.city?.toLowerCase() === deliveryCity.toLowerCase()
      );
      if (cityMatch) {
        return cityMatch;
      }
    }

    // Try to match by neighborhood if address contains it
    if (deliveryAddress) {
      const addressLower = deliveryAddress.toLowerCase();
      const neighborhoodMatch = zones.find(zone => 
        zone.neighborhood && addressLower.includes(zone.neighborhood.toLowerCase())
      );
      if (neighborhoodMatch) {
        return neighborhoodMatch;
      }
    }

    // Return first active zone as fallback (if restaurant has zones configured)
    return zones[0] || null;
  }

  // Get all active delivery zones across all restaurants
  async getAllActiveDeliveryZones(): Promise<(DeliveryZone & { restaurantName: string })[]> {
    const result = await db
      .select({
        zone: deliveryZones,
        restaurantName: restaurants.name,
      })
      .from(deliveryZones)
      .innerJoin(restaurants, eq(deliveryZones.restaurantId, restaurants.id))
      .where(eq(deliveryZones.isActive, true));

    return result.map(row => ({
      ...row.zone,
      restaurantName: row.restaurantName,
    }));
  }

  // Update driver's service zones
  async updateDriverServiceZones(driverId: string, zoneIds: string[]): Promise<void> {
    await db
      .update(driverProfiles)
      .set({ serviceZones: zoneIds })
      .where(eq(driverProfiles.id, driverId));
  }

  async getPayoutAccount(restaurantId: string): Promise<RestaurantPayoutAccount | undefined> {
    const [account] = await db
      .select()
      .from(restaurantPayoutAccounts)
      .where(eq(restaurantPayoutAccounts.restaurantId, restaurantId));
    return account;
  }

  async createOrUpdatePayoutAccount(restaurantId: string, account: Partial<InsertRestaurantPayoutAccount>): Promise<RestaurantPayoutAccount> {
    // Check if account already exists
    const [existing] = await db
      .select()
      .from(restaurantPayoutAccounts)
      .where(eq(restaurantPayoutAccounts.restaurantId, restaurantId));

    if (existing) {
      // Update existing account
      const [updated] = await db
        .update(restaurantPayoutAccounts)
        .set({ ...account, updatedAt: new Date() })
        .where(eq(restaurantPayoutAccounts.restaurantId, restaurantId))
        .returning();
      return updated;
    } else {
      // Create new account
      const [newAccount] = await db
        .insert(restaurantPayoutAccounts)
        .values({ ...account, restaurantId })
        .returning();
      return newAccount;
    }
  }

  async getAllRestaurants(): Promise<(Restaurant & { owner: Omit<User, 'password'> })[]> {
    const result = await db
      .select()
      .from(restaurants)
      .leftJoin(users, eq(restaurants.ownerId, users.id));

    return result.map(row => {
      const { password: _password, ...ownerWithoutPassword } = row.users!;
      return {
        ...row.restaurants,
        owner: ownerWithoutPassword
      };
    });
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getAllUsersForAdmin(): Promise<any[]> {
    // Get all users with their restaurant info (if they're owners)
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
      })
      .from(users)
      .leftJoin(restaurants, eq(users.id, restaurants.ownerId));
    
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
  async getEarningsLedger(restaurantId: string): Promise<any[]> {
    const ledger = await db
      .select()
      .from(earningsLedger)
      .where(eq(earningsLedger.restaurantId, restaurantId))
      .orderBy(desc(earningsLedger.createdAt));
    return ledger;
  }

  async getPayoutRuns(restaurantId: string): Promise<any[]> {
    const runs = await db
      .select()
      .from(payoutRuns)
      .where(eq(payoutRuns.restaurantId, restaurantId))
      .orderBy(desc(payoutRuns.createdAt));
    return runs;
  }

  async getPendingEarnings(restaurantId: string): Promise<{ total: string; count: number }> {
    const pending = await db
      .select({
        total: sql<string>`COALESCE(SUM(${earningsLedger.restaurantShare}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(earningsLedger)
      .where(
        and(
          eq(earningsLedger.restaurantId, restaurantId),
          eq(earningsLedger.restaurantPayoutStatus, 'pending')
        )
      );
    return pending[0] || { total: '0', count: 0 };
  }

  async createPayoutRun(restaurantId: string, amount: number, payoutProvider: string, scheduledFor: Date): Promise<any> {
    const [payoutRun] = await db
      .insert(payoutRuns)
      .values({
        restaurantId,
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
            restaurantPayoutStatus: 'paid',
            restaurantPaidAt: new Date(),
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
            restaurantPayoutStatus: 'paid',
            restaurantPaidAt: new Date(),
          })
          .where(eq(earningsLedger.id, ledgerEntryId));
      }
    });
  }

  // Driver operations
  async getAllDrivers(): Promise<DriverProfile[]> {
    const drivers = await db.select().from(driverProfiles).orderBy(driverProfiles.createdAt);
    return drivers;
  }

  // Merchant-scoped: only the drivers that belong to this restaurant
  async getDriversByRestaurantId(restaurantId: string): Promise<DriverProfile[]> {
    const drivers = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.restaurantId, restaurantId))
      .orderBy(driverProfiles.createdAt);
    return drivers;
  }

  async getDriver(id: string): Promise<DriverProfile | undefined> {
    const [driver] = await db.select().from(driverProfiles).where(eq(driverProfiles.id, id));
    return driver;
  }

  async updateDriverAvailability(id: string, isAvailable: boolean): Promise<DriverProfile> {
    const [updated] = await db
      .update(driverProfiles)
      .set({ isAvailable, updatedAt: new Date() })
      .where(eq(driverProfiles.id, id))
      .returning();
    return updated;
  }

  async getDriverAssignments(): Promise<(Order & { driver?: DriverProfile })[]> {
    const assignments = await db
      .select()
      .from(orders)
      .leftJoin(driverProfiles, eq(orders.assignedDriverId, driverProfiles.id))
      .where(and(
        eq(orders.orderType, 'delivery'),
        eq(orders.status, 'confirmed')
      ))
      .orderBy(orders.createdAt);

    return assignments.map(row => ({
      ...row.orders,
      driver: row.driver_profiles || undefined
    }));
  }

  // Merchant-scoped: only this restaurant's own delivery assignments
  async getDriverAssignmentsByRestaurantId(restaurantId: string): Promise<(Order & { driver?: DriverProfile })[]> {
    const assignments = await db
      .select()
      .from(orders)
      .leftJoin(driverProfiles, eq(orders.assignedDriverId, driverProfiles.id))
      .where(and(
        eq(orders.orderType, 'delivery'),
        eq(orders.status, 'confirmed'),
        eq(orders.restaurantId, restaurantId)
      ))
      .orderBy(orders.createdAt);

    return assignments.map(row => ({
      ...row.orders,
      driver: row.driver_profiles || undefined
    }));
  }

  async getDriverPerformance(): Promise<{ driverId: string; driver: DriverProfile; deliveries: number; earnings: string; rating: string }[]> {
    const performance = await db
      .select({
        driverId: driverProfiles.id,
        driver: driverProfiles,
        deliveries: sql<number>`COUNT(DISTINCT ${orders.id})`.as('deliveries'),
        earnings: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('earnings'),
      })
      .from(driverProfiles)
      .leftJoin(orders, eq(driverProfiles.id, orders.assignedDriverId))
      .groupBy(driverProfiles.id)
      .orderBy(sql`COUNT(DISTINCT ${orders.id}) DESC`);
    
    return performance.map(p => ({
      driverId: p.driverId,
      driver: p.driver,
      deliveries: p.deliveries,
      earnings: p.earnings,
      rating: '4.8' // Placeholder - would need a ratings table
    }));
  }

  // Merchant-scoped: only this restaurant's own drivers' performance
  async getDriverPerformanceByRestaurantId(restaurantId: string): Promise<{ driverId: string; driver: DriverProfile; deliveries: number; earnings: string; rating: string }[]> {
    const performance = await db
      .select({
        driverId: driverProfiles.id,
        driver: driverProfiles,
        deliveries: sql<number>`COUNT(DISTINCT ${orders.id})`.as('deliveries'),
        earnings: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('earnings'),
      })
      .from(driverProfiles)
      .leftJoin(orders, eq(driverProfiles.id, orders.assignedDriverId))
      .where(eq(driverProfiles.restaurantId, restaurantId))
      .groupBy(driverProfiles.id)
      .orderBy(sql`COUNT(DISTINCT ${orders.id}) DESC`);

    return performance.map(p => ({
      driverId: p.driverId,
      driver: p.driver,
      deliveries: p.deliveries,
      earnings: p.earnings,
      rating: '4.8' // Placeholder - would need a ratings table
    }));
  }

  async getDriverByUserId(userId: string): Promise<DriverProfile | undefined> {
    const [driver] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, userId));
    return driver;
  }

  async getDriverByAccessToken(token: string): Promise<DriverProfile | undefined> {
    const [driver] = await db.select().from(driverProfiles).where(eq(driverProfiles.accessToken, token));
    return driver;
  }

  async getDriverByEmail(email: string): Promise<DriverProfile | undefined> {
    const [driver] = await db.select().from(driverProfiles).where(eq(driverProfiles.email, email));
    return driver;
  }

  async createDriverApplication(application: Partial<DriverProfile>): Promise<DriverProfile> {
    const [created] = await db
      .insert(driverProfiles)
      .values({
        // Defaults for a not-yet-approved driver; callers (e.g. an owner adding a
        // driver directly) can override any of these by passing them explicitly.
        applicationStatus: 'pending',
        isActive: false,
        isAvailable: false,
        ...application,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning();
    return created;
  }

  async updateDriverProfile(id: string, data: Partial<DriverProfile>): Promise<DriverProfile> {
    const [updated] = await db
      .update(driverProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(driverProfiles.id, id))
      .returning();
    return updated;
  }

  async getPendingDriverApplications(): Promise<DriverProfile[]> {
    const pending = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.applicationStatus, 'pending'))
      .orderBy(driverProfiles.createdAt);
    return pending;
  }

  async approveDriverApplication(driverId: string, approvedBy: string): Promise<DriverProfile> {
    const [approved] = await db
      .update(driverProfiles)
      .set({
        applicationStatus: 'approved',
        approvedAt: new Date(),
        approvedBy,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(driverProfiles.id, driverId))
      .returning();
    return approved;
  }

  async rejectDriverApplication(driverId: string, reason: string): Promise<DriverProfile> {
    const [rejected] = await db
      .update(driverProfiles)
      .set({
        applicationStatus: 'rejected',
        rejectionReason: reason,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(driverProfiles.id, driverId))
      .returning();
    return rejected;
  }

  async getDriverOrders(driverId: string): Promise<Order[]> {
    const driverOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.assignedDriverId, driverId))
      .orderBy(desc(orders.createdAt));
    return driverOrders;
  }

  async updateOrderDeliveryTracking(
    orderId: string,
    data: { pickupTime?: Date; deliveryTime?: Date; driverLocation?: any; status?: string }
  ): Promise<Order> {
    const updateData: any = { updatedAt: new Date() };

    // 'picked_up' / 'delivered' are the statuses the rest of the app (location
    // tracking, earnings/performance analytics) actually filters on — an explicit
    // status always wins; these are just sensible defaults for older callers.
    if (data.pickupTime) {
      updateData.pickupTime = data.pickupTime;
      updateData.status = 'picked_up';
    }

    if (data.deliveryTime) {
      updateData.deliveryTime = data.deliveryTime;
      updateData.status = 'delivered';
    }

    if (data.status) {
      updateData.status = data.status;
    }

    if (data.driverLocation) {
      // Append to location history
      updateData.driverLocationHistory = sql`
        COALESCE(${orders.driverLocationHistory}, '[]'::jsonb) || ${JSON.stringify([data.driverLocation])}::jsonb
      `;
    }

    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  async assignDriverToOrder(orderId: string, driverId: string): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({
        assignedDriverId: driverId,
        driverAcceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  // Driver Delivery operations
  // Each driver belongs to exactly one merchant (driverProfiles.restaurantId) and only ever
  // sees that merchant's own delivery orders — optionally narrowed further by service zone
  // if the merchant has configured delivery zones and the driver has picked zones within them.
  async getAvailableDeliveryOrders(driverId?: string): Promise<(Order & { restaurant?: Restaurant; deliveryZone?: any })[]> {
    const baseConditions = and(
      eq(orders.status, 'confirmed'),
      eq(orders.orderType, 'delivery'),
      sql`${orders.assignedDriverId} IS NULL`,
      eq(orders.paymentStatus, 'paid')
    );

    // If no driver ID provided, return all available orders (for admin view)
    if (!driverId) {
      const availableOrders = await db
        .select()
        .from(orders)
        .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
        .leftJoin(deliveryZones, eq(orders.deliveryZoneId, deliveryZones.id))
        .where(baseConditions)
        .orderBy(desc(orders.createdAt));

      return availableOrders.map(row => ({
        ...row.orders,
        restaurant: row.restaurants || undefined,
        deliveryZone: row.delivery_zones || undefined
      }));
    }

    // Get the driver's merchant and service zones
    const [driver] = await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.id, driverId));

    // A driver not yet linked to a merchant has no orders to see
    if (!driver?.restaurantId) {
      return [];
    }

    const serviceZones = driver.serviceZones || [];
    const restaurantMatch = eq(orders.restaurantId, driver.restaurantId);
    const matchCondition = serviceZones.length > 0
      ? and(restaurantMatch, inArray(orders.deliveryZoneId, serviceZones))
      : restaurantMatch;

    const availableOrders = await db
      .select()
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .leftJoin(deliveryZones, eq(orders.deliveryZoneId, deliveryZones.id))
      .where(and(baseConditions, matchCondition))
      .orderBy(desc(orders.createdAt));

    return availableOrders.map(row => ({
      ...row.orders,
      restaurant: row.restaurants || undefined,
      deliveryZone: row.delivery_zones || undefined
    }));
  }

  async createDriverDeliveryStatus(data: { orderId: string; driverId: string; restaurantId?: string | null }): Promise<DriverDeliveryStatus> {
    const [created] = await db
      .insert(driverDeliveryStatus)
      .values({
        orderId: data.orderId,
        driverId: data.driverId,
        restaurantId: data.restaurantId,
        status: 'assigned',
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning();
    return created;
  }

  async updateDriverDeliveryStatus(orderId: string, data: Partial<DriverDeliveryStatus>): Promise<DriverDeliveryStatus> {
    const [updated] = await db
      .update(driverDeliveryStatus)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(driverDeliveryStatus.orderId, orderId))
      .returning();
    return updated;
  }

  async getDriverDeliveryStatus(orderId: string): Promise<DriverDeliveryStatus | undefined> {
    const [status] = await db
      .select()
      .from(driverDeliveryStatus)
      .where(eq(driverDeliveryStatus.orderId, orderId));
    return status;
  }

  async getDriverActiveDelivery(driverId: string): Promise<(DriverDeliveryStatus & { order: Order; restaurant: Restaurant }) | null> {
    const activeDelivery = await db
      .select()
      .from(driverDeliveryStatus)
      .innerJoin(orders, eq(driverDeliveryStatus.orderId, orders.id))
      .innerJoin(restaurants, eq(driverDeliveryStatus.restaurantId, restaurants.id))
      .where(and(
        eq(driverDeliveryStatus.driverId, driverId),
        sql`${driverDeliveryStatus.status} NOT IN ('delivered', 'cancelled')`
      ))
      .limit(1);
    
    if (activeDelivery.length === 0) {
      return null;
    }
    
    return {
      ...activeDelivery[0].driver_delivery_status,
      order: activeDelivery[0].orders,
      restaurant: activeDelivery[0].restaurants
    };
  }

  async getDriverStats(driverId: string): Promise<{ totalDeliveries: number; totalEarnings: string; weeklyEarnings: string; isAvailable: boolean }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get driver availability status
    const [driver] = await db
      .select({ isAvailable: driverProfiles.isAvailable })
      .from(driverProfiles)
      .where(eq(driverProfiles.id, driverId));
    
    const allTimeStats = await db
      .select({
        totalDeliveries: sql<number>`COUNT(*)`.as('totalDeliveries'),
        totalEarnings: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('totalEarnings'),
      })
      .from(orders)
      .where(and(
        eq(orders.assignedDriverId, driverId),
        eq(orders.status, 'delivered')
      ));
    
    const weeklyStats = await db
      .select({
        weeklyEarnings: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('weeklyEarnings'),
      })
      .from(orders)
      .where(and(
        eq(orders.assignedDriverId, driverId),
        eq(orders.status, 'delivered'),
        sql`${orders.deliveryTime} >= ${sevenDaysAgo}`
      ));
    
    return {
      totalDeliveries: allTimeStats[0]?.totalDeliveries || 0,
      totalEarnings: allTimeStats[0]?.totalEarnings || '0',
      weeklyEarnings: weeklyStats[0]?.weeklyEarnings || '0',
      isAvailable: driver?.isAvailable || false,
    };
  }

  async getDriverEarnings(driverId: string): Promise<{ today: string; week: string; month: string; allTime: string; pendingPayouts: string; completedPayouts: string }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todayEarnings = await db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('total'),
      })
      .from(orders)
      .where(and(
        eq(orders.assignedDriverId, driverId),
        eq(orders.status, 'delivered'),
        sql`${orders.deliveryTime} >= ${startOfToday}`
      ));
    
    const weekEarnings = await db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('total'),
      })
      .from(orders)
      .where(and(
        eq(orders.assignedDriverId, driverId),
        eq(orders.status, 'delivered'),
        sql`${orders.deliveryTime} >= ${startOfWeek}`
      ));
    
    const monthEarnings = await db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('total'),
      })
      .from(orders)
      .where(and(
        eq(orders.assignedDriverId, driverId),
        eq(orders.status, 'delivered'),
        sql`${orders.deliveryTime} >= ${startOfMonth}`
      ));
    
    const allTimeEarnings = await db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('total'),
      })
      .from(orders)
      .where(and(
        eq(orders.assignedDriverId, driverId),
        eq(orders.status, 'delivered')
      ));
    
    return {
      today: todayEarnings[0]?.total || '0',
      week: weekEarnings[0]?.total || '0',
      month: monthEarnings[0]?.total || '0',
      allTime: allTimeEarnings[0]?.total || '0',
      pendingPayouts: '0',
      completedPayouts: '0',
    };
  }

  async updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  // Admin Driver Monitoring
  async getActiveDeliveries(): Promise<any[]> {
    const activeDeliveries = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        driverId: driverProfiles.id,
        driverName: sql<string>`${driverProfiles.firstName} || ' ' || ${driverProfiles.lastName}`.as('driver_name'),
        driverPhone: driverProfiles.phone,
        customerName: orders.customerName,
        customerAddress: orders.deliveryAddress,
        deliveryStatus: driverDeliveryStatus.status,
        orderTotal: orders.total,
        deliveryFee: orders.deliveryFee,
        assignedAt: driverDeliveryStatus.assignedAt,
        lastUpdatedAt: driverDeliveryStatus.updatedAt,
      })
      .from(driverDeliveryStatus)
      .innerJoin(orders, eq(driverDeliveryStatus.orderId, orders.id))
      .innerJoin(restaurants, eq(driverDeliveryStatus.restaurantId, restaurants.id))
      .innerJoin(driverProfiles, eq(driverDeliveryStatus.driverId, driverProfiles.id))
      .where(sql`${driverDeliveryStatus.status} NOT IN ('delivered', 'cancelled')`)
      .orderBy(desc(driverDeliveryStatus.assignedAt));

    return activeDeliveries;
  }

  async getDriverActivityStats(): Promise<{ totalDrivers: number; onlineDrivers: number; approvedDrivers: number; pendingDrivers: number; todaysDeliveries: number; todaysEarnings: string }> {
    // Total drivers
    const totalDriversResult = await db
      .select({ count: sql<number>`COUNT(*)::int`.as('count') })
      .from(driverProfiles);
    
    // Online drivers (available)
    const onlineDriversResult = await db
      .select({ count: sql<number>`COUNT(*)::int`.as('count') })
      .from(driverProfiles)
      .where(eq(driverProfiles.isAvailable, true));
    
    // Approved drivers
    const approvedDriversResult = await db
      .select({ count: sql<number>`COUNT(*)::int`.as('count') })
      .from(driverProfiles)
      .where(eq(driverProfiles.applicationStatus, 'approved'));
    
    // Pending drivers
    const pendingDriversResult = await db
      .select({ count: sql<number>`COUNT(*)::int`.as('count') })
      .from(driverProfiles)
      .where(eq(driverProfiles.applicationStatus, 'pending'));
    
    // Today's deliveries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const todaysDeliveriesResult = await db
      .select({ count: sql<number>`COUNT(*)::int`.as('count') })
      .from(driverDeliveryStatus)
      .where(and(
        eq(driverDeliveryStatus.status, 'delivered'),
        sql`${driverDeliveryStatus.deliveredAt} >= ${startOfToday}`
      ));
    
    // Today's earnings for all drivers
    const todaysEarningsResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.driverShare}), 0)`.as('total'),
      })
      .from(orders)
      .where(and(
        eq(orders.status, 'delivered'),
        sql`${orders.deliveryTime} >= ${startOfToday}`
      ));
    
    return {
      totalDrivers: totalDriversResult[0]?.count || 0,
      onlineDrivers: onlineDriversResult[0]?.count || 0,
      approvedDrivers: approvedDriversResult[0]?.count || 0,
      pendingDrivers: pendingDriversResult[0]?.count || 0,
      todaysDeliveries: todaysDeliveriesResult[0]?.count || 0,
      todaysEarnings: todaysEarningsResult[0]?.total || '0',
    };
  }

  // Customer Reviews
  async getCustomerReviews(restaurantId: string): Promise<CustomerReview[]> {
    const reviews = await db
      .select()
      .from(customerReviews)
      .where(and(
        eq(customerReviews.restaurantId, restaurantId),
        eq(customerReviews.isPublished, true)
      ))
      .orderBy(desc(customerReviews.createdAt));
    return reviews;
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
    restaurantId: string,
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
      .where(and(eq(customers.restaurantId, restaurantId), or(...matchers)))
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
    restaurantId: string,
    data: { name?: string | null; email?: string | null; phone?: string | null; signupSource?: string },
  ): Promise<Customer | null> {
    if (!data.email && !data.phone) return null;
    const existing = await this.findCustomer(restaurantId, { email: data.email, phone: data.phone });
    if (existing) {
      // backfill any missing contact detail we just learned
      const patch: Partial<InsertCustomer> = {};
      if (!existing.name && data.name) patch.name = data.name;
      if (!existing.email && data.email) patch.email = data.email;
      if (!existing.phone && data.phone) patch.phone = data.phone;
      return Object.keys(patch).length ? this.updateCustomer(existing.id, patch) : existing;
    }
    return this.createCustomer({
      restaurantId,
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

  async getOrderByNumber(restaurantId: string, orderNumber: string): Promise<Order | undefined> {
    const [o] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.restaurantId, restaurantId), eq(orders.orderNumber, orderNumber.trim().toUpperCase())));
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

  async getLoyaltyProgram(restaurantId: string): Promise<LoyaltyProgram | undefined> {
    const [p] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.restaurantId, restaurantId));
    return p;
  }

  async upsertLoyaltyProgram(restaurantId: string, patch: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> {
    const existing = await this.getLoyaltyProgram(restaurantId);
    if (existing) {
      const [updated] = await db
        .update(loyaltyPrograms)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(loyaltyPrograms.restaurantId, restaurantId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(loyaltyPrograms)
      .values({ restaurantId, ...patch } as any)
      .returning();
    return created;
  }

  async listLoyaltyTiers(restaurantId: string): Promise<LoyaltyTier[]> {
    return db
      .select()
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.restaurantId, restaurantId))
      .orderBy(asc(loyaltyTiers.minPoints));
  }

  async createLoyaltyTier(data: InsertLoyaltyTier): Promise<LoyaltyTier> {
    const [t] = await db.insert(loyaltyTiers).values(data).returning();
    return t;
  }

  async updateLoyaltyTier(id: string, restaurantId: string, patch: Partial<InsertLoyaltyTier>): Promise<LoyaltyTier | undefined> {
    const [t] = await db
      .update(loyaltyTiers)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(loyaltyTiers.id, id), eq(loyaltyTiers.restaurantId, restaurantId)))
      .returning();
    return t;
  }

  async deleteLoyaltyTier(id: string, restaurantId: string): Promise<void> {
    await db.delete(loyaltyTiers).where(and(eq(loyaltyTiers.id, id), eq(loyaltyTiers.restaurantId, restaurantId)));
  }

  // ---- Loyalty accounts & points ledger ----

  async getLoyaltyAccount(restaurantId: string, customerId: string): Promise<LoyaltyAccount | undefined> {
    const [a] = await db
      .select()
      .from(loyaltyAccounts)
      .where(and(eq(loyaltyAccounts.restaurantId, restaurantId), eq(loyaltyAccounts.customerId, customerId)));
    return a;
  }

  private async getOrCreateLoyaltyAccount(restaurantId: string, customerId: string): Promise<LoyaltyAccount> {
    const existing = await this.getLoyaltyAccount(restaurantId, customerId);
    if (existing) return existing;
    const [created] = await db
      .insert(loyaltyAccounts)
      .values({ restaurantId, customerId })
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

  /** Move points on an account, write the ledger row, and re-evaluate the tier. */
  private async applyLoyaltyDelta(
    restaurantId: string,
    customerId: string,
    points: number,
    type: "earn" | "redeem" | "expire" | "adjustment",
    opts: { orderId?: string | null; description?: string } = {},
  ): Promise<LoyaltyAccount> {
    const account = await this.getOrCreateLoyaltyAccount(restaurantId, customerId);
    const before = account.pointsBalance;
    const after = Math.max(0, before + points);
    const lifetime = points > 0 ? account.lifetimePoints + points : account.lifetimePoints;

    // pick the highest tier whose threshold the lifetime points have reached
    const tiers = await this.listLoyaltyTiers(restaurantId);
    const activeTiers = tiers.filter((t) => t.isActive);
    const tierId =
      [...activeTiers].reverse().find((t) => lifetime >= t.minPoints)?.id ?? null;

    const [updated] = await db
      .update(loyaltyAccounts)
      .set({ pointsBalance: after, lifetimePoints: lifetime, tierId, updatedAt: new Date() })
      .where(eq(loyaltyAccounts.id, account.id))
      .returning();

    await db.insert(loyaltyTransactions).values({
      restaurantId,
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
    if (!order?.customerId || !order.restaurantId) return;
    const program = await this.getLoyaltyProgram(order.restaurantId);
    if (!program?.isEnabled) return;

    const base =
      parseFloat(order.subtotal || "0") +
      (program.earnOnDeliveryFee ? parseFloat(order.deliveryFee || "0") : 0);
    const points = Math.floor(base * parseFloat(program.pointsPerUnit || "1"));
    if (points <= 0) return;

    await this.applyLoyaltyDelta(order.restaurantId, order.customerId, points, "earn", {
      orderId,
      description: `Earned on order ${order.orderNumber}`,
    });
  }

  /** Validate a redemption request and compute the discount. No side effects. */
  async previewLoyaltyRedemption(
    restaurantId: string,
    customerId: string,
    points: number,
    maxDiscountCents?: number,
  ): Promise<{ discountCents: number; pointsUsed: number }> {
    const program = await this.getLoyaltyProgram(restaurantId);
    if (!program?.isEnabled) throw new Error("Loyalty program is not active");
    const account = await this.getLoyaltyAccount(restaurantId, customerId);
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
  async burnLoyaltyPoints(restaurantId: string, customerId: string, points: number, orderId: string): Promise<void> {
    if (points <= 0) return;
    await this.applyLoyaltyDelta(restaurantId, customerId, -points, "redeem", {
      orderId,
      description: "Redeemed at checkout",
    });
  }

  async adjustLoyaltyPoints(
    restaurantId: string,
    customerId: string,
    points: number,
    reason: string,
  ): Promise<LoyaltyAccount> {
    return this.applyLoyaltyDelta(restaurantId, customerId, points, "adjustment", { description: reason });
  }

  async listRestaurantCustomers(restaurantId: string, search?: string): Promise<any[]> {
    const conds = [eq(customers.restaurantId, restaurantId)];
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
    restaurantId: string,
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
      restaurantId,
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
    restaurantId?: string | null;
    type: string;
    message: string;
    meta?: any;
    createdBy?: string | null;
    actorType?: "merchant" | "customer" | "driver" | "system";
  }): Promise<void> {
    await db.insert(orderEvents).values({
      orderId: input.orderId,
      restaurantId: input.restaurantId ?? null,
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
    restaurantId: string;
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
        restaurantId: input.restaurantId,
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

  // Inbox Messages
  async getInboxMessages(restaurantId: string): Promise<InboxMessage[]> {
    const messages = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.restaurantId, restaurantId))
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
  async getPromos(restaurantId: string): Promise<any[]> {
    const promos = await db
      .select()
      .from(promoRules)
      .where(eq(promoRules.restaurantId, restaurantId))
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

  async getActiveAutoApplyPromos(restaurantId: string): Promise<any[]> {
    const now = new Date();
    const promos = await db
      .select()
      .from(promoRules)
      .where(and(
        eq(promoRules.restaurantId, restaurantId),
        eq(promoRules.isActive, true),
        eq(promoRules.autoApply, true),
        sql`${promoRules.startsAt} <= ${now}`,
        sql`(${promoRules.endsAt} IS NULL OR ${promoRules.endsAt} >= ${now})`
      ))
      .orderBy(desc(promoRules.priority));
    return promos;
  }

  async validatePromoCode(restaurantId: string, promoCode: string): Promise<any | null> {
    const now = new Date();
    const [promo] = await db
      .select()
      .from(promoRules)
      .where(and(
        eq(promoRules.restaurantId, restaurantId),
        eq(promoRules.promoCode, promoCode),
        eq(promoRules.isActive, true),
        sql`${promoRules.startsAt} <= ${now}`,
        sql`(${promoRules.endsAt} IS NULL OR ${promoRules.endsAt} >= ${now})`
      ));
    return promo || null;
  }

  // Bundle Management
  async getBundles(restaurantId: string): Promise<any[]> {
    const bundles = await db
      .select()
      .from(bundlesTable)
      .where(eq(bundlesTable.restaurantId, restaurantId))
      .orderBy(desc(bundlesTable.createdAt));
    return bundles;
  }

  async getActiveBundles(restaurantId: string): Promise<any[]> {
    const bundles = await db
      .select()
      .from(bundlesTable)
      .where(and(
        eq(bundlesTable.restaurantId, restaurantId),
        eq(bundlesTable.isActive, true)
      ))
      .orderBy(desc(bundlesTable.sales));
    return bundles;
  }

  async getActiveUpsellRules(restaurantId: string): Promise<any[]> {
    const rules = await db
      .select()
      .from(upsellRulesTable)
      .where(and(
        eq(upsellRulesTable.restaurantId, restaurantId),
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
  async getUpsellRules(restaurantId: string): Promise<any[]> {
    const rules = await db
      .select()
      .from(upsellRulesTable)
      .where(eq(upsellRulesTable.restaurantId, restaurantId))
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

    // Sum restaurant payout amounts (not platform fee) for paid payouts
    const [payoutsResult] = await db
      .select({
        totalPayouts: sql<string>`COALESCE(SUM(${earningsLedger.restaurantShare}), 0)`,
      })
      .from(earningsLedger)
      .where(eq(earningsLedger.restaurantPayoutStatus, 'paid'));

    // Sum restaurant payout amounts (not platform fee) for pending payouts
    const [pendingResult] = await db
      .select({
        pendingPayouts: sql<string>`COALESCE(SUM(${earningsLedger.restaurantShare}), 0)`,
      })
      .from(earningsLedger)
      .where(eq(earningsLedger.restaurantPayoutStatus, 'pending'));

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalCommissions,
      totalPayouts: payoutsResult?.totalPayouts || '0',
      pendingPayouts: pendingResult?.pendingPayouts || '0',
    };
  }

  async getRestaurantFinancialBreakdown(): Promise<Array<{ restaurantId: string; restaurantName: string; totalOrders: number; totalRevenue: string; commissionEarned: string; lastPayoutDate: Date | null }>> {
    const COMMISSION_RATE = 0.02;

    const breakdown = await db
      .select({
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        totalOrders: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
        totalRevenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(restaurants)
      .leftJoin(orders, and(
        eq(orders.restaurantId, restaurants.id),
        eq(orders.paymentStatus, 'paid')
      ))
      .groupBy(restaurants.id, restaurants.name);

    const result = await Promise.all(
      breakdown.map(async (item) => {
        const revenue = parseFloat(item.totalRevenue);
        const commission = (revenue * COMMISSION_RATE).toFixed(2);

        const [lastPayout] = await db
          .select({ completedAt: payoutRuns.completedAt })
          .from(payoutRuns)
          .where(and(
            eq(payoutRuns.restaurantId, item.restaurantId),
            eq(payoutRuns.status, 'completed')
          ))
          .orderBy(desc(payoutRuns.completedAt))
          .limit(1);

        return {
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName,
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
        restaurantId: payoutRuns.restaurantId,
        restaurantName: restaurants.name,
        totalAmount: payoutRuns.totalAmount,
        status: payoutRuns.status,
        payoutTransactionId: payoutRuns.payoutTransactionId,
        scheduledFor: payoutRuns.scheduledFor,
        completedAt: payoutRuns.completedAt,
        createdAt: payoutRuns.createdAt,
      })
      .from(payoutRuns)
      .leftJoin(restaurants, eq(payoutRuns.restaurantId, restaurants.id))
      .orderBy(desc(payoutRuns.createdAt))
      .limit(limit);

    return runs;
  }

  async getAllPayoutRunsForAdmin(status?: string): Promise<any[]> {
    let query = db
      .select({
        id: payoutRuns.id,
        restaurantId: payoutRuns.restaurantId,
        restaurantName: restaurants.name,
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
      .leftJoin(restaurants, eq(payoutRuns.restaurantId, restaurants.id))
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
        restaurantId: customerReviews.restaurantId,
        restaurantName: restaurants.name,
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
      .leftJoin(restaurants, eq(customerReviews.restaurantId, restaurants.id))
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

  async getTranslations(restaurantId: string, entityType: string, entityId: string, locale?: string): Promise<TranslationRecord[]> {
    const conditions = [
      eq(translationRecords.restaurantId, restaurantId),
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

  async getTranslationsByLocale(restaurantId: string, locale: string): Promise<TranslationRecord[]> {
    return await db
      .select()
      .from(translationRecords)
      .where(
        and(
          eq(translationRecords.restaurantId, restaurantId),
          eq(translationRecords.locale, locale)
        )
      );
  }

  async createOrUpdateTranslation(
    restaurantId: string,
    data: { entityType: string; entityId: string; locale: string; field: string; value: string; lastUpdatedBy?: string }
  ): Promise<TranslationRecord> {
    const [result] = await db
      .insert(translationRecords)
      .values({
        restaurantId,
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
          translationRecords.restaurantId,
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
    restaurantId: string,
    translations: Array<{ entityType: string; entityId: string; locale: string; field: string; value: string }>
  ): Promise<void> {
    if (translations.length === 0) return;

    const values = translations.map(t => ({
      restaurantId,
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
          translationRecords.restaurantId,
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

  async markTranslationsAsNeedingReview(restaurantId: string, entityType: string, entityId: string): Promise<void> {
    await db
      .update(translationRecords)
      .set({
        status: 'needs_review',
        sourceUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(translationRecords.restaurantId, restaurantId),
          eq(translationRecords.entityType, entityType),
          eq(translationRecords.entityId, entityId)
        )
      );
  }

  // ==========================================
  // PHASE 3: AUTOMATED DISPATCHING METHODS
  // ==========================================

  async getDispatchPreferences(driverId: string) {
    const { dispatchPreferences } = await import('../shared/schema');
    const prefs = await db
      .select()
      .from(dispatchPreferences)
      .where(eq(dispatchPreferences.driverId, driverId))
      .limit(1);
    return prefs[0] || null;
  }

  async upsertDispatchPreferences(driverId: string, data: any) {
    const { dispatchPreferences } = await import('../shared/schema');
    const existing = await this.getDispatchPreferences(driverId);
    
    if (existing) {
      const [updated] = await db
        .update(dispatchPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dispatchPreferences.driverId, driverId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dispatchPreferences)
        .values({ ...data, driverId })
        .returning();
      return created;
    }
  }

  async getDispatchAssignment(assignmentId: string) {
    const { dispatchAssignments } = await import('../shared/schema');
    const assignments = await db
      .select()
      .from(dispatchAssignments)
      .where(eq(dispatchAssignments.id, assignmentId))
      .limit(1);
    return assignments[0] || null;
  }

  async createDispatchAssignment(data: any) {
    const { dispatchAssignments } = await import('../shared/schema');
    const [assignment] = await db
      .insert(dispatchAssignments)
      .values(data)
      .returning();
    return assignment;
  }

  async getDriverScore(driverId: string) {
    const { driverScores } = await import('../shared/schema');
    const scores = await db
      .select()
      .from(driverScores)
      .where(eq(driverScores.driverId, driverId))
      .limit(1);
    return scores[0] || null;
  }

  async getAllDriverScores() {
    const { driverScores } = await import('../shared/schema');
    return await db.select().from(driverScores);
  }

  async getDispatchQueue(status?: string) {
    const { dispatchQueue } = await import('../shared/schema');
    let query = db.select().from(dispatchQueue).$dynamic();

    if (status) {
      query = query.where(eq(dispatchQueue.status, status));
    }
    
    return await query.orderBy(desc(dispatchQueue.priority), dispatchQueue.createdAt);
  }

  async getDriverAssignmentHistory(driverId: string, limit: number = 20, offset: number = 0) {
    const { dispatchAssignments } = await import('../shared/schema');
    return await db
      .select()
      .from(dispatchAssignments)
      .where(eq(dispatchAssignments.driverId, driverId))
      .orderBy(desc(dispatchAssignments.assignedAt))
      .limit(limit)
      .offset(offset);
  }

  async getDriverPenalties(driverId: string) {
    const { rejectionPenalties } = await import('../shared/schema');
    return await db
      .select()
      .from(rejectionPenalties)
      .where(eq(rejectionPenalties.driverId, driverId))
      .orderBy(desc(rejectionPenalties.createdAt));
  }

  async getDriverLocation(driverId: string) {
    const { driverLocationHistory } = await import('../shared/schema');
    const locations = await db
      .select()
      .from(driverLocationHistory)
      .where(eq(driverLocationHistory.driverId, driverId))
      .orderBy(desc(driverLocationHistory.timestamp))
      .limit(1);
    return locations[0] || null;
  }

  async getRouteOptimizationHistory(driverId: string, limit: number = 50) {
    const { routeOptimizationHistory } = await import('../shared/schema');
    return await db
      .select()
      .from(routeOptimizationHistory)
      .where(eq(routeOptimizationHistory.driverId, driverId))
      .orderBy(desc(routeOptimizationHistory.createdAt))
      .limit(limit);
  }

  async getDriverCapabilities(driverId: string) {
    const { driverCapabilities } = await import('../shared/schema');
    const [capabilities] = await db
      .select()
      .from(driverCapabilities)
      .where(eq(driverCapabilities.driverId, driverId))
      .limit(1);
    return capabilities || null;
  }

  async upsertDriverCapabilities(driverId: string, data: Partial<typeof import('../shared/schema').driverCapabilities.$inferInsert>) {
    const { driverCapabilities } = await import('../shared/schema');
    const [capabilities] = await db
      .insert(driverCapabilities)
      .values({ ...data, driverId })
      .onConflictDoUpdate({
        target: driverCapabilities.driverId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return capabilities;
  }

  // ==========================================
  // PHASE 4: BATCH DELIVERY METHODS
  // ==========================================

  async getBatchById(batchId: string) {
    const { deliveryBatches } = await import('../shared/schema');
    const batches = await db
      .select()
      .from(deliveryBatches)
      .where(eq(deliveryBatches.id, batchId))
      .limit(1);
    return batches[0] || null;
  }

  async getBatchStops(batchId: string) {
    const { batchStops } = await import('../shared/schema');
    return await db
      .select()
      .from(batchStops)
      .where(eq(batchStops.batchId, batchId))
      .orderBy(batchStops.stopNumber);
  }

  async getBatchModifications(batchId: string) {
    const { batchModifications } = await import('../shared/schema');
    return await db
      .select()
      .from(batchModifications)
      .where(eq(batchModifications.batchId, batchId))
      .orderBy(desc(batchModifications.createdAt));
  }

  async getBatchPerformance(batchId: string) {
    const { batchPerformance } = await import('../shared/schema');
    const performance = await db
      .select()
      .from(batchPerformance)
      .where(eq(batchPerformance.batchId, batchId))
      .limit(1);
    return performance[0] || null;
  }

  async getBatchPerformanceList(driverId?: string, limit: number = 50) {
    const { batchPerformance } = await import('../shared/schema');
    let query = db.select().from(batchPerformance).$dynamic();

    if (driverId) {
      query = query.where(eq(batchPerformance.driverId, driverId));
    }
    
    return await query.orderBy(desc(batchPerformance.completedAt)).limit(limit);
  }

  // ==========================================
  // PHASE 5: ANALYTICS & GOALS METHODS
  // ==========================================

  async getDriverGoals(driverId: string) {
    const { driverGoals } = await import('../shared/schema');
    return await db
      .select()
      .from(driverGoals)
      .where(eq(driverGoals.driverId, driverId))
      .orderBy(desc(driverGoals.createdAt));
  }

  async createDriverGoal(data: any) {
    const { driverGoals } = await import('../shared/schema');
    const [goal] = await db.insert(driverGoals).values(data).returning();
    return goal;
  }

  async updateDriverGoal(goalId: string, driverId: string, updates: any) {
    const { driverGoals } = await import('../shared/schema');
    const [goal] = await db
      .update(driverGoals)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(driverGoals.id, goalId), eq(driverGoals.driverId, driverId)))
      .returning();
    return goal;
  }

  async deleteDriverGoal(goalId: string, driverId: string) {
    const { driverGoals } = await import('../shared/schema');
    await db
      .delete(driverGoals)
      .where(and(eq(driverGoals.id, goalId), eq(driverGoals.driverId, driverId)));
  }
}

export const storage = new DatabaseStorage();
