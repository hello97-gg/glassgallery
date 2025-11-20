
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.redirect('/');
  }

  // Firestore REST API URL to fetch document without client SDK
  // Using the project ID and API Key from your firebase config
  const projectId = "primn-f0fa8";
  const apiKey = "AIzaSyBxdzcKYNEywQhK8MpdPpJwV17Ahux0NJQ"; 
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/images/${id}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // If document doesn't exist or error, just redirect to home/app
    if (!response.ok || !data.fields) {
        return res.redirect(`/?image=${id}`);
    }

    const fields = data.fields;
    // Firestore REST API returns fields in a specific format: { stringValue: "..." }
    const imageUrl = fields.imageUrl?.stringValue || '';
    const title = fields.title?.stringValue || 'Glass Gallery Image';
    const uploaderName = fields.uploaderName?.stringValue || 'User';
    const description = fields.description?.stringValue || `Check out this amazing image uploaded by ${uploaderName} on Glass Gallery.`;

    // Construct the HTML with Open Graph tags for bots
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <!-- Primary Meta Tags -->
        <title>${title} | Glass Gallery</title>
        <meta name="title" content="${title} | Glass Gallery">
        <meta name="description" content="${description}">
        
        <!-- Open Graph / Facebook / Discord -->
        <meta property="og:type" content="article">
        <meta property="og:url" content="https://glassgallery.vercel.app/api/share?id=${id}">
        <meta property="og:title" content="${title} | Glass Gallery">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${imageUrl}">
        <meta property="og:site_name" content="Glass Gallery">
        
        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="https://glassgallery.vercel.app/api/share?id=${id}">
        <meta property="twitter:title" content="${title} | Glass Gallery">
        <meta property="twitter:description" content="${description}">
        <meta property="twitter:image" content="${imageUrl}">

        <!-- Redirect to the actual app for humans -->
        <script>
            // Preserve any other query params if needed, but mostly just go to the image
            window.location.href = "/?image=${id}";
        </script>
      </head>
      <body style="background-color: #181818; color: #e5e5e5; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
            <p>Loading image...</p>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    // Cache for 1 hour on edge, verify revalidation
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(html);

  } catch (error) {
    console.error("Metadata fetch error:", error);
    // Fallback: just send them to the app
    res.redirect(`/?image=${id}`);
  }
}
