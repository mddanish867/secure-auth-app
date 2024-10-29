import { PrismaClient } from "@prisma/client";
import multer from "multer";
import cloudinary from "cloudinary";

// Initialize Prisma and Cloudinary clients
const prisma = new PrismaClient();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize Multer to handle multipart/form-data (store files in memory)
const upload = multer({ storage: multer.memoryStorage() });

// Disable Next.js built-in body parser to handle multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};

const allowedOrigins = [
  "http://localhost:3000",
  "https://anjumara-saas-application.vercel.app",
];

// Helper function to handle CORS and preflight OPTIONS request
const handleCors = (req, res) => {
  const origin = req.headers.origin;

  // Set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", ""); // Handle unauthorized origins
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true; // To exit the function
  }
  return false;
};

// Helper function to parse incoming requests with Multer
const runMulter = (req, res) => {
  return new Promise((resolve, reject) => {
    upload.array("images", 10)(req, res, (err) => {
      if (err) return reject(err);
      resolve(req);
    });
  });
};

// Helper function to upload image to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder: "uploads", resource_type: "image" },
      (error, result) => {
        if (error) {
          return reject(`Error uploading image: ${error.message}`);
        }
        resolve(result);
      }
    );
    uploadStream.end(file.buffer);
  });
};

const handler = async (req, res) => {
  // Handle CORS and exit if OPTIONS request
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  try {
    // Parse request with Multer
    await runMulter(req, res);

    const {
      name,
      category,
      description,
      techStack,
      templateUrl,
      sourceCodeUrl,
      apiList,
      userId,
    } = req.body;

    const files = req.files;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    if (!description) {
      return res.status(400).json({
        message: "Description is required",
      });
    }
    if (!category) {
      return res.status(400).json({
        message: "Category is required",
      });
    }
    if (!techStack) {
      return res.status(400).json({
        message: "Tech Stack is required",
      });
    }

    if (!templateUrl) {
      return res.status(400).json({
        message: "Templare Url is required",
      });
    }

    if (!apiList || apiList.length === 0) {
      return res.status(400).json({
        message: "API list are required",
      });
    }

    if (!sourceCodeUrl) {
      return res.status(400).json({
        message: "source code Url is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        message: "At least one image is required",
      });
    }

    const uploadedImages = [];

    for (const file of files) {
      // Upload each file to Cloudinary
      const result = await uploadToCloudinary(file); // Await the Cloudinary upload for each image
      const imageUrl = result.secure_url;
      uploadedImages.push(imageUrl);
    }

    // Create a comma-separated string of image URLs
    const imageUrlsString = uploadedImages.join(",");
    // **Check if apiRequired are strings and parse them if necessary**

    let apiListArray = apiList;

    if (typeof apiList === "string") {
      try {
        apiListArray = JSON.parse(apiList); // Convert to array if string
      } catch (error) {
        console.error("Error parsing apiList:", error);
      }
    }

    // Convert arrays to comma-separated strings
    const apiListString = Array.isArray(apiListArray)
      ? apiListArray.join(",")
      : "";

    // Save all fields to Prisma (Supabase table)
    await prisma.template.create({
      data: {
        name,
        category, // Directly save the categories array
        description,
        techStack,
        templateUrl,
        sourceCodeUrl,
        apiList: apiListString, // Save as a comma-separated string
        imageUrl: imageUrlsString, // Save the comma-separated image URLs
        userId,
      },
    });
    // Respond with success
    return res.status(200).json({
      message: "Template created successfully",
      images: uploadedImages,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    return res
      .status(500)
      .json({ message: "Error creating template", error: error.message });
  }
};
