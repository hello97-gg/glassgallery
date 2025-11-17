import React from 'react';
import type { User } from 'firebase/auth';
import type { ImageMeta, ProfileUser } from '../types';

interface ImageCardProps {
  image: ImageMeta;
  user: User | null;
  onClick: () => void;
  onViewProfile: (user: ProfileUser) => void;
  className?: string;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, user, onClick, onViewProfile, className = '' }) => {
  const combinedClassName = `group relative bg-surface rounded-xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.03] mb-4 md:mb-6 break-inside-avoid ${className}`;

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the main card's onClick from firing
    onViewProfile({
      uploaderUid: image.uploaderUid,
      uploaderName: image.uploaderName,
      uploaderPhotoURL: image.uploaderPhotoURL,
    });
  };

  return (
    <div
      className={combinedClassName}
      onClick={onClick}
    >
      <img
        src={image.imageUrl}
        alt="User upload"
        className="w-full h-auto object-cover transition-all duration-300"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
        <button onClick={handleProfileClick} className="flex items-center space-x-2 group/profile hover:scale-105 transition-transform">
            <img 
                src={image.uploaderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${image.uploaderName}&backgroundColor=ff5722,e91e63,9c27b0,673ab7,3f51b5,2196f3,03a9f4,00bcd4,009688,4caf50,8bc34a,cddc39,ffeb3b,ffc107,ff9800`}
                className="w-6 h-6 rounded-full border-2 border-surface"
                alt={image.uploaderName}
            />
            <p className="text-white text-xs font-semibold group-hover/profile:underline">{image.uploaderName}</p>
        </button>
      </div>
    </div>
  );
};

export default ImageCard;
