import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";

const prisma = new PrismaClient();

// function to validate password
const passwordValidation = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/;
  const hasLowerCase = /[a-z]/;
  const hasDigit = /\d/;
  const hasSpecialChar = /[!@#$%^&*()_+{}\[\]:;""'<>,.?~\\/-]/;

  return (
    password.length >= minLength &&
    hasUpperCase.test(password) &&
    hasLowerCase.test(password) &&
    hasDigit.test(password) &&
    hasSpecialChar.test(password)
  );
};

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
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  const {name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, Email and password are required" });
  }

  // validate password against policy
  if (!passwordValidation(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists.",
      });
    }

    // Generate verification token and expiry
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Prisma
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken,
        verifyTokenExpiry:verifyTokenExpiry,
      },
    });

    // Send verification email    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: "sender@danish.ai.com", // sender address
      to: email, // list of receivers
      subject: "Verify your email", // Subject line
      html: `
        <div class="max-w-lg mx-auto my-10 bg-white p-8 rounded-lg shadow-md">
          <div class="text-center mb-6">
              <h1 className="mx-auto h-16 w-16 text-blue-500">AnjumAra</h1>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 text-center mb-4">Verify Your Email Address</h2>
          <p class="text-gray-600 text-center mb-6">
              Dear User,<br>
              Thank you for registering with AnjumAra! To complete your registration, please verify your email address by clicking the button below.
          </p>
          <div class="text-center">
              <a href="${process.env.DOMAIN}/verifyemail?token=${verificationToken}" class="bg-blue-500 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-blue-600">Verify Email</a>
          </div>
          <p class="text-gray-600 text-center mt-6">
              Or you can copy and paste the following URL into your browser:
          </p>
          <p class="text-blue-500 text-center mt-2">
              <a href="${process.env.DOMAIN}/verifyemail?token=${verificationToken}">${process.env.DOMAIN}/verifyemail?token=${verificationToken}</a>
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
      message: "User created, Please check your email to verify your account.",
    });

  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error.message,
    });
  }
}
