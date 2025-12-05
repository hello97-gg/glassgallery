

export default async function handler(req, res) {
  const { url, filename } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch from external URL: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    // Sanitize filename to prevent header injection issues
    const safeFilename = (filename || 'image.jpg').replace(/["\\]/g, '');
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.status(200).send(buffer);
  } catch (error) {
    console.error("Proxy Download Error:", error);
    res.status(500).json({ error: "Download failed" });
  }
}
