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

  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true; // To exit the function
  }
  return false;
};

const Handler = async (req, res) => {
  // Handle CORS and exit if OPTIONS request
  if (handleCors(req, res)) return;

  if (req.method !== "DELETE") {
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  const { id } = req.body; // Ensure the ID is passed in the request body

  // Validate the ID
  if (!id) {
    return res.status(400).json({
      message: "Component ID is required",
    });
  }

  try {
    // Check if the component exists
    const component = await prisma.component.findUnique({
      where: { id },
    });

    if (!component) {
      return res.status(404).json({
        message: "Component not found",
      });
    }

    // Delete the component
    await prisma.component.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Component deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting component:", error);
    return res.status(500).json({
      message: "Error deleting component",
      error: error.message,
    });
  }
};

export default Handler;
