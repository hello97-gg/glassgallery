
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Configuration from your prompt
const R2_ACCOUNT_ID = "d8e8828f54e7dac7c17e397d1998f745";
const R2_BUCKET = "glassgallery";

// Initialize S3 Client for Cloudflare R2
const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

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
    
    // Check for Public Domain config immediately
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;
    if (!publicDomain) {
        throw new Error("Server Misconfiguration: R2_PUBLIC_DOMAIN environment variable is missing.");
    }

    let buffer = Buffer.from(file, "base64");
    
    // --- Image Compression Logic (Same as previous) ---
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const MAX_WIDTH = 1920;
    const ONE_MB = 1024 * 1024;

    // Compress if wider than 1920px or larger than 1MB
    if (metadata.width > MAX_WIDTH || buffer.length > ONE_MB) {
        console.log(`Compressing image: ${name}`);
        buffer = await image
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
    }
    
    // Determine content type from the actual buffer (safe)
    const processedMeta = await sharp(buffer).metadata();
    const contentType = `image/${processedMeta.format}`;
    const extension = processedMeta.format === 'jpeg' ? 'jpg' : processedMeta.format;
    
    // Generate a clean, unique filename
    const timestamp = Date.now();
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
    const uniqueFileName = `${timestamp}-${sanitizedName}.${extension}`;

    // Upload to R2
    await S3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: contentType,
    }));

    // Construct the public URL
    // publicDomain should be like "https://pub-xxxx.r2.dev" or "https://images.yourdomain.com"
    const domain = publicDomain.endsWith('/') ? publicDomain.slice(0, -1) : publicDomain;
    const fileUrl = `${domain}/${uniqueFileName}`;

    res.status(200).json({ url: fileUrl });

  } catch (err) {
    console.error("Error in /api/uploadToR2:", err);
    res.status(500).json({ error: "Upload failed.", details: err.message });
  }
}
