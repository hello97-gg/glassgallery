import React from 'react';
import type { ImageMeta, ProfileUser } from '../types';
import ImageCard from './ImageCard';

interface ExplorePageProps {
  images: ImageMeta[];
  onImageClick: (image: ImageMeta) => void;
  onViewProfile: (user: ProfileUser) => void;
}

const ExplorePage: React.FC<ExplorePageProps> = ({ images, onImageClick, onViewProfile }) => {
  const imagesByFlag = images.reduce((acc, image) => {
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

  const sortedFlags = Object.keys(imagesByFlag).sort();

  if (sortedFlags.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-primary">Nothing to Explore Yet.</h2>
        <p className="text-secondary mt-2">Upload images with flags to start discovering new categories!</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {sortedFlags.map((flag) => (
        <section key={flag}>
          <h2 className="text-2xl font-bold mb-4 text-primary px-1">{flag}</h2>
          <div className="flex overflow-x-auto space-x-4 md:space-x-6 pb-4 -mx-1 px-1">
            {imagesByFlag[flag].map((image) => (
              <div key={image.id} className="flex-shrink-0 w-48 md:w-56 lg:w-64">
                {/* We remove the bottom margin from ImageCard's wrapper to avoid double spacing */}
                <ImageCard 
                    image={image} 
                    onClick={() => onImageClick(image)} 
                    onViewProfile={onViewProfile}
                    className="mb-0" 
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ExplorePage;
