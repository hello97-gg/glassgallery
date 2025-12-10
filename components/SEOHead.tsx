
import React, { useEffect } from 'react';

// Default Glass Gallery Logo - Uses the static file for better caching/performance
export const DEFAULT_FAVICON = '/favicon.svg';

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

    // 7. Structured Data (JSON-LD) - Critical for Google Images & SEO
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
    }

    const baseSchema = {
        "@context": "https://schema.org",
        "url": url || "https://glassgallery.vercel.app",
    };

    let schema: any = { ...baseSchema };

    if (type === 'article' && imageUrl) {
        // ImageObject schema for image details
        schema = {
            ...baseSchema,
            "@type": "ImageObject",
            "contentUrl": imageUrl,
            "license": "https://creativecommons.org/licenses/by/4.0/",
            "name": title,
            "description": description,
            "thumbnail": imageUrl,
            "author": {
                 "@type": "Organization",
                 "name": "Glass Gallery User"
            }
        };
    } else if (type === 'profile') {
        // Profile schema
        schema = {
             ...baseSchema,
             "@type": "ProfilePage",
             "mainEntity": {
                 "@type": "Person",
                 "name": title.replace("'s Profile", ""),
                 "image": imageUrl
             }
        };
    } else {
        // WebSite schema for homepage with search box
        schema = {
            ...baseSchema,
            "@type": "WebSite",
            "name": "Glass Gallery",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://glassgallery.vercel.app/?search={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        };
    }
    
    script.textContent = JSON.stringify(schema);

    // Cleanup: Reset title when component unmounts
    return () => {
      document.title = 'Glass Gallery';
    };
  }, [title, description, imageUrl, url, type, favicon]);

  return null;
};

export default SEOHead;
