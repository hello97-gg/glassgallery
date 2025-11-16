
import React from 'react';
import type { ImageMeta } from '../types';

interface ImageCardProps {
  image: ImageMeta;
  onClick: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onClick }) => {
  return (
    <div
      className="group relative bg-surface rounded-lg overflow-hidden cursor-pointer shadow-lg transition-all duration-300 hover:shadow-lg hover:shadow-black/50 mb-4 md:mb-6 break-inside-avoid"
      onClick={onClick}
    >
      <img
        src={image.imageUrl}
        alt="User upload"
        className="w-full h-auto object-cover transition-transform duration-300"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <div className="text-white text-sm">
            <p className="font-bold truncate">{image.license}</p>
            <p className="text-xs text-text-muted">by {image.uploaderName}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;