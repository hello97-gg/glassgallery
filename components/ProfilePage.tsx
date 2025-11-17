import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { ProfileUser, ImageMeta } from '../types';
import { getImagesByUploader, PAGE_SIZE } from '../services/firestoreService';
import ImageGrid from './ImageGrid';
import Spinner from './Spinner';
import Button from './Button';

// Throttle utility to limit how often a function can run
const throttle = (func: (...args: any[]) => void, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

interface ProfilePageProps {
  user: ProfileUser;
  loggedInUser: User | null;
  onBack: () => void;
  onImageClick: (image: ImageMeta) => void;
  onViewProfile: (user: ProfileUser) => void;
  onLikeToggle: (image: ImageMeta) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, loggedInUser, onBack, onImageClick, onViewProfile, onLikeToggle }) => {
  const [allImages, setAllImages] = useState<ImageMeta[]>([]);
  const [displayedImages, setDisplayedImages] = useState<ImageMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchUserImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { images: userImages } = await getImagesByUploader(user.uploaderUid);
      // Images are already sorted by date from Firestore, no need to shuffle on profile page.
      setAllImages(userImages);
      setDisplayedImages(userImages.slice(0, PAGE_SIZE));
      setCurrentIndex(PAGE_SIZE);
    } catch (error) {
      console.error("Failed to fetch user images:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user.uploaderUid]);

  useEffect(() => {
    fetchUserImages();
  }, [fetchUserImages]);

  const loadMoreUserImages = useCallback(() => {
    if (isLoading || allImages.length === 0) return;

    if (currentIndex < allImages.length) {
        const nextIndex = currentIndex + PAGE_SIZE;
        const newImages = allImages.slice(currentIndex, nextIndex);
        setDisplayedImages(prev => [...prev, ...newImages]);
        setCurrentIndex(nextIndex);
    } else {
        // Reached the end, loop back to the start in the same order.
        const newImages = allImages.slice(0, PAGE_SIZE);
        setDisplayedImages(prev => [...prev, ...newImages]);
        setCurrentIndex(PAGE_SIZE);
    }
  }, [currentIndex, allImages, isLoading]);

  useEffect(() => {
    const handleScroll = () => {
        const scrollThreshold = 800;
        const isAtBottom = window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - scrollThreshold;

        if (isAtBottom) {
            loadMoreUserImages();
        }
    };

    const throttledScrollHandler = throttle(handleScroll, 200);
    window.addEventListener('scroll', throttledScrollHandler);
    return () => window.removeEventListener('scroll', throttledScrollHandler);
  }, [loadMoreUserImages]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-center gap-6">
        <Button onClick={onBack} variant="secondary" size="sm" className="!p-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
        </Button>
        <div className="flex items-center gap-4">
            <img 
                src={user.uploaderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.uploaderName}&backgroundColor=ff5722,e91e63,9c27b0,673ab7,3f51b5,2196f3,03a9f4,00bcd4,009688,4caf50,8bc34a,cddc39,ffeb3b,ffc107,ff9800`}
                alt={user.uploaderName}
                className="w-16 h-16 rounded-full border-2 border-border"
            />
            <div>
                <h1 className="text-3xl font-bold text-primary">{user.uploaderName}</h1>
                <p className="text-md text-secondary">{allImages.length} uploads</p>
            </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner />
        </div>
      ) : (
        <ImageGrid user={loggedInUser} images={displayedImages} onImageClick={onImageClick} onViewProfile={onViewProfile} onLikeToggle={onLikeToggle} />
      )}
    </div>
  );
};

export default ProfilePage;