import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token and new password are required" });
  }

  try {
    // Find the User with Given reset token
    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user || user.resetTokenExpiry < new Date()) {
      return res
        .status(404)
        .json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user with new password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    res.status(200).json({ message: "Password updated successfully" });
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
