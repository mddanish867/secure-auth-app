import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const allowedOrigins = [
  'http://localhost:3000',
  'https://anjumara-saas-application.vercel.app',
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ''); // Or handle unauthorized origins
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  const {userId, query, response, chatHeader } = req.body;

  if (!query || !response) {
    return res.status(400).json({ message: "Query and response are required." });
  }

  try {

   // Save the AI response in the database
    const aiResponse = await prisma.webResponse.create({
      data: {
        userId, 
        query,
        response,
        chatHeader,
      },
    });

    // Return success response
    return res.status(200).json({
      message: 'web response saved successfully',
      aiResponse,
    });

  } catch (error) {
    console.error("Error saving web response:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}
