import { PrismaClient } from "@prisma/client";
import speakeasy from "speakeasy";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowd" });
  }

  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ message: "User ID and token are required" });
  }

  try {
    // Retrive the User and their 2FA secret
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorSecret) {
      return res
        .status(400)
        .json({ message: "2FA is not enabled for this user" });
    }

    // Verify the token
    const isVerified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
    });

    if (!isVerified) {
      res.status(400).json({ message: "Invalid token" });
    }
    res.status(200).json({ message: "2FA verified successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
