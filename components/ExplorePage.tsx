import React, { useState, useMemo } from 'react';
import type { ImageMeta, ProfileUser } from '../types';
import ImageGrid from './ImageGrid';
import Button from './Button';

interface ExplorePageProps {
  images: ImageMeta[];
  onImageClick: (image: ImageMeta) => void;
  onViewProfile: (user: ProfileUser) => void;
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

const ExplorePage: React.FC<ExplorePageProps> = ({ images, onImageClick, onViewProfile }) => {
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);

  const imagesByFlag = useMemo(() => {
    return images.reduce((acc, image) => {
      // Ensure flags is an array before iterating
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

  if (sortedFlags.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-primary">Nothing to Explore Yet.</h2>
        <p className="text-secondary mt-2">Upload images with tags to start discovering new categories!</p>
      </div>
    );
  }

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
        <ImageGrid images={imagesByFlag[selectedFlag]} onImageClick={onImageClick} onViewProfile={onViewProfile} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-6 text-primary">Explore Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
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
