import React from 'react';
import type { ImageMeta, ProfileUser } from '../types';
import ImageCard from './ImageCard';

interface ImageGridProps {
  images: ImageMeta[];
  onImageClick: (image: ImageMeta) => void;
  onViewProfile: (user: ProfileUser) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick, onViewProfile }) => {
  if (images.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block bg-surface text-secondary p-4 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <h2 className="text-2xl font-semibold text-primary">No images yet.</h2>
        <p className="text-secondary mt-2">Be the first to create something beautiful!</p>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 md:gap-6">
      {images.map((image) => (
        <ImageCard 
            key={image.id} 
            image={image} 
            onClick={() => onImageClick(image)} 
            onViewProfile={onViewProfile}
        />
      ))}
    </div>
  );
};

export default ImageGrid;