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
  process.env.NEXT_PUBLIC_CLIENT_URL,
  "https://anjumara-saas-application.vercel.app",
  "https://secure-auth-app-gamma.vercel.app"
];

// Helper function to handle CORS and preflight OPTIONS request
const handleCors = (req, res) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "PUT" && req.method !== "OPTIONS") {
    return res.status(405).json({ message: "Method not allowed" });
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

const validateRequest = async (req) => {
  const { id } = req.query;
  if (!id) {
    throw new Error("Component ID is required");
  }
  return id;
};

const parseRequest = async (req) => {
  const { id } = req.query;
  const {
    name,
    description,
    code,
    implementationSteps,
    apiRequired,
    documentation,
    category,
    userId,
  } = req.body;
  const files = req.files;
  return { id, name, description, code, implementationSteps, apiRequired, documentation, category, userId, files };
};

const uploadImages = async (files) => {
  const uploadedImages = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file);
      const imageUrl = result.secure_url;
      uploadedImages.push(imageUrl);
    }
  }
  return uploadedImages;
};

const parseImplementationStepsAndApiRequired = (implementationSteps, apiRequired) => {
  let implementationStepsArray = implementationSteps;
  let apiRequiredArray = apiRequired;

  if (typeof implementationSteps === "string") {
    try {
      implementationStepsArray = JSON.parse(implementationSteps);
    } catch (error) {
      console.error("Error parsing implementationSteps:", error);
    }
  }

  if (typeof apiRequired === "string") {
    try {
      apiRequiredArray = JSON.parse(apiRequired);
    } catch (error) {
      logger.error("Error parsing apiRequired:", error);
    }
  }

  const implementationStepsString = Array.isArray(implementationStepsArray)
    ? implementationStepsArray.join(",")
    : "";
  const apiRequiredString = Array.isArray(apiRequiredArray)
    ? apiRequiredArray.join(",")
    : "";
  return { implementationStepsString, apiRequiredString };
};

const updateComponent = async (id, name, description, code, implementationStepsString, apiRequiredString, documentation, imageUrlsString, category, userId) => {
  const updatedComponent = await prisma.component.update({
    where: { id },
    data: {
      name: name,
      description: description,
      code: code,
      implementationSteps: implementationStepsString,
      apiRequired: apiRequiredString,
      documentation: documentation,
      imageUrl: imageUrlsString,
      category: category,
      userId: userId,
    },
  });
  return updatedComponent;
};

const handler = async (req, res) => {
  if (handleCors(req, res)) return;

  // Handle preflight request immediately
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow PUT method for actual requests
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse request with Multer
    await runMulter(req, res);

    const id = await validateRequest(req);
    const { name, description, code, implementationSteps, apiRequired, documentation, category, userId, files } = await parseRequest(req);
    const uploadedImages = await uploadImages(files);
    const imageUrlsString = uploadedImages.length
      ? uploadedImages.join(",")
      : "";
    const { implementationStepsString, apiRequiredString } = parseImplementationStepsAndApiRequired(implementationSteps, apiRequired);
    const component = await prisma.component.findUnique({ where: { id } });
    if (!component) {
      return res.status(404).json({ message: "Component not found" });
    }
    const updatedComponent = await updateComponent(id, name || component.name, description || component.description, code || component.code, implementationStepsString, apiRequiredString, documentation || component.documentation, imageUrlsString, category || component.category, userId || component.userId);
    return res.status(200).json({
      message: "Component updated successfully",
      component: updatedComponent,
      images: uploadedImages,
    });
  } catch (error) {
    console.error("Error updating component:", error);
    return res.status(500).json({ message: "Error updating component", error: error.message });
  }
};

export default handler;
