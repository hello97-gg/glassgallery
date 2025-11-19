
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Fix: Use Firebase v8 compatibility User type.
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { subscribeToImages, deleteImageFromFirestore, getNotificationsForUser, toggleImageLike, PAGE_SIZE } from './services/firestoreService';
import type { ImageMeta, ProfileUser, Notification } from './types';

import Sidebar from './components/Header';
import BottomNav from './components/BottomNav';
import LoginModal from './components/LoginScreen';
import ImageGrid from './components/ImageGrid';
import UploadModal from './components/UploadModal';
import ImageDetailModal from './components/ImageDetailModal';
import ExplorePage from './components/ExplorePage';
import ProfilePage from './components/ProfilePage';
import { MobileNotificationsModal } from './components/Notifications';
import FullScreenDropzone from './components/FullScreenDropzone';

// --- Skeleton Components for Initial Load ---
const SKELETON_HEIGHTS = ['min-h-[200px]', 'min-h-[280px]', 'min-h-[360px]', 'min-h-[240px]'];

const SkeletonCard: React.FC = () => {
  const heightClass = SKELETON_HEIGHTS[Math.floor(Math.random() * SKELETON_HEIGHTS.length)];
  
  return (
    <div 
      className={`
        bg-surface rounded-xl overflow-hidden mb-4 md:mb-6 break-inside-avoid
        ${heightClass}
        relative
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-surface via-border to-surface bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
};

const SkeletonGrid: React.FC = () => {
  return (
    <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2 md:gap-4 animate-fade-in">
      {Array.from({ length: 15 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

// Smart sorting algorithm to prioritize new and undiscovered content
const smartSortImages = (images: ImageMeta[]): ImageMeta[] => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  // Extend ImageMeta with a temporary sortScore for sorting
  type ImageWithScore = ImageMeta & { sortScore?: number };

  return images
    .map((image: ImageMeta): ImageWithScore => {
      const uploadedAt = image.uploadedAt.toDate().getTime();
      const age = now - uploadedAt;

      // 1. Recency Score (higher is better)
      let recencyScore = 0;
      if (age < oneDay) {
        recencyScore = 100; // High score for images uploaded in the last 24 hours
      } else if (age < oneWeek) {
        recencyScore = 50;  // Medium score for images within the week
      } else {
        recencyScore = Math.max(10, 100 - (age / oneWeek)); // Gradually decreasing score for older images
      }

      // 2. Discovery Score (higher is better for less popular images)
      const likeCount = image.likeCount || 0;
      const discoveryScore = 1 / (likeCount + 1); // Ranges from 1 (for 0 likes) down to near 0

      // 3. Randomness to keep the feed from being static
      const randomFactor = Math.random();

      // Combine scores with weights to determine final sort order
      // Recency is heavily weighted, followed by a boost for discovery, and a touch of randomness.
      const finalScore = 
        (recencyScore * 0.7) +   // 70% weight for recency
        (discoveryScore * 20) +  // A significant boost for undiscovered images
        (randomFactor * 10);     // A small random factor

      return { ...image, sortScore: finalScore };
    })
    .sort((a, b) => (b.sortScore ?? 0) - (a.sortScore ?? 0)) // Sort descending by score
    .map(({ sortScore, ...rest }) => rest); // Remove the temporary score property
};


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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // State for image handling
  const [allImages, setAllImages] = useState<ImageMeta[]>([]);
  const [displayedImages, setDisplayedImages] = useState<ImageMeta[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedImage, setSelectedImage] = useState<ImageMeta | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isNotificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  
  const [activeView, setActiveView] = useState<'home' | 'explore' | 'profile' | 'notifications'>('home');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [lastView, setLastView] = useState<'home' | 'explore'>('home');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // State for full-screen drag and drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const dragCounter = useRef(0);


  useEffect(() => {
    // Fix: Use v8 compat syntax for onAuthStateChanged.
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      // Close login modal if user signs in successfully
      if (currentUser) {
        setLoginModalOpen(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
        const unsubscribeNotifications = getNotificationsForUser(user.uid, setNotifications);
        return () => unsubscribeNotifications();
    } else {
        setNotifications([]);
    }
  }, [user]);

  // --- Real-time Image Subscription ---
  useEffect(() => {
    let unsubscribe: () => void;

    if (activeView === 'home' || activeView === 'explore') {
        setImagesLoading(true);
        
        unsubscribe = subscribeToImages((fetchedImages) => {
            setAllImages((prevImages) => {
                 // 1. First load: Sort intelligently
                 if (prevImages.length === 0) {
                     const sorted = smartSortImages(fetchedImages);
                     setDisplayedImages(sorted.slice(0, PAGE_SIZE));
                     setCurrentIndex(PAGE_SIZE);
                     setImagesLoading(false);
                     return sorted;
                 }
                 
                 // 2. Subsequent updates (Real-time): Preserve order, update data, prepend new
                 const newMap = new Map(fetchedImages.map(i => [i.id, i]));
                 
                 // Update existing images in list, remove deleted ones
                 const updatedExisting = prevImages
                    .filter(img => newMap.has(img.id))
                    .map(img => newMap.get(img.id)!);
                 
                 // Identify brand new uploads
                 const currentIds = new Set(prevImages.map(i => i.id));
                 const newUploads = fetchedImages.filter(i => !currentIds.has(i.id));
                 
                 // Merge: New uploads at top + updated existing list
                 const finalImages = [...newUploads, ...updatedExisting];
                 
                 // Sync displayed images with new data
                 setDisplayedImages(prevDisplayed => {
                    return prevDisplayed
                        .filter(d => newMap.has(d.id)) // Remove deleted
                        .map(d => newMap.get(d.id)!); // Update data (counts etc)
                 });

                 setImagesLoading(false);
                 return finalImages;
            });
        });
    }
    
    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [activeView]);

  // Sync selectedImage with allImages updates to show real-time counts in modal if open
  useEffect(() => {
    if (selectedImage && allImages.length > 0) {
        const updated = allImages.find(img => img.id === selectedImage.id);
        if (updated && updated !== selectedImage) {
            setSelectedImage(updated);
        } else if (!updated) {
             // Image was deleted remotely
             setSelectedImage(null);
        }
    }
  }, [allImages, selectedImage]);

  const loadMoreImages = useCallback(() => {
    if (imagesLoading || allImages.length === 0) return;

    if (currentIndex < allImages.length) {
        const nextIndex = currentIndex + PAGE_SIZE;
        const newImages = allImages.slice(currentIndex, nextIndex);
        setDisplayedImages(prev => [...prev, ...newImages]);
        setCurrentIndex(nextIndex);
    } else {
        // Reached the end, re-sort and append to create an infinite loop
        // For infinite loop, we might lose the "real-time-ness" of specific items if we clone them.
        // Simpler to just stop or loop the sorted list again.
        const newImages = allImages.slice(0, PAGE_SIZE);
        setDisplayedImages(prev => [...prev, ...newImages]);
        setCurrentIndex(PAGE_SIZE);
    }
  }, [currentIndex, allImages, imagesLoading]);

  useEffect(() => {
    const handleScroll = () => {
      if (activeView === 'home') {
          const scrollThreshold = 800; // Pixels from bottom, increased for smoother triggering
          const isAtBottom = window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - scrollThreshold;
          
          if (isAtBottom) {
            loadMoreImages();
          }
      }
    };
    
    const throttledScrollHandler = throttle(handleScroll, 200);

    window.addEventListener('scroll', throttledScrollHandler);
    return () => window.removeEventListener('scroll', throttledScrollHandler);
  }, [loadMoreImages, activeView]);

  // --- Full-screen drag-and-drop handlers ---
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (user && !isUploadModalOpen && !isLoginModalOpen && !selectedImage && e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        const containsFile = Array.from(e.dataTransfer.items).some(item => item.kind === 'file' && item.type.startsWith('image/'));
        if (containsFile) {
            setIsDraggingOver(true);
        }
    }
  }, [user, isUploadModalOpen, isLoginModalOpen, selectedImage]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
        setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user && !isUploadModalOpen && !isLoginModalOpen && !selectedImage) {
        e.dataTransfer!.dropEffect = 'copy';
    } else {
        e.dataTransfer!.dropEffect = 'none';
    }
  }, [user, isUploadModalOpen, isLoginModalOpen, selectedImage]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;

    if (user && !isUploadModalOpen && !isLoginModalOpen && !selectedImage) {
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                setDroppedFile(file);
                setUploadModalOpen(true);
            }
            e.dataTransfer.clearData();
        }
    }
  }, [user, isUploadModalOpen, isLoginModalOpen, selectedImage]);

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
        window.removeEventListener('dragenter', handleDragEnter);
        window.removeEventListener('dragleave', handleDragLeave);
        window.removeEventListener('dragover', handleDragOver);
        window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  const handleImageClick = (image: ImageMeta) => {
    setSelectedImage(image);
  };
  
  const handleImageClickFromNotification = (partialImage: Partial<ImageMeta>) => {
    const fullImage = allImages.find(i => i.id === partialImage.id);
    if (fullImage) {
        setSelectedImage(fullImage);
    } else {
        console.warn("Could not find full image data for notification.", partialImage);
    }
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    setDroppedFile(null);
    if (activeView !== 'profile') {
        setActiveView('home');
    }
    // The subscription will automatically fetch the new image.
  };

  const handleCreateClick = () => {
    if (user) {
      setUploadModalOpen(true);
    } else {
      setLoginModalOpen(true);
    }
  };

  const handleViewProfile = (userToView: ProfileUser) => {
    if (activeView !== 'profile') {
        setLastView(activeView as 'home' | 'explore');
    }
    setProfileUser(userToView);
    setActiveView('profile');
    setSelectedImage(null);
  };

  const handleBack = () => {
    setActiveView(lastView);
    setProfileUser(null);
  }
  
  const handleSetView = (view: 'home' | 'explore' | 'notifications') => {
    setActiveView(view);
    setProfileUser(null);
  }

  // Kept for optimistic updates, though subscription will also update eventually.
  const handleImageUpdate = (updatedImage: ImageMeta) => {
    const updater = (prevImages: ImageMeta[]) => prevImages.map(img => img.id === updatedImage.id ? updatedImage : img);
    setDisplayedImages(updater);
    setAllImages(updater);

    if (selectedImage && selectedImage.id === updatedImage.id) {
        setSelectedImage(updatedImage);
    }
  };

  const handleLikeToggle = async (image: ImageMeta) => {
    if (!user) {
        setLoginModalOpen(true);
        return;
    }
    
    const oldLikedBy = image.likedBy || [];
    const hasLiked = oldLikedBy.includes(user.uid);
    const newLikedBy = hasLiked
        ? oldLikedBy.filter(id => id !== user.uid)
        : [...oldLikedBy, user.uid];

    const updatedImage = { ...image, likedBy: newLikedBy, likeCount: newLikedBy.length };
    handleImageUpdate(updatedImage); // Optimistic update

    try {
        await toggleImageLike(image, user);
    } catch (error) {
        console.error("Failed to toggle like:", error);
        handleImageUpdate(image); // Revert on failure
    }
  };

  const handleImageDelete = async (imageId: string) => {
    try {
        await deleteImageFromFirestore(imageId);
        // Subscription will handle removal from lists
        setSelectedImage(null);
    } catch (error) {
        console.error("Failed to delete image:", error);
    }
  };

  const renderContent = () => {
    // Only show skeleton on the very first load when no images are displayed yet.
    if (authLoading || (imagesLoading && displayedImages.length === 0 && activeView !== 'profile')) {
       return <SkeletonGrid />;
    }
    
    if (activeView === 'profile' && profileUser) {
        return <ProfilePage user={profileUser} loggedInUser={user} onBack={handleBack} onImageClick={handleImageClick} onViewProfile={handleViewProfile} onLikeToggle={handleLikeToggle} />;
    }
    
    if (activeView === 'explore') {
        return <ExplorePage images={allImages} user={user} onImageClick={handleImageClick} onViewProfile={handleViewProfile} onLikeToggle={handleLikeToggle} />;
    }

    return (
        <ImageGrid images={displayedImages} user={user} onImageClick={handleImageClick} onViewProfile={handleViewProfile} onLikeToggle={handleLikeToggle} />
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-primary font-sans">
      <div className="hidden md:flex md:flex-shrink-0">
         <Sidebar 
            user={user} 
            onCreateClick={handleCreateClick} 
            onLoginClick={() => setLoginModalOpen(true)}
            activeView={activeView}
            setView={handleSetView}
            onViewProfile={handleViewProfile}
            notifications={notifications}
            onImageClick={handleImageClickFromNotification}
          />
      </div>

      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        {renderContent()}
      </main>

      <BottomNav
        user={user}
        onCreateClick={handleCreateClick}
        onLoginClick={() => setLoginModalOpen(true)}
        activeView={activeView}
        setView={handleSetView}
        onViewProfile={handleViewProfile}
        notifications={notifications}
        onNotificationsClick={() => setNotificationsPanelOpen(true)}
      />
      
      {isDraggingOver && <FullScreenDropzone />}

      {isUploadModalOpen && user && (
        <UploadModal
          user={user}
          onClose={() => {
              setUploadModalOpen(false);
              setDroppedFile(null);
          }}
          onUploadSuccess={handleUploadSuccess}
          initialFile={droppedFile}
        />
      )}

      {isLoginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}
      
      {isNotificationsPanelOpen && user && (
        <MobileNotificationsModal
            notifications={notifications}
            onClose={() => setNotificationsPanelOpen(false)}
            onImageClick={(image) => {
                setNotificationsPanelOpen(false);
                handleImageClickFromNotification(image);
            }}
        />
      )}

      {selectedImage && (
        <ImageDetailModal
          image={selectedImage}
          user={user}
          onClose={() => setSelectedImage(null)}
          onViewProfile={handleViewProfile}
          onImageUpdate={handleImageUpdate}
          onImageDelete={handleImageDelete}
          onLikeToggle={handleLikeToggle}
        />
      )}
    </div>
  );
};

export default App;
