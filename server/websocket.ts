import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { log } from './vite';
import { storage } from './storage';
import session from 'express-session';
import connectPg from 'connect-pg-simple';

interface WebSocketClient extends WebSocket {
  userId?: string;
  role?: string;
  merchantId?: string;
  isAlive?: boolean;
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

// Session store configuration (must match routes.ts)
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
const pgStore = connectPg(session);
const sessionStore = new pgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: false,
  ttl: sessionTtl,
  tableName: "sessions",
});

// Session parser middleware
const sessionParser = session({
  secret: process.env.SESSION_SECRET!,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: sessionTtl,
  },
});

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocketClient>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: async (info, callback) => {
        // Note: verifyClient doesn't support async properly, so we'll do auth in 'connection' event
        callback(true);
      }
    });

    this.wss.on('connection', async (ws: WebSocketClient, req: IncomingMessage) => {
      log('[WebSocket] New connection attempt');

      try {
        // Parse session from request
        const sessionData = await this.parseSession(req);

        if (!sessionData || !sessionData.passport || !sessionData.passport.user) {
          log('[WebSocket] Unauthorized - No valid session');
          ws.send(JSON.stringify({
            type: 'auth_error',
            data: { message: 'Unauthorized - Please log in' }
          }));
          ws.close(1008, 'Unauthorized');
          return;
        }

        const userId = sessionData.passport.user;

        // Fetch user from database to verify existence and get role
        const user = await storage.getUser(userId);

        if (!user) {
          log(`[WebSocket] User not found: ${userId}`);
          ws.send(JSON.stringify({
            type: 'auth_error',
            data: { message: 'User not found' }
          }));
          ws.close(1008, 'User not found');
          return;
        }

        // Assign server-validated identity to WebSocket client
        ws.userId = user.id;
        ws.role = user.role;

        // For merchant owners: fetch merchantId from database
        if (user.role === 'owner') {
          const merchant = await storage.getMerchantByOwnerId(user.id);
          if (merchant) {
            ws.merchantId = merchant.id;
          }
        }

        // Add to appropriate client lists based on server-validated identity
        this.addClient(`user:${ws.userId}`, ws);

        if (ws.merchantId) {
          this.addClient(`merchant:${ws.merchantId}`, ws);
        }

        if (ws.role === 'admin') {
          this.addClient('admin:all', ws);
        }

        log(`[WebSocket] Client authenticated: userId=${ws.userId}, role=${ws.role}, merchantId=${ws.merchantId || 'N/A'}`);
        
        // Send authentication success confirmation
        this.sendToClient(ws, {
          type: 'auth_success',
          data: {
            userId: ws.userId,
            role: ws.role,
            merchantId: ws.merchantId
          }
        });

        // Setup connection handlers
        ws.isAlive = true;

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            this.handleMessage(ws, data);
          } catch (error) {
            log(`[WebSocket] Error parsing message: ${error}`);
          }
        });

        ws.on('close', () => {
          log(`[WebSocket] Connection closed: userId=${ws.userId}`);
          this.removeClient(ws);
        });

        ws.on('error', (error) => {
          log(`[WebSocket] Error: ${error}`);
        });

      } catch (error) {
        log(`[WebSocket] Authentication error: ${error}`);
        ws.send(JSON.stringify({
          type: 'auth_error',
          data: { message: 'Authentication failed' }
        }));
        ws.close(1011, 'Authentication error');
      }
    });

    // Heartbeat to detect broken connections
    const interval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws: WebSocket) => {
        const client = ws as WebSocketClient;
        if (!client.isAlive) {
          log('[WebSocket] Terminating dead connection');
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    log('[WebSocket] Server initialized on /ws with secure session-based authentication');
  }

  // Parse session from WebSocket upgrade request
  private parseSession(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create a mock response object for session parser
      const mockRes: any = {
        getHeader: () => {},
        setHeader: () => {},
        end: () => {},
      };

      // Parse session using express-session middleware
      sessionParser(req as any, mockRes, (err?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve((req as any).session);
        }
      });
    });
  }

  private async handleMessage(ws: WebSocketClient, message: any) {
    // All identity is now derived from session - no client auth messages accepted
    // Future message types can be handled here (e.g., ping, status updates)
    
    // Security: Log any attempts to send 'auth' messages (should not happen)
    if (message.type === 'auth') {
      log(`[WebSocket] SECURITY WARNING: Client attempted to send auth message. userId=${ws.userId}`);
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Authentication is session-based. Client auth messages are not accepted.' }
      });
      return;
    }

    // Handle other message types as needed
    // Example: ping/pong, status updates, etc.
  }

  private addClient(key: string, client: WebSocketClient) {
    if (!this.clients.has(key)) {
      this.clients.set(key, new Set());
    }
    this.clients.get(key)!.add(client);
  }

  private removeClient(client: WebSocketClient) {
    this.clients.forEach((clientSet, key) => {
      clientSet.delete(client);
      if (clientSet.size === 0) {
        this.clients.delete(key);
      }
    });
  }

  private sendToClient(client: WebSocketClient, message: WebSocketMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // Broadcast to all users of a specific merchant
  broadcastToMerchant(merchantId: string, message: WebSocketMessage) {
    const clients = this.clients.get(`merchant:${merchantId}`);
    if (clients) {
      clients.forEach(client => this.sendToClient(client, message));
    }
  }

  // Broadcast to all admins
  broadcastToAdmins(message: WebSocketMessage) {
    const clients = this.clients.get('admin:all');
    if (clients) {
      clients.forEach(client => this.sendToClient(client, message));
    }
  }

  // Broadcast to specific user
  broadcastToUser(userId: string, message: WebSocketMessage) {
    const clients = this.clients.get(`user:${userId}`);
    if (clients) {
      clients.forEach(client => this.sendToClient(client, message));
    }
  }

  // Broadcast to all connected clients
  broadcastToAll(message: WebSocketMessage) {
    if (!this.wss) return;
    
    this.wss.clients.forEach((ws: WebSocket) => {
      this.sendToClient(ws as WebSocketClient, message);
    });
  }

  // Broadcast location update to order's merchant
  async broadcastLocationToOrder(orderId: string, location: { lat: number; lng: number; timestamp: string }) {
    try {
      const order = await storage.getOrder(orderId);
      if (!order || !order.merchantId) return;

      // Notify merchant
      this.broadcastToMerchant(order.merchantId, {
        type: 'delivery_location_update',
        data: { orderId, ...location },
      });
    } catch (error) {
      log(`[WebSocket] Error broadcasting location to order ${orderId}: ${error}`);
    }
  }

  // Broadcast ETA update
  async broadcastETAUpdate(orderId: string, eta: {
    estimatedMinutes: number;
    distanceRemainingMeters: number;
    trafficLevel: string;
    estimatedPickupTime?: Date;
    estimatedDeliveryTime?: Date;
  }) {
    try {
      const order = await storage.getOrder(orderId);
      if (!order) return;

      const message: WebSocketMessage = {
        type: 'eta_update',
        data: { orderId, ...eta },
      };

      // Notify merchant (if any — API delivery jobs have none)
      if (order.merchantId) {
        this.broadcastToMerchant(order.merchantId, message);
      }
    } catch (error) {
      log(`[WebSocket] Error broadcasting ETA update for order ${orderId}: ${error}`);
    }
  }
}

export const wsManager = new WebSocketManager();
