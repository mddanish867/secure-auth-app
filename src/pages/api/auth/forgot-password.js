import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();



export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email required." });
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate reset token and expiry date
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Update user with reset token and expiry
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset email    
    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "9222b90db71b20",
        pass: "1000d67bf0adc4"
      }
    });

    const mailOptions = {
      from: "sender@danish.ai.com", // sender address
      to: email, // list of receivers
      subject: "reset your password", // Subject line
      html: `
        <div class="max-w-lg mx-auto my-10 bg-white p-8 rounded-lg shadow-md">
          <div class="text-center mb-6">
              <h1 className="mx-auto h-16 w-16 text-blue-500">AnjumAra</h1>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 text-center mb-4">Reset Your Password</h2>
          <p class="text-gray-600 text-center mb-6">
              Dear User,<br>
              Thank you for registering with AnjumAra! To complete your registration, please reset your password by clicking the button below.
          </p>
          <div class="text-center">
              <a href="${process.env.DOMAIN}/resetpassword?token=${resetToken}" class="bg-blue-500 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-blue-600">Reset Password</a>
          </div>
          <p class="text-gray-600 text-center mt-6">
              Or you can copy and paste the following URL into your browser:
          </p>
          <p class="text-blue-500 text-center mt-2">
              <a href="${process.env.DOMAIN}/resetpassword?token=${resetToken}">${process.env.DOMAIN}/resetpassword?token=${resetToken}</a>
          </p>
          <p class="text-gray-400 text-center mt-8 text-sm">
              If you did not create an account, please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      success: true,
      message: "Password reset link sent to your email.",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
