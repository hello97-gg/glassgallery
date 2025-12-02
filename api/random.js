
import fetch from "node-fetch";

export default async function handler(req, res) {
  // enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { category, title, limit = 1 } = req.query;
  const count = Math.min(Math.max(parseInt(limit), 1), 20); // Cap limit between 1 and 20

  // Hardcoded credentials (same as share.js)
  const projectId = "primn-f0fa8";
  const apiKey = "AIzaSyBxdzcKYNEywQhK8MpdPpJwV17Ahux0NJQ";
  
  // We fetch a pool of recent images to filter and randomize from.
  // Note: For a production app with thousands of images, you would want a more specific query
  // or a dedicated search service like Algolia. For now, fetching the recent 200 is performant enough.
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: "images" }],
      orderBy: [{ field: { fieldPath: "uploadedAt" }, direction: "DESCENDING" }],
      limit: 200
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(queryBody),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`Firestore API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse Firestore documents into clean objects
    let images = (data.map ? data : []).map(doc => {
        if (!doc.document) return null;
        const fields = doc.document.fields;
        
        // Extract flags/tags array
        const flagsArray = fields.flags?.arrayValue?.values?.map(v => v.stringValue) || [];
        
        const imageUrl = fields.imageUrl?.stringValue || null;

        return {
            id: doc.document.name.split('/').pop(),
            imageUrl: imageUrl,
            url: imageUrl, // Alias for compatibility with clients expecting 'url'
            title: fields.title?.stringValue || null,
            description: fields.description?.stringValue || null,
            uploaderName: fields.uploaderName?.stringValue || 'Anonymous',
            tags: flagsArray,
            license: fields.license?.stringValue || 'Unknown',
            createdAt: fields.uploadedAt?.timestampValue || null
        };
    }).filter(img => img !== null && img.imageUrl); // Ensure valid images

    // --- Filtering Logic (In-Memory) ---
    
    // 1. Filter by Category (Tag)
    if (category) {
        const lowerCategory = category.toLowerCase();
        images = images.filter(img => 
            img.tags.some(tag => tag.toLowerCase().includes(lowerCategory))
        );
    }

    // 2. Filter by Title (Partial Search)
    if (title) {
        const lowerTitle = title.toLowerCase();
        images = images.filter(img => 
            (img.title && img.title.toLowerCase().includes(lowerTitle))
        );
    }

    // 3. Shuffle (Fisher-Yates Algorithm)
    for (let i = images.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [images[i], images[j]] = [images[j], images[i]];
    }

    // 4. Apply Limit
    const result = images.slice(0, count);

    res.status(200).json({
        success: true,
        count: result.length,
        filter: { category: category || 'all', title: title || 'any' },
        data: result
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch images." });
  }
}
