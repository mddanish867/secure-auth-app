import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

const allowedOrigins = [
  "http://localhost:3000",
  "https://anjumara-saas-application.vercel.app",
];

// Helper function to handle CORS and preflight OPTIONS request
const handleCors = (req, res) => {
  const origin = req.headers.origin;

  // Set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", ""); // Handle unauthorized origins
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true; // To exit the function
  }
  return false;
};

const handler = async (req, res) => {
  // Handle CORS and exit if OPTIONS request
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  try {
    // Fetch all components from Prisma (Supabase table)
    const components = await prisma.component.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        implementationSteps: true,
        apiRequired: true,
        documentation: true,
        imageUrl: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        userId: true, // Include userId to track who created it
      },
      orderBy: {
        createdAt: "desc", // Optional: sort components by creation date
      },
    });

    // Check if there are no components
    if (components.length === 0) {
      return res.status(404).json({ message: "No components found" });
    }

    // Respond with the components
    return res.status(200).json({
      message: "Components fetched successfully",
      components,
    });
  } catch (error) {
    console.error("Error fetching components:", error);
    return res.status(500).json({
      message: "Error fetching components",
      error: error.message,
    });
  }
};

export default handler;
