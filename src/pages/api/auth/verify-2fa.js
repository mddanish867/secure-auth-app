import speakeasy from "speakeasy";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID  is required." });
  }

  try {
    // Retrieve the User and their 2FA secret
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorSecret) {
      return res
        .status(400)
        .json({ message: "2FA is not enabled for this user" });
    }

    const generatedToken = speakeasy.totp({
      secret: user.twoFactorSecret,
      encoding: "base32",
    });

    const isVerified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: generatedToken,
    });

    if (!isVerified) {
      return res.status(400).json({ message: "Invalid token" });
    }

    return res.status(200).json({ message: "2FA verified successfully" });
  } catch (error) {
    console.error("Verification error:", error); // Log the error for debugging
    return res.status(500).json({ message: "Internal server error" });
  }
}
