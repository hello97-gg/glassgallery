// This is a serverless function that acts as a proxy to the Catbox API.
// It's designed to run in an environment like Vercel or Netlify.
import fetch from "node-fetch";
import FormData from "form-data";
import sharp from "sharp";
import { JigsawStack } from "jigsawstack";

// Increase the body parser limit to handle larger base64 image uploads.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Helper function to determine if the moderation result is NSFW
const isModerationResultNSFW = (moderation) => {
  if (!moderation) return false;

  const nsfwCategories = moderation.nsfw || {};
  const goreCategories = moderation.gore || {};
  const nsfwFlags = ['POSSIBLE', 'LIKELY', 'VERY_LIKELY'];

  for (const key in nsfwCategories) {
    if (nsfwFlags.includes(nsfwCategories[key])) {
      console.log(`NSFW flag triggered by: ${key} = ${nsfwCategories[key]}`);
      return true;
    }
  }
  for (const key in goreCategories) {
    if (nsfwFlags.includes(goreCategories[key])) {
      console.log(`NSFW flag triggered by: ${key} = ${goreCategories[key]}`);
      return true;
    }
  }
  return false;
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
    
    // --- NSFW Moderation with JigsawStack ---
    let isNSFW = false;
    try {
        if (!process.env.JIGSAWSTACK_API_KEY) {
            console.warn("JIGSAWSTACK_API_KEY environment variable not found. Skipping NSFW check.");
        } else {
            const jigsaw = new JigsawStack({ apiKey: process.env.JIGSAWSTACK_API_KEY });
            const moderationResponse = await jigsaw.image.moderate({ image: file });
            if (moderationResponse.success) {
                isNSFW = isModerationResultNSFW(moderationResponse.moderation);
            } else {
                console.warn("JigsawStack moderation failed, proceeding without NSFW flag.", moderationResponse);
            }
        }
    } catch (moderationError) {
        console.error("Error during JigsawStack moderation:", moderationError);
        // Don't block upload if moderation fails, just proceed without the flag
    }
    // --- End NSFW Moderation ---

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

    res.status(200).json({ url: fileUrl, isNSFW: isNSFW });

  } catch (err) {
    console.error("Error in /api/uploadToCatbox:", err);
    res.status(500).json({ error: "Upload failed due to a server error.", details: err.message });
  }
}