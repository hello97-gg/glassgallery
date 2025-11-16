// This is a serverless function that acts as a proxy to the Catbox API.
// It's designed to run in an environment like Vercel or Netlify.
import { GoogleGenAI } from "@google/genai";
import fetch from "node-fetch";
import FormData from "form-data";
import sharp from "sharp";

// Increase the body parser limit to handle larger base64 image uploads.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { file, name } = req.body;

    if (!file || !name) {
      return res.status(400).json({ error: "Missing 'file' or 'name' in request body." });
    }

    let buffer = Buffer.from(file, "base64");
    
    // --- Image Compression Logic ---
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Define conditions for compression: image is wider than 1920px or file size is > 1MB
    const MAX_WIDTH = 1920;
    const ONE_MB = 1024 * 1024;

    if (metadata.width > MAX_WIDTH || buffer.length > ONE_MB) {
        console.log(`Compressing image: ${name}, size: ${buffer.length}, width: ${metadata.width}`);
        buffer = await image
            .resize({ width: MAX_WIDTH, withoutEnlargement: true }) // Resize without making smaller images larger
            .webp({ quality: 80 }) // Convert to WebP with 80% quality
            .toBuffer();
        console.log(`Compressed image size: ${buffer.length}`);
    }
    // --- End Compression Logic ---

    // --- NSFW Detection with Gemini ---
    let isNSFW = false;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [
                { inlineData: { mimeType: 'image/jpeg', data: buffer.toString('base64') } },
                { text: "Analyze the image for Not Safe For Work (NSFW) content. Categories to consider include explicit nudity, graphic violence, gore, and sexually suggestive themes. If the image contains content from any of these categories, respond with the single word 'yes'. Otherwise, respond with the single word 'no'." }
            ]},
            config: {
                systemInstruction: "You are an expert content moderation AI. Your task is to accurately classify images based on their content. Respond only with 'yes' or 'no' as instructed.",
            },
        });
        const geminiResult = response.text.trim().toLowerCase();
        isNSFW = geminiResult.includes('yes');
        console.log(`Gemini NSFW check for ${name}: ${isNSFW}`);
    } catch(err) {
        console.error("Gemini API error:", err);
        // Fail safe: if Gemini fails, assume it's not NSFW to avoid blocking uploads.
        isNSFW = false;
    }
    // --- End NSFW Detection ---

    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", buffer, name);

    const catboxResponse = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
    });

    if (!catboxResponse.ok) {
        const errorText = await catboxResponse.text();
        console.error("Catbox API Error:", errorText);
        // The error "Request Entity Too Large" from Catbox is plain text, not JSON
        if (catboxResponse.status === 413) {
             throw new Error(`Catbox rejected the file: Request Entity Too Large. Compressed size: ${buffer.length} bytes.`);
        }
        throw new Error(`Catbox API responded with status ${catboxResponse.status}: ${errorText}`);
    }

    const fileUrl = await catboxResponse.text();

    if (!fileUrl.startsWith('http')) {
        throw new Error(`Received an invalid response from Catbox: ${fileUrl}`);
    }

    res.status(200).json({ url: fileUrl, isNSFW });

  } catch (err) {
    console.error("Error in /api/uploadToCatbox:", err);
    res.status(500).json({ error: "Upload failed due to a server error.", details: err.message });
  }
}