import { PrismaClient } from "@prisma/client";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to allow specific origins
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowd" });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID is rquired" });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  try {
    // Generate a new 2FA secret
    const secret = speakeasy.generateSecret({ name: "AnjumAra" });

    // Store the 2FA secret in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        towFactorEnabled: true,
      },
    });

    // Generate a QR code for 2FA setup
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.status(200).json({ qrCodeUrl, secret: secret.base32 });
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
