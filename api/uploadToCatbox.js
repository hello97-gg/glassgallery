// This is a serverless function that acts as a proxy to the Catbox API.
// It's designed to run in an environment like Vercel or Netlify.
// NOTE: This file assumes 'node-fetch' and 'form-data' are available in the
// execution environment. You may need to add them to your project's dependencies.
import fetch from "node-fetch";
import FormData from "form-data";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { file, name } = req.body; // Expecting Base64 string and file name

    if (!file || !name) {
      return res.status(400).json({ error: "Missing 'file' or 'name' in request body." });
    }

    // Convert the Base64 string from the client into a Buffer.
    const buffer = Buffer.from(file, "base64");

    // Create a new FormData instance to build the multipart request.
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    // Append the file buffer, providing the original filename. Catbox needs this.
    formData.append("fileToUpload", buffer, name);

    // Make the proxied request to the actual Catbox API.
    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
      // The 'form-data' library automatically sets the correct multipart headers.
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Catbox API Error:", errorText);
        throw new Error(`Catbox API responded with status ${response.status}: ${errorText}`);
    }

    const fileUrl = await response.text();

    // Check if the response is a valid URL
    if (!fileUrl.startsWith('http')) {
        throw new Error(`Received an invalid response from Catbox: ${fileUrl}`);
    }

    // Send the successful URL back to the frontend.
    res.status(200).json({ url: fileUrl });

  } catch (err) {
    console.error("Error in /api/uploadToCatbox:", err);
    res.status(500).json({ error: "Upload failed due to a server error.", details: err.message });
  }
}
