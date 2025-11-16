import React from 'react';
import type { ImageMeta } from '../types';

interface ImageCardProps {
  image: ImageMeta;
  onClick: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onClick }) => {
  return (
    <div
      className="group relative bg-surface rounded-xl overflow-hidden cursor-pointer shadow-sm border border-transparent hover:border-border transition-all duration-300 hover:shadow-md hover:scale-[1.02] mb-4 md:mb-6 break-inside-avoid"
      onClick={onClick}
    >
      <img
        src={image.imageUrl}
        alt="User upload"
        className="w-full h-auto object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <div className="flex items-center space-x-2">
            <img 
                src={image.uploaderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${image.uploaderName}`}
                className="w-6 h-6 rounded-full border-2 border-surface"
                alt={image.uploaderName}
            />
            <p className="text-white text-xs font-semibold">{image.uploaderName}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;