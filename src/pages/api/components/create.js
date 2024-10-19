// pages/api/upload.js
import { PrismaClient } from "@prisma/client";
import supabase from '../../lib/supabaseClient';
import multer from 'multer';
import nextConnect from 'next-connect';

const prisma = new PrismaClient();
// Initialize Multer to handle multipart/form-data
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory for handling
});

const apiRoute = nextConnect({
  onError(error, req, res) {
    res.status(500).json({ error: `Something went wrong! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Use multer to parse the multipart form data
apiRoute.use(upload.array('images', 10)); // Upload up to 5 images

apiRoute.post(async (req, res) => {
  const { name } = req.body;
  const files = req.files;

  if (!name || files.length === 0) {
    return res.status(400).json({ message: 'Name and images are required' });
  }

  try {
    const uploadedImages = [];

    for (const file of files) {
      // Upload image to Supabase Storage
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

    res.status(200).json({
      message: 'Images uploaded successfully',
      images: uploadedImages,
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Error uploading images', error: error.message });
  }
});

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing for this route because multer handles it
  },
};

export default apiRoute;
