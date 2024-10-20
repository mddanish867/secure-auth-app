import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import cloudinary from 'cloudinary';

// Initialize Prisma and Supabase clients
const prisma = new PrismaClient();

// Initialize Cloudinary
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
  'http://localhost:3000',
  'https://anjumara-saas-application.vercel.app',
];

// Helper function to handle CORS and preflight OPTIONS request
const handleCors = (req, res) => {
  const origin = req.headers.origin;

  // Set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ''); // Or handle unauthorized origins
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // To exit the function
  }
  return false;
};

// Helper function to parse incoming requests with Multer
const runMulter = (req, res) => {
  return new Promise((resolve, reject) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err) return reject(err);
      resolve(req);
    });
  });
};

// Helper function to upload image to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder: 'uploads', resource_type: 'image' },
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed',
    });
  }

  try {
    // Parse request with Multer
    await runMulter(req, res);

    const { name, userId } = req.body;
    const files = req.files;

    if (!name || !userId || !files || files.length === 0) {
      return res.status(400).json({ message: 'Name, userId, and images are required' });
    }

    const uploadedImages = [];

    for (const file of files) {
      // Upload each file to Cloudinary
      const result = await uploadToCloudinary(file); // Await the Cloudinary upload for each image
      const imageUrl = result.secure_url;
      uploadedImages.push(imageUrl);
    }

    // Create a comma-separated string of image URLs
    const imageUrlsString = uploadedImages.join(',');

    // Save name, userId, and comma-separated image URLs to Prisma (Supabase table)
    await prisma.component.create({
      data: {
        name,
        imageUrl: imageUrlsString, // Save the comma-separated string here
        userId,
      },
    });

    // Respond with success
    return res.status(200).json({
      message: 'Images uploaded successfully',
      images: uploadedImages,
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return res.status(500).json({ message: 'Error uploading images', error: error.message });
  }
};

export default handler;
