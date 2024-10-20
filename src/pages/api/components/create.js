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

// Helper function to parse incoming requests with Multer
const runMulter = (req, res) => {
  return new Promise((resolve, reject) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err) return reject(err);
      resolve(req);
    });
  });
};

const handler = async (req, res) => {
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
    return res.status(200).end();
  }

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
      const result = await cloudinary.v2.uploader.upload_stream(
        { folder: 'uploads', resource_type: 'image' },
        (error, result) => {
          if (error) {
            throw new Error(`Error uploading image: ${error.message}`);
          }
          return result;
        }
      ).end(file.buffer);

      const imageUrl = result.secure_url;
      uploadedImages.push(imageUrl);

      // Save image URL and name to Prisma (Supabase table)
      await prisma.component.create({
        data: {
          name,
          imageUrl,
          userId,
        },
      });
    }

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
