
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { ProfileUser, ImageMeta } from '../types';
import { getImagesByUploader, PAGE_SIZE, getUserProfile } from '../services/firestoreService';
import ImageGrid from './ImageGrid';
import Spinner from './Spinner';
import Button from './Button';
import EditProfileModal from './EditProfileModal';

// Throttle utility
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
  onLocationClick?: (location: string) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, loggedInUser, onBack, onImageClick, onViewProfile, onLikeToggle, onLocationClick }) => {
  const [profileData, setProfileData] = useState<ProfileUser>(user);
  const [allImages, setAllImages] = useState<ImageMeta[]>([]);
  const [displayedImages, setDisplayedImages] = useState<ImageMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 1. Sync state with props immediately if user changes (Defensive programming)
  useEffect(() => {
    if (user.uploaderUid !== profileData.uploaderUid) {
        setProfileData(user);
    }
  }, [user, profileData.uploaderUid]);

  // 2. Fetch full profile data from 'users' collection
  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
        // Ensure we show the latest user basic info while loading extended info
        if (user.uploaderUid !== profileData.uploaderUid) {
            setProfileData(user);
        }

        const fullProfile = await getUserProfile(user.uploaderUid);
        if (mounted && fullProfile) {
            setProfileData(prev => ({ ...prev, ...fullProfile }));
        }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [user.uploaderUid]);

  // 3. Fetch images
  const fetchUserImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { images: userImages } = await getImagesByUploader(user.uploaderUid);
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
        // Loop
        const newImages = allImages.slice(0, PAGE_SIZE);
        setDisplayedImages(prev => [...prev, ...newImages]);
        setCurrentIndex(PAGE_SIZE);
    }
  }, [currentIndex, allImages, isLoading]);

  useEffect(() => {
    const handleScroll = () => {
        const scrollThreshold = 800;
        const isAtBottom = window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - scrollThreshold;
        if (isAtBottom) loadMoreUserImages();
    };
    const throttledScrollHandler = throttle(handleScroll, 200);
    window.addEventListener('scroll', throttledScrollHandler);
    return () => window.removeEventListener('scroll', throttledScrollHandler);
  }, [loadMoreUserImages]);

  // Wrapper to handle local state update for likes, as the prop only updates App state
  const handleLocalLikeToggle = (image: ImageMeta) => {
      if (!loggedInUser) {
          onLikeToggle(image); // Will trigger login modal from App
          return;
      }

      // Optimistic update logic
      const oldLikedBy = image.likedBy || [];
      const hasLiked = oldLikedBy.includes(loggedInUser.uid);
      const newLikedBy = hasLiked
        ? oldLikedBy.filter(id => id !== loggedInUser.uid)
        : [...oldLikedBy, loggedInUser.uid];
      
      const updatedImage = { 
          ...image, 
          likedBy: newLikedBy, 
          likeCount: newLikedBy.length 
      };

      // Update local state
      const updater = (prev: ImageMeta[]) => prev.map(img => img.id === image.id ? updatedImage : img);
      setAllImages(updater);
      setDisplayedImages(updater);

      // Call parent to handle Firestore and App-wide state
      onLikeToggle(image);
  };

  const totalLikes = useMemo(() => allImages.reduce((sum, img) => sum + (img.likeCount || 0), 0), [allImages]);
  const totalDownloads = useMemo(() => allImages.reduce((sum, img) => sum + (img.downloadCount || 0), 0), [allImages]);
  
  // Secure check: ensure we only show edit controls if logged in user matches the currently displayed profile data
  const isOwner = loggedInUser?.uid === profileData.uploaderUid;

  return (
    <div className="animate-fade-in pb-10">
      {/* Header / Banner */}
      <div className="relative mb-16 md:mb-20">
        <div 
            className="w-full h-48 md:h-64 bg-surface rounded-b-2xl bg-cover bg-center relative overflow-hidden"
            style={{ backgroundImage: profileData.backgroundImageURL ? `url(${profileData.backgroundImageURL})` : 'none' }}
        >
            {!profileData.backgroundImageURL && <div className="absolute inset-0 bg-gradient-to-r from-surface via-border to-surface opacity-50" />}
            
            {/* Back Button overlay on banner */}
            <div className="absolute top-4 left-4 z-10">
                 <button onClick={onBack} className="bg-black/40 backdrop-blur-sm p-2 rounded-full text-white hover:bg-black/60 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                 </button>
            </div>
            {isOwner && (
                <div className="absolute bottom-4 right-4 z-10">
                    <Button onClick={() => setIsEditModalOpen(true)} variant="secondary" size="sm" className="!bg-black/50 !text-white backdrop-blur-sm border-none hover:!bg-black/70">
                        Edit Profile
                    </Button>
                </div>
            )}
        </div>

        {/* Profile Info Container - Floating overlap */}
        <div className="absolute -bottom-12 md:-bottom-16 left-6 md:left-10 flex items-end gap-4">
            <img 
                src={profileData.uploaderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profileData.uploaderName}`}
                alt={profileData.uploaderName}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background bg-surface object-cover shadow-lg"
            />
            <div className="mb-2 hidden md:block">
                <h1 className="text-3xl font-bold text-primary">{profileData.uploaderName}</h1>
            </div>
        </div>
      </div>

      {/* Mobile Name / Bio Section */}
      <div className="px-6 md:px-10 mt-4">
         <div className="md:hidden mb-2">
             <h1 className="text-2xl font-bold text-primary">{profileData.uploaderName}</h1>
         </div>

         {/* Bio & Meta */}
         <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
             <div className="max-w-2xl">
                 {profileData.bio && <p className="text-secondary text-sm md:text-base whitespace-pre-wrap mb-3">{profileData.bio}</p>}
                 
                 <div className="flex flex-wrap gap-4 text-sm text-secondary">
                     {profileData.location && (
                         <button 
                            onClick={() => onLocationClick && onLocationClick(profileData.location!)}
                            className={`flex items-center gap-1.5 ${onLocationClick ? 'hover:text-accent hover:underline cursor-pointer' : ''}`}
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             {profileData.location}
                         </button>
                     )}
                     {profileData.email && (
                         <div className="flex items-center gap-1.5">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                             <a href={`mailto:${profileData.email}`} className="hover:text-primary">{profileData.email}</a>
                         </div>
                     )}
                 </div>
             </div>

             {/* Stats */}
             <div className="flex gap-3">
                 <div className="bg-surface border border-border px-3 py-1.5 rounded-lg text-center">
                     <span className="block text-lg font-bold text-primary leading-none">{allImages.length}</span>
                     <span className="text-xs text-secondary">Uploads</span>
                 </div>
                 <div className="bg-surface border border-border px-3 py-1.5 rounded-lg text-center">
                     <span className="block text-lg font-bold text-primary leading-none">{totalLikes}</span>
                     <span className="text-xs text-secondary">Likes</span>
                 </div>
                 <div className="bg-surface border border-border px-3 py-1.5 rounded-lg text-center">
                     <span className="block text-lg font-bold text-primary leading-none">{totalDownloads}</span>
                     <span className="text-xs text-secondary">Downloads</span>
                 </div>
             </div>
         </div>
      </div>

      <div className="border-t border-border my-6 mx-6 md:mx-10"></div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="px-4 md:px-8">
             <ImageGrid user={loggedInUser} images={displayedImages} onImageClick={onImageClick} onViewProfile={onViewProfile} onLikeToggle={handleLocalLikeToggle} />
        </div>
      )}

      {isEditModalOpen && (
        <EditProfileModal 
            user={profileData} 
            onClose={() => setIsEditModalOpen(false)} 
            onUpdateSuccess={(updated) => setProfileData(updated)} 
        />
      )}
    </div>
  );
};

export default ProfilePage;
