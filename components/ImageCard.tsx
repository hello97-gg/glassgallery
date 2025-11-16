
import React from 'react';
import type { ImageMeta } from '../types';

interface ImageCardProps {
  image: ImageMeta;
  onClick: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onClick }) => {
  return (
    <div
      className="group relative aspect-square bg-gray-800 rounded-2xl overflow-hidden cursor-pointer shadow-lg transition-all duration-300 hover:shadow-purple-500/40 hover:scale-105"
      onClick={onClick}
    >
      <img
        src={image.imageUrl}
        alt="User upload"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <div className="text-white text-sm">
            <p className="font-bold truncate">{image.license}</p>
            <p className="text-xs text-gray-300">by {image.uploaderName}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;
