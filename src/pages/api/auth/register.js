import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";

const prisma = new PrismaClient();

// // Configure Nodemailer
// const transporter = nodemailer.createTransport({
//   service: "Gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

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
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Prisma
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verificationToken,
      },
    });
    res.status(200).json({
      message:
        "User registered successfully check your mail to verify your account",
      user,
    });

    // Send verification email    
    var transporter = nodemailer.createTransport({
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
        subject: "Verify your email", // Subject line
        // html: `<p>Click <a href="${process.env.DOMAIN}/verifyemail?token=${verificationToken}">here</a> to verify your email
        // <br> ${process.env.DOMAIN}/verifyemail?token=${verificationToken}
        // </p>`, // html body
        html: `
        <div class="max-w-lg mx-auto my-10 bg-white p-8 rounded-lg shadow-md">
        <div class="text-center mb-6">
            <img src="path/to/your/logo.png" alt="AnjumAra Logo" class="mx-auto h-16 w-16">
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
        res.status(201).json({
        success: true,
        message: "User created, Please check your email to verify your account.",
    });

  } catch (error) {
    throw new Error(error.message);    
  }
}
