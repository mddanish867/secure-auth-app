import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

// Initialize Prisma and Supabase clients
const prisma = new PrismaClient();
const supabase = createClient(process.env.DATABASE_URL, process.env.DIRECT_URL);

// Initialize Multer to handle multipart/form-data (store files in memory)
const upload = multer({ storage: multer.memoryStorage() });

// Disable Next.js built-in body parser to handle multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
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

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method '${req.method}' not allowed` });
  }

  try {
    // Parse request with Multer
    await runMulter(req, res);

    const { name } = req.body;
    const files = req.files;

    if (!name || !files || files.length === 0) {
      return res.status(400).json({ message: 'Name and images are required' });
    }

    const uploadedImages = [];

    for (const file of files) {
      // Upload each file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(`images/${Date.now()}_${file.originalname}`, file.buffer, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Error uploading image: ${error.message}`);
      }

      const imageUrl = `${supabase.storageUrl}/object/public/uploads/${data.path}`;
      uploadedImages.push(imageUrl);

      // Save image URL and name to Prisma
      await prisma.image.create({
        data: {
          name,
          imageUrl,
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
