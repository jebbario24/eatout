import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getBaseUrl } from './env';

const SALT_ROUNDS = 10;

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Local Strategy (Email/Password)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.password) {
          return done(null, false, { message: 'Please sign in with Google' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Google OAuth Strategy (Restaurant Owners)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${getBaseUrl()}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Google ID
          let user = await db.query.users.findFirst({
            where: eq(users.googleId, profile.id),
          });

          if (!user) {
            // Check if user exists with this email
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await db.query.users.findFirst({
                where: eq(users.email, email.toLowerCase()),
              });

              if (user) {
                // Link Google account to existing user
                await db
                  .update(users)
                  .set({
                    googleId: profile.id,
                    profileImageUrl: profile.photos?.[0]?.value || null,
                  })
                  .where(eq(users.id, user.id));
                
                user.googleId = profile.id;
                user.profileImageUrl = profile.photos?.[0]?.value || null;
              }
            }
          }

          if (!user) {
            // Create new user
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email provided by Google'));
            }

            // Calculate trial end date (7 days from now)
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 7);

            const [newUser] = await db
              .insert(users)
              .values({
                email: email.toLowerCase(),
                googleId: profile.id,
                firstName: profile.name?.givenName || null,
                lastName: profile.name?.familyName || null,
                profileImageUrl: profile.photos?.[0]?.value || null,
                role: email.toLowerCase() === 'jebbario23@gmail.com' ? 'admin' : 'owner',
                subscriptionStatus: 'trial',
                trialEndsAt,
              })
              .returning();

            user = newUser;
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

}

export { passport };

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Helper function to verify passwords
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
