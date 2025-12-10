
import fetch from "node-fetch";

export default async function handler(req, res) {
  const projectId = "primn-f0fa8";
  const apiKey = "AIzaSyBxdzcKYNEywQhK8MpdPpJwV17Ahux0NJQ";
  const baseUrl = "https://glassgallery.vercel.app";

  // Static routes for your application
  const staticUrls = [
    { loc: baseUrl, changefreq: "daily", priority: "1.0" },
    { loc: `${baseUrl}/?view=explore`, changefreq: "daily", priority: "0.8" },
    { loc: `${baseUrl}/?view=api`, changefreq: "monthly", priority: "0.5" },
  ];

  let dynamicUrls = [];

  try {
    // Fetch the 1000 most recent images from Firestore for indexing
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "images" }],
        orderBy: [{ field: { fieldPath: "uploadedAt" }, direction: "DESCENDING" }],
        limit: 1000,
        select: {
           fields: [{ fieldPath: "uploadedAt" }] // Optimize payload: only fetch ID and Date
        }
      }
    };

    const response = await fetch(firestoreUrl, {
      method: 'POST',
      body: JSON.stringify(queryBody),
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      const documents = data.map ? data : [];
      
      dynamicUrls = documents
        .filter(doc => doc.document)
        .map(doc => {
          const id = doc.document.name.split('/').pop();
          const timestamp = doc.document.fields?.uploadedAt?.timestampValue;
          return {
            loc: `${baseUrl}/?image=${id}`,
            lastmod: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
            changefreq: "weekly",
            priority: "0.7"
          };
        });
    }
  } catch (error) {
    console.error("Sitemap generation error:", error);
    // Even if DB fails, return the static URLs so the sitemap is valid
  }

  const allUrls = [...staticUrls, ...dynamicUrls];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allUrls
    .map((url) => {
      return `
  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
    })
    .join("")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  // Cache response for 1 hour to prevent hitting Firestore limits
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
  res.status(200).send(sitemap);
}
