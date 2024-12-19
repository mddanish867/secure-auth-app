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

  const { id } = req.query; // Extract ID from query parameters

  // Check if ID is provided
  if (!id) {
    return res.status(400).json({
      message: "Template ID is required",
    });
  }

  try {
    // Fetch the template from Prisma based on the provided ID
    const template = await prisma.template.findUnique({
      where: { id }, 
      select: {
        id: true,
        name: true,
        category: true,
        description: true,        
        techStack: true,
        screenshots: true,
        templateUrl: true,
        sourceCodeUrl:true,
        apiList: true,        
        createdAt: true,
        updatedAt: true,
        userId: true, // Include userId to track who created it
      },
    });

    // Check if the template exists
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Respond with the template
    return res.status(200).json({
      message: "Template fetched successfully",
      component,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return res.status(500).json({
      message: "Error fetching template",
      error: error.message,
    });
  }
};

export default handler;