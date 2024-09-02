import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("Request Method:", req.method);
  console.log("Request Query Parameters:", req.query);

  // Ensure the request method is GET
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  // Extract token from query parameters
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({
      message: "Verification token is required",
    });
  }

  try {
    // Find the user with the given verification token
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user || user.verifyTokenExpiry < new Date()) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    // Verify the token and update the user
    await prisma.user.update({
      where: { id: user.id }, // Use user ID to uniquely identify the record
      data: { 
        isVerified: true,
        verificationToken: null, // Clear the token after verification
      },
    });

    return res.status(200).json({
      message: "Email verified successfully",
      success: true,
    });

  } catch (error) {
    console.error("Verification error:", error); // Log the error for debugging
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
