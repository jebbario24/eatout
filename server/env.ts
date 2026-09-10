// Environment variable validation and configuration
// This ensures all required env vars are set before the app starts

interface EnvConfig {
  // Required
  DATABASE_URL: string;
  SESSION_SECRET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  
  // Optional but recommended
  BASE_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  
  // Google Maps API (for delivery tracking and route optimization)
  GOOGLE_MAPS_API_KEY?: string;
  GOOGLE_MAPS_API_KEY_SERVER?: string;
  
  // Server config
  PORT: string;
  NODE_ENV: string;
  PRIVATE_OBJECT_DIR: string;
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

const OPTIONAL_ENV_VARS = [
  'BASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_MAPS_API_KEY_SERVER',
] as const;

export function validateEnv(): EnvConfig {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional but recommended variables
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  // Log warnings for optional vars
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('\n⚠️  Optional environment variables not set:');
    warnings.forEach(envVar => {
      console.warn(`   - ${envVar}`);
    });
    console.warn('   Some features may not work without these.\n');
  }

  // Fail if required vars are missing
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(envVar => {
      console.error(`   - ${envVar}`);
    });
    console.error('\nPlease set these variables in your .env file or hosting platform.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  // Return validated config
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID!,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME!,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL!,
    BASE_URL: process.env.BASE_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    GOOGLE_MAPS_API_KEY_SERVER: process.env.GOOGLE_MAPS_API_KEY_SERVER || process.env.GOOGLE_MAPS_API_KEY,
    PORT: process.env.PORT || '5000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PRIVATE_OBJECT_DIR: process.env.PRIVATE_OBJECT_DIR || 'private',
  };
}

// Helper to get base URL with fallback
export function getBaseUrl(): string {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  BASE_URL not set in production. Using fallback.');
    return 'https://eatout.cloud';
  }
  
  return 'http://localhost:5000';
}

// Validate on module load
export const env = validateEnv();

console.log('✅ Environment variables validated successfully');
