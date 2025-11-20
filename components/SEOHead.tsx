
import React, { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
}

const SEOHead: React.FC<SEOHeadProps> = ({ title, description, imageUrl, url, type = 'website' }) => {
  useEffect(() => {
    // 1. Update Title
    document.title = `${title} | Glass Gallery`;

    // 2. Helper to update or create meta tags
    const setMeta = (name: string, content: string, isProperty = false) => {
      let element = document.querySelector(isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(isProperty ? 'property' : 'name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Standard Meta
    setMeta('description', description);

    // 4. Open Graph (Facebook, Discord, iMessage)
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', type, true);
    if (url) setMeta('og:url', url, true);
    if (imageUrl) setMeta('og:image', imageUrl, true);
    setMeta('og:site_name', 'Glass Gallery', true);

    // 5. Twitter Cards
    setMeta('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    if (imageUrl) setMeta('twitter:image', imageUrl);

    // Cleanup: Reset title when component unmounts (optional, but good for SPA)
    return () => {
      document.title = 'Glass Gallery';
    };
  }, [title, description, imageUrl, url, type]);

  return null;
};

export default SEOHead;
