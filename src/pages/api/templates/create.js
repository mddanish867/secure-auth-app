import { PrismaClient } from "@prisma/client";
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const prisma = new PrismaClient();
const supabase = createClient(process.env.DATABASE_URL, process.env.supabase.DIRECT_URL);
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

      // Upload screenshots
      const screenshotUrls = await Promise.all(
        (Array.isArray(screenshots) ? screenshots : [screenshots]).map(async (screenshot) => {
          const fileContent = await fs.promises.readFile(screenshot.filepath);
          const { data, error } = await supabase.storage
            .from('screenshots')
            .upload(`${Date.now()}-${screenshot.originalFilename}`, fileContent, {
              contentType: screenshot.mimetype,
            });
          if (error) throw error;
          return data?.path || '';
        })
      );

      // Upload document
      const documentContent = await fs.promises.readFile(document.filepath);
      const { data: documentData, error: documentError } = await supabase.storage
        .from('documents')
        .upload(`${Date.now()}-${document.originalFilename}`, documentContent, {
          contentType: document.mimetype,
        });
      if (documentError) throw documentError;

      // Upload code
      const codeContent = await fs.promises.readFile(code.filepath);
      const { data: codeData, error: codeError } = await supabase.storage
        .from('code')
        .upload(`${Date.now()}-${code.originalFilename}`, codeContent, {
          contentType: code.mimetype,
        });
      if (codeError) throw codeError;

      // Create template in database
      const template = await prisma.template.create({
        data: {
          name,
          description,
          techStack: techStack.split(',').map(tech => tech.trim()),
          screenshots: screenshotUrls,
          documentUrl: documentData?.path || '',
          codeUrl: codeData?.path || '',
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