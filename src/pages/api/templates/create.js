import { PrismaClient } from "@prisma/client";
import formidable from "formidable";
import fs from "fs";
import supabase from "@/lib/supabaseClient"; // Make sure this is the correct path to your supabaseClient.js

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

const allowedOrigins = [
  "http://localhost:3000",
  "https://anjumara-saas-application.vercel.app",
  "https://secure-auth-app-gamma.vercel.app",
];

export default async function handler(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "POST") {
    const form = formidable({ multiples: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ message: "Error parsing form data" });
      }

      try {
        const { name, description, techStack, apiList, userId } = fields;
        const screenshots = files.screenshots;
        const document = files.document;
        const code = files.code;

        if (!name || !description || !techStack || !apiList || !screenshots || !document || !code || !userId) {
          return res.status(400).json({ message: "All fields are required" });
        }

        const validateFile = (file, allowedExtensions) => {
          const fileExt = file.name.split(".").pop().toLowerCase();
          return allowedExtensions.includes(fileExt);
        };

        const validScreenshotTypes = ["png", "jpg", "jpeg"];
        const validDocumentTypes = ["pdf", "docs", "xcls"];
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
            userId,
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
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
