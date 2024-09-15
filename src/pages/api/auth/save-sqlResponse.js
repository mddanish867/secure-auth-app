import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import cookie from 'cookie';

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

  const { query, response } = req.body;

  if (!query || !response) {
    return res.status(400).json({ message: "Query and response are required." });
  }

  try {
    // Verify the JWT token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Extract userId from the decoded token
    const { userId } = decoded;

    // Check if the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Save the AI response in the database
    const aiResponse = await prisma.aIResponse.create({
      data: {
        userId, // Associate with user
        query,
        response,
      },
    });

    // Return success response
    return res.status(200).json({
      message: 'AI response saved successfully',
      aiResponse,
    });

  } catch (error) {
    console.error("Error saving AI response:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}
