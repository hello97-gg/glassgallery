
import React, { useState } from 'react';

const CodeBlock = ({ code, language }: { code: string, language: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-black/30 mt-4">
      <div className="flex justify-between items-center px-4 py-2 bg-surface/50 border-b border-border">
        <span className="text-xs font-mono text-secondary">{language}</span>
        <button onClick={handleCopy} className="text-xs text-secondary hover:text-primary transition-colors">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const ApiDocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-bold text-primary mb-4">Developer API</h1>
            <p className="text-lg text-secondary">
                Integrate Glass Gallery images into your own applications, websites, or creative projects.
                Our public API is free to use and requires no authentication for read-only access.
            </p>
        </div>

        {/* Endpoint Card */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="px-3 py-1 rounded-md bg-accent/20 text-accent font-bold text-sm">GET</span>
                <code className="text-primary font-mono text-lg break-all">https://glassgallery.vercel.app/api/random</code>
            </div>
            <p className="text-secondary mb-0">
                Fetches a random set of images from the gallery, optionally filtered by category or title.
            </p>
        </div>

        {/* Parameters */}
        <div className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Parameters</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="py-3 px-4 text-secondary font-medium text-sm">Name</th>
                            <th className="py-3 px-4 text-secondary font-medium text-sm">Type</th>
                            <th className="py-3 px-4 text-secondary font-medium text-sm">Default</th>
                            <th className="py-3 px-4 text-secondary font-medium text-sm">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                         <tr className="border-b border-border/50">
                            <td className="py-4 px-4 font-mono text-accent">category</td>
                            <td className="py-4 px-4 text-secondary text-sm">string</td>
                            <td className="py-4 px-4 text-secondary text-sm">-</td>
                            <td className="py-4 px-4 text-primary text-sm">Filter images by tag/category (e.g., "Nature", "Abstract").</td>
                        </tr>
                        <tr className="border-b border-border/50">
                            <td className="py-4 px-4 font-mono text-accent">title</td>
                            <td className="py-4 px-4 text-secondary text-sm">string</td>
                            <td className="py-4 px-4 text-secondary text-sm">-</td>
                            <td className="py-4 px-4 text-primary text-sm">Search for partial matches in image titles.</td>
                        </tr>
                        <tr>
                            <td className="py-4 px-4 font-mono text-accent">limit</td>
                            <td className="py-4 px-4 text-secondary text-sm">number</td>
                            <td className="py-4 px-4 text-secondary text-sm">1</td>
                            <td className="py-4 px-4 text-primary text-sm">Number of images to return. Min 1, Max 20.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* Examples */}
        <div className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Examples</h2>
            
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-primary mb-2">JavaScript (Fetch)</h3>
                <p className="text-secondary text-sm">Get 5 random images tagged 'Anime'.</p>
                <CodeBlock 
                    language="javascript" 
                    code={`fetch('https://glassgallery.vercel.app/api/random?category=Anime&limit=5')
  .then(response => response.json())
  .then(data => {
    if(data.success) {
      console.log(data.data); // Array of images
    }
  })
  .catch(console.error);`} 
                />
            </div>

            <div>
                <h3 className="text-lg font-semibold text-primary mb-2">cURL</h3>
                <CodeBlock 
                    language="bash" 
                    code={`curl "https://glassgallery.vercel.app/api/random?category=Nature&limit=1"`} 
                />
            </div>
        </div>

         {/* Response Format */}
         <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Response Structure</h2>
            <CodeBlock 
                language="json" 
                code={`{
  "success": true,
  "count": 1,
  "filter": {
    "category": "Nature",
    "title": "any"
  },
  "data": [
    {
      "id": "7Hk29...",
      "imageUrl": "https://files.catbox.moe/abc.jpg",
      "title": "Forest Morning",
      "description": "A shot taken in the woods...",
      "uploaderName": "Photographer123",
      "tags": ["Nature", "Forest", "Green"],
      "license": "CC0",
      "createdAt": "2024-03-20T10:00:00Z"
    }
  ]
}`} 
            />
        </div>
    </div>
  );
};

export default ApiDocsPage;
