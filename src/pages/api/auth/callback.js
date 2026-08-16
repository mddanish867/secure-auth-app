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
  setCorsHeaders(res, origin);
  handleOptionsRequest(res, req.method);
  handleInvalidMethod(res, req.method);

  try {
    const code = getCodeFromQuery(req);
    if (!code) {
      throw new Error('No code provided');
    }

    const session = await exchangeCodeForSession(code);
    const user = session.user;
    if (!user || !user.email) {
      throw new Error('No user data received');
    }

    const existingUser = await getUserOrCreate(prisma, user);
    const frontendOrigin = getFrontendOrigin();
    res.redirect(`${frontendOrigin}/auth/success?session=${session.session.access_token}`);
  } catch (error) {
    console.error('Callback error:', error);
    const frontendOrigin = getFrontendOrigin();
    res.redirect(
      `${frontendOrigin}/auth/error?message=${encodeURIComponent(error.message)}`
    );
  }
}

function setCorsHeaders(res, origin) {
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

function handleOptionsRequest(res, method) {
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
}

function handleInvalidMethod(res, method) {
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}

function getCodeFromQuery(req) {
  return req.query.code;
}

function exchangeCodeForSession(code) {
  return supabase.auth.exchangeCodeForSession(code);
}

function getUserOrCreate(prisma, user) {
  return prisma.user.findUnique({ where: { email: user.email } })
    .then(existingUser => existingUser || prisma.user.create({
      data: {
        email: user.email,
        googleId: user.id,
        name: user.user_metadata?.full_name || '',
        profileImage: user.user_metadata?.avatar_url || '',
      },
    }));
}

function getFrontendOrigin() {
  return 'http://localhost:3000'; // Your frontend URL
}