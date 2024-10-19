import { PrismaClient } from "@prisma/client";
import formidable from "formidable";
import fs from "fs";

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*"); // Adjust this to allow specific origins
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ message: "Error parsing form data" });
    }
  
    try {
      const { name, description, techStack, apiList, userId } = fields; // Added userId here
      const screenshots = files.screenshots;
      const document = files.document;
      const code = files.code;
  
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }
      if (!techStack) {
        return res.status(400).json({ message: "Tech stack is required" });
      }
      if (!apiList) {
        return res.status(400).json({ message: "API list is required" });
      }
      if (!screenshots) {
        return res.status(400).json({ message: "Screenshots are required" });
      }
      if (!document) {
        return res.status(400).json({ message: "Document is required" });
      }
      if (!code) {
        return res.status(400).json({ message: "Code file is required" });
      }
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Validate the file types (if necessary, based on expected file types)
      const validateFile = (file, allowedExtensions) => {
        const fileExt = file.name.split(".").pop().toLowerCase();
        return allowedExtensions.includes(fileExt);
      };
  
      const validScreenshotTypes = ["png", "jpg", "jpeg"];
      const validDocumentTypes = ["pdf"];
      const validCodeTypes = ["zip", "rar"];
  
      if (!validateFile(screenshots, validScreenshotTypes)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid screenshot file type" });
      }
      if (!validateFile(document, validDocumentTypes)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid document file type" });
      }
      if (!validateFile(code, validCodeTypes)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid code file type" });
      }
  
      // Upload screenshots
      const screenshotUrls = await Promise.all(
        (Array.isArray(screenshots) ? screenshots : [screenshots]).map(
          async (screenshot) => {
            const { data, error } = await supabase.storage
              .from("screenshots")
              .upload(
                `${Date.now()}-${screenshot.name}`,
                fs.createReadStream(screenshot.path)
              );
            if (error) throw error;
            return data?.path || "";
          }
        )
      );
  
      // Upload document
      const { data: documentData, error: documentError } =
        await supabase.storage
          .from("documents")
          .upload(
            `${Date.now()}-${document.name}`,
            fs.createReadStream(document.path)
          );
      if (documentError)
        throw new Error(`Document upload failed: ${documentError.message}`);
  
      // Upload code
      const { data: codeData, error: codeError } = await supabase.storage
        .from("code")
        .upload(`${Date.now()}-${code.name}`, fs.createReadStream(code.path));
      if (codeError)
        throw new Error(`Code upload failed: ${codeError.message}`);
  
      // Create template in database
      const template = await prisma.template.create({
        data: {
          userId, // Add userId to the data being stored
          name,
          description,
          techStack: techStack.split(","),
          screenshots: screenshotUrls,
          documentUrl: documentData?.path || "",
          codeUrl: codeData?.path || "",
          apiList: apiList.split(","),
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
    }
  });
  
}
