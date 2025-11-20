
import React, { useState, useMemo, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { ImageMeta, ProfileUser } from '../types';
import ImageGrid from './ImageGrid';
import Button from './Button';

interface ExplorePageProps {
  images: ImageMeta[];
  user: User | null;
  onImageClick: (image: ImageMeta) => void;
  onViewProfile: (user: ProfileUser) => void;
  onLikeToggle: (image: ImageMeta) => void;
  initialSearchTerm?: string;
}

const CategoryCard: React.FC<{ flag: string, image: ImageMeta, onClick: () => void }> = ({ flag, image, onClick }) => {
  return (
    <div onClick={onClick} className="relative aspect-1 cursor-pointer group bg-surface rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-accent/20 hover:-translate-y-1">
      <img src={image.imageUrl} alt={flag} className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-start p-4">
        <h2 className="text-white text-xl font-bold tracking-tight">{flag}</h2>
      </div>
    </div>
  );
};

const ExplorePage: React.FC<ExplorePageProps> = ({ images, user, onImageClick, onViewProfile, onLikeToggle, initialSearchTerm = '' }) => {
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchTerm);

  useEffect(() => {
    if (initialSearchTerm) {
        setSearchQuery(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Aggregate images by tags (flags)
  const imagesByFlag = useMemo(() => {
    return images.reduce((acc, image) => {
      if (Array.isArray(image.flags)) {
        image.flags.forEach(flag => {
          if (!acc[flag]) {
            acc[flag] = [];
          }
          acc[flag].push(image);
        });
      }
      return acc;
    }, {} as Record<string, ImageMeta[]>);
  }, [images]);

  const sortedFlags = useMemo(() => Object.keys(imagesByFlag).sort(), [imagesByFlag]);

  // Search Logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const lowerQuery = searchQuery.toLowerCase();
    return images.filter(img => {
        const titleMatch = img.title?.toLowerCase().includes(lowerQuery);
        const descMatch = img.description?.toLowerCase().includes(lowerQuery);
        const flagMatch = img.flags?.some(f => f.toLowerCase().includes(lowerQuery));
        const uploaderMatch = img.uploaderName.toLowerCase().includes(lowerQuery);
        const locationMatch = img.location?.toLowerCase().includes(lowerQuery);
        
        return titleMatch || descMatch || flagMatch || uploaderMatch || locationMatch;
    });
  }, [images, searchQuery]);


  // --- RENDER HELPERS ---

  // 1. Search Results View
  if (searchQuery.trim()) {
      return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-3xl font-bold text-primary">Search Results</h1>
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input 
                        type="text"
                        placeholder="Search tags, users, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="block w-full pl-10 pr-16 py-2 border border-border rounded-full leading-5 bg-surface text-primary placeholder-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm transition-all shadow-sm"
                    />
                     {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-12 pr-2 flex items-center text-secondary hover:text-primary">
                           &times;
                        </button>
                    )}
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent text-surface tracking-wider">
                            BETA
                        </span>
                    </div>
                </div>
            </div>
            
            {searchResults.length > 0 ? (
                <ImageGrid images={searchResults} user={user} onImageClick={onImageClick} onViewProfile={onViewProfile} onLikeToggle={onLikeToggle} />
            ) : (
                <div className="text-center py-16 bg-surface/30 rounded-2xl border border-border border-dashed">
                    <svg className="mx-auto h-12 w-12 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-primary">No matches found</h3>
                    <p className="mt-1 text-sm text-secondary">Try searching for something else like "Tokyo" or "Abstract".</p>
                    <Button onClick={() => setSearchQuery('')} variant="secondary" size="sm" className="mt-4">Clear Search</Button>
                </div>
            )}
        </div>
      );
  }

  // 2. Empty State (No images in DB)
  if (sortedFlags.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-primary">Nothing to Explore Yet.</h2>
        <p className="text-secondary mt-2">Upload images with tags to start discovering new categories!</p>
      </div>
    );
  }

  // 3. Selected Category View
  if (selectedFlag) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center gap-4">
           <Button onClick={() => setSelectedFlag(null)} variant="secondary" size="sm" className="!p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            </Button>
            <h1 className="text-3xl font-bold text-primary">{selectedFlag}</h1>
        </div>
        <ImageGrid images={imagesByFlag[selectedFlag]} user={user} onImageClick={onImageClick} onViewProfile={onViewProfile} onLikeToggle={onLikeToggle} />
      </div>
    );
  }

  // 4. Default Categories List View
  return (
    <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold text-primary">Explore</h1>
            
            {/* Search Bar */}
            <div className="relative w-full md:w-96 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-secondary group-focus-within:text-accent transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input 
                    type="text"
                    placeholder="Search images, tags, users, locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-16 py-2 border border-border rounded-full leading-5 bg-surface text-primary placeholder-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm transition-all shadow-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent text-surface tracking-wider">
                        BETA
                    </span>
                </div>
            </div>
        </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
        {sortedFlags.map((flag) => {
          const categoryImages = imagesByFlag[flag];
          if (!categoryImages || categoryImages.length === 0) return null;
          
          const representativeImage = categoryImages[Math.floor(Math.random() * categoryImages.length)];
          if (!representativeImage) return null;

          return (
            <CategoryCard 
              key={flag} 
              flag={flag} 
              image={representativeImage} 
              onClick={() => setSelectedFlag(flag)} 
            />
          );
        })}
      </div>
    </div>
  );
};

export default ExplorePage;
