import { PrismaClient } from "@prisma/client";
import cloudinary from 'cloudinary';
import formidable from 'formidable';
import fs from 'fs';

// Initialize Prisma and Cloudinary clients
const prisma = new PrismaClient();
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this to allow specific origins
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

  const form = new formidable.IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form data:', err);
      return res.status(500).json({ message: 'Error parsing form data' });
    }

    try {
      const { name, description, techStack, apiList } = fields;
      const screenshots = files.screenshots;
      const document = files.document;
      const code = files.code;

      if (!name || !description || !techStack || !apiList || !screenshots || !document || !code) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Helper function to upload file to Cloudinary
      const uploadToCloudinary = async (file) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.v2.uploader.upload_stream(
            { folder: 'uploads', resource_type: 'auto' }, // resource_type: 'auto' allows any file type
            (error, result) => {
              if (error) {
                return reject(`Error uploading to Cloudinary: ${error.message}`);
              }
              resolve(result.secure_url);
            }
          );
          fs.createReadStream(file.filepath).pipe(uploadStream);
        });
      };

      // Upload screenshots
      const screenshotUrls = await Promise.all(
        (Array.isArray(screenshots) ? screenshots : [screenshots]).map(screenshot => uploadToCloudinary(screenshot))
      );

      // Upload document
      const documentUrl = await uploadToCloudinary(document);

      // Upload code
      const codeUrl = await uploadToCloudinary(code);

      // Create template in the database
      const template = await prisma.template.create({
        data: {
          name,
          description,
          techStack: techStack.split(',').map(tech => tech.trim()),
          screenshots: screenshotUrls,
          documentUrl,
          codeUrl,
          apiList: apiList.split(',').map(api => api.trim()),
        },
      });

      return res.status(201).json({
        success: true,
        message: "Template created successfully.",
        template,
      });

    } catch (error) {
      console.error("Error creating template:", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong.",
        error: error.message,
      });
    } finally {
      // Clean up temporary files
      const tempFiles = [
        ...(Array.isArray(files.screenshots) ? files.screenshots : [files.screenshots]),
        files.document,
        files.code
      ].filter(Boolean);

      for (const file of tempFiles) {
        fs.unlink(file.filepath, (err) => {
          if (err) console.error(`Error deleting temporary file: ${err}`);
        });
      }
    }
  });
}
