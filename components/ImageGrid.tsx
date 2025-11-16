
import React from 'react';
import type { ImageMeta } from '../types';
import ImageCard from './ImageCard';

interface ImageGridProps {
  images: ImageMeta[];
  onImageClick: (image: ImageMeta) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick }) => {
  if (images.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-gray-400">No images yet.</h2>
        <p className="text-gray-500 mt-2">Be the first to upload!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {images.map((image) => (
        <ImageCard key={image.id} image={image} onClick={() => onImageClick(image)} />
      ))}
    </div>
  );
};

export default ImageGrid;
