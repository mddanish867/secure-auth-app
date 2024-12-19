import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'https://anjumara-saas-application.vercel.app',
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const origin = req.headers.origin;
  
  // CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Changed to accept GET method for OAuth callback
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { code } = req.query;

    if (!code) {
      throw new Error('No code provided');
    }

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) throw error;

    const { user, session } = data;

    if (!user || !user.email) {
      throw new Error('No user data received');
    }

    // Check/create user in Prisma
    let existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existingUser) {
      existingUser = await prisma.user.create({
        data: {
          email: user.email,
          googleId: user.id,
          name: user.user_metadata?.full_name || '',
          profileImage: user.user_metadata?.avatar_url || '',
        },
      });
    }

    // Redirect to frontend with session
    const frontendOrigin = 'http://localhost:3000'; // Your frontend URL
    res.redirect(`${frontendOrigin}/auth/success?session=${session.access_token}`);
  } catch (error) {
    console.error('Callback error:', error);
    const frontendOrigin = 'http://localhost:3000'; // Your frontend URL
    res.redirect(
      `${frontendOrigin}/auth/error?message=${encodeURIComponent(error.message)}`
    );
  }
}