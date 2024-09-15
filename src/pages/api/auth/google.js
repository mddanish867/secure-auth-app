import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allowedOrigins = [
    'http://localhost:3001',
    'https://anjumara-saas-application.vercel.app',
  ];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {

    const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ''); // Or handle unauthorized origins
  }
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  } 

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { user, session, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    // Check if the user exists in your database
    let existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existingUser) {
      // Create the user in the database
      existingUser = await prisma.user.create({
        data: {
          email: user.email,
          googleId: user.id,
        },
      });
    }

    res.status(200).json({ user: existingUser, session });
  } catch (dbError) {
    return res.status(500).json({ error: 'Database error' });
  }
}
