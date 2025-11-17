import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import type { ImageMeta, ProfileUser } from '../types';

interface ImageCardProps {
  image: ImageMeta;
  user: User | null;
  onClick: () => void;
  onViewProfile: (user: ProfileUser) => void;
  onLikeToggle: (image: ImageMeta) => void;
  className?: string;
}

const HeartIconSolid = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
);
const HeartIconOutline = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);


const ImageCard: React.FC<ImageCardProps> = ({ image, user, onClick, onViewProfile, onLikeToggle, className = '' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  const combinedClassName = `group relative bg-surface rounded-xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.03] mb-4 md:mb-6 break-inside-avoid min-h-[150px] ${className}`;
  const hasLiked = user && image.likedBy?.includes(user.uid);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the main card's onClick from firing
    onViewProfile({
      uploaderUid: image.uploaderUid,
      uploaderName: image.uploaderName,
      uploaderPhotoURL: image.uploaderPhotoURL,
    });
  };
  
  const handleLikeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onLikeToggle(image);
  };

  return (
    <div
      className={combinedClassName}
      onClick={onClick}
    >
      <img
        src={image.imageUrl}
        alt="User upload"
        className={`w-full h-auto object-cover transition-opacity duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3">
        <button onClick={handleProfileClick} className="flex items-center space-x-2 group/profile hover:scale-105 transition-transform z-10">
            <img 
                src={image.uploaderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${image.uploaderName}&backgroundColor=ff5722,e91e63,9c27b0,673ab7,3f51b5,2196f3,03a9f4,00bcd4,009688,4caf50,8bc34a,cddc39,ffeb3b,ffc107,ff9800`}
                className="w-6 h-6 rounded-full border-2 border-surface"
                alt={image.uploaderName}
            />
            <p className="text-white text-xs font-semibold group-hover/profile:underline">{image.uploaderName}</p>
        </button>
        <button onClick={handleLikeClick} className="flex items-center space-x-1.5 text-white bg-black/20 backdrop-blur-sm rounded-full py-1 px-2.5 hover:text-accent hover:scale-105 transition-all z-10">
            {hasLiked ? <HeartIconSolid/> : <HeartIconOutline/>}
            <span className="text-xs font-semibold">{image.likeCount || 0}</span>
        </button>
      </div>
    </div>
  );
};

export default ImageCard;