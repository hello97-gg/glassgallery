import React, { useState } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);

  const isSensitive = image.isNSFW;
  const canViewSensitive = !!user;

  // Image should be blurred if it's sensitive AND (the user cannot view sensitive content OR is not hovering)
  const showBlur = isSensitive && (!canViewSensitive || !isHovered);

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={image.imageUrl}
        alt="User upload"
        className={`w-full h-auto object-cover transition-all duration-300 ${showBlur ? 'filter blur-xl scale-110' : ''}`}
        loading="lazy"
      />
      {showBlur && (
         <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/80" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.22 3.006-1.742 3.006H4.42c-1.522 0-2.492-1.672-1.742-3.006l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs font-semibold text-white mt-2">Sensitive Content</p>
            {!canViewSensitive && <p className="text-xs text-white/80 mt-1">Sign in to view</p>}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
        <button onClick={handleProfileClick} className="flex items-center space-x-2 group/profile hover:scale-105 transition-transform">
            <img 
                src={image.uploaderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${image.uploaderName}`}
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