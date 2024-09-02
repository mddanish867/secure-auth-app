import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Remove 2FA secret and disable 2FA for the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        towFactorEnabled: false,
      },
    });

    res.status(200).json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
