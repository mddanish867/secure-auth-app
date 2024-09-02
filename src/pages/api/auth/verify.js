import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status.json({
      message: "Method not allowed",
    });
  }

  const { token } = req.query;
  if (!query) {
    return res.status(400).json({
      message: "Verification token is required",
    });
  }

  try {
    // Verify token and update user
    const user = await prisma.user.updateMany({
      where: { verificationToken: token },
      data: { isVerified: true, verificationToken: null },
    });

    if (user.count === 0) {
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
