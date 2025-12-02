
import React, { useEffect } from 'react';

// Default Glass Gallery Logo (Box/Gallery Icon) - Peach Accent Color #f5c3b8
export const DEFAULT_FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f5c3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z'/%3E%3Cpath d='M15 13a3 3 0 11-6 0 3 3 0 016 0z'/%3E%3C/svg%3E`;

interface SEOHeadProps {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  favicon?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({ title, description, imageUrl, url, type = 'website', favicon }) => {
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

    // 6. Dynamic Favicon
    const activeFavicon = favicon || DEFAULT_FAVICON;
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    // Only update if changed to avoid flickering
    if (link.href !== activeFavicon) {
        link.href = activeFavicon;
    }

    // Cleanup: Reset title when component unmounts
    return () => {
      document.title = 'Glass Gallery';
      // We don't strictly reset the favicon on unmount to prevent rapid flickering during transitions,
      // as the next page will set its own favicon immediately.
    };
  }, [title, description, imageUrl, url, type, favicon]);

  return null;
};

export default SEOHead;
