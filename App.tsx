
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Fix: Use Firebase v8 compatibility User type.
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { subscribeToImages, deleteImageFromFirestore, getNotificationsForUser, toggleImageLike, PAGE_SIZE, subscribeToImage, getImagesByUploader } from './services/firestoreService';
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
import SEOHead from './components/SEOHead';

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

// Smart "Addictive" sorting algorithm
const smartSortImages = (images: ImageMeta[]): ImageMeta[] => {
  const now = Date.now();

  // Extend ImageMeta with a temporary sortScore for sorting
  type ImageWithScore = ImageMeta & { sortScore?: number };

  return images
    .map((image: ImageMeta): ImageWithScore => {
      // Handle potential missing timestamps during optimistic UI updates
      const uploadedAt = image.uploadedAt?.toDate ? image.uploadedAt.toDate().getTime() : now;
      const ageInHours = (now - uploadedAt) / (1000 * 60 * 60);

      // 1. Recency Score (Aggressive Exponential Decay)
      // We want fresh content to explode onto the feed.
      let recencyScore = 0;
      if (ageInHours < 0.5) {
          recencyScore = 3000; // INSTANT: Last 30 mins
      } else if (ageInHours < 4) {
          recencyScore = 1500; // FRESH: Last 4 hours
      } else if (ageInHours < 24) {
          recencyScore = 800;  // TODAY: Last 24 hours
      } else if (ageInHours < 72) {
          recencyScore = 300;  // RECENT: Last 3 days
      } else {
          // Older content drops off fast, but can be saved by massive popularity
          recencyScore = 100 / (Math.max(1, ageInHours / 24)); 
      }

      // 2. Popularity/Dopamine Score
      // High likes and downloads keep users engaged with quality content.
      const likeCount = image.likeCount || 0;
      const downloadCount = image.downloadCount || 0;
      // Likes are heavily weighted for social proof.
      const popularityScore = (likeCount * 15) + (downloadCount * 5); 

      // 3. Variable Reward (Randomness)
      // Ensures the feed never looks exactly the same, triggering "slot machine" psychology.
      const randomFactor = Math.random() * 250;

      // Final Score Calculation
      const finalScore = recencyScore + popularityScore + randomFactor;

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

  // --- DEEP LINKING & ROUTING HANDLER ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const imageId = params.get('image');
    const userId = params.get('user');

    if (imageId) {
      // If URL has ?image=ID, subscribe to it and open modal
      const unsubscribe = subscribeToImage(imageId, (img) => {
        if (img) {
          setSelectedImage(img);
        }
      });
      return () => unsubscribe();
    }
    
    if (userId) {
      // If URL has ?user=ID, fetch user data (mocked from images for now as we don't have a users collection)
      // In a real app, you'd fetch the user profile directly. 
      // Here we fetch their images to reconstruct the profile header.
      getImagesByUploader(userId).then(({ images }) => {
        if (images.length > 0) {
            const first = images[0];
            const profile: ProfileUser = {
                uploaderUid: first.uploaderUid,
                uploaderName: first.uploaderName,
                uploaderPhotoURL: first.uploaderPhotoURL
            };
            setProfileUser(profile);
            setActiveView('profile');
        }
      });
    }
  }, []);

  // Helper to update URL without page reload
  const updateURL = (params: { image?: string; user?: string } | null) => {
    const url = new URL(window.location.href);
    url.search = ''; // Clear existing
    
    if (params?.image) {
        url.searchParams.set('image', params.image);
    }
    if (params?.user) {
        url.searchParams.set('user', params.user);
    }
    
    window.history.pushState({}, '', url.toString());
  };

  // --- Real-time Image Subscription ---
  useEffect(() => {
    let unsubscribe: () => void;

    if (activeView === 'home' || activeView === 'explore') {
        // Only show loading spinner if we have NO images at all
        if (allImages.length === 0) {
            setImagesLoading(true);
        }
        
        unsubscribe = subscribeToImages((fetchedImages) => {
            setAllImages((prevImages) => {
                 // 1. First load: Sort intelligently with the aggressive algorithm
                 if (prevImages.length === 0) {
                     const sorted = smartSortImages(fetchedImages);
                     setDisplayedImages(sorted.slice(0, PAGE_SIZE));
                     setCurrentIndex(PAGE_SIZE);
                     setImagesLoading(false);
                     return sorted;
                 }
                 
                 // 2. Real-time Updates:
                 const newMap = new Map(fetchedImages.map(i => [i.id, i]));
                 
                 // Identify brand new uploads that weren't in our previous state
                 const currentIds = new Set(prevImages.map(i => i.id));
                 const newUploads = fetchedImages.filter(i => !currentIds.has(i.id));

                 // Update existing images in the list (e.g., like counts changed) without reordering them
                 // This prevents the feed from jumping around while the user is reading.
                 let updatedList = prevImages
                    .filter(img => newMap.has(img.id))
                    .map(img => newMap.get(img.id)!);
                 
                 // AGGRESSIVE: Inject new uploads immediately at the TOP
                 if (newUploads.length > 0) {
                     // Sort new uploads by time (newest first) just in case multiple arrived
                     const sortedNew = newUploads.sort((a, b) => {
                         const timeA = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
                         const timeB = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
                         return timeB - timeA;
                     });
                     updatedList = [...sortedNew, ...updatedList];
                 }
                 
                 // Sync displayed images: Update data AND prepend new uploads
                 setDisplayedImages(prevDisplayed => {
                    // Update data of currently displayed cards
                    let updatedDisplayed = prevDisplayed
                        .filter(d => newMap.has(d.id)) // Remove deleted
                        .map(d => newMap.get(d.id)!); // Update counts/meta
                    
                    // If there are new uploads, SHOW THEM NOW
                    if (newUploads.length > 0) {
                         const sortedNew = newUploads.sort((a, b) => {
                             const timeA = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
                             const timeB = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
                             return timeB - timeA;
                         });
                         return [...sortedNew, ...updatedDisplayed];
                    }

                    return updatedDisplayed;
                 });

                 setImagesLoading(false);
                 return updatedList;
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
        // Infinite Scroll Loop
        const newImages = allImages.slice(0, PAGE_SIZE);
        setDisplayedImages(prev => [...prev, ...newImages]);
    }
  }, [currentIndex, allImages, imagesLoading]);

  useEffect(() => {
    const handleScroll = () => {
      if (activeView === 'home') {
          const scrollThreshold = 1000;
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
    updateURL({ image: image.id });
  };
  
  const handleImageClickFromNotification = (partialImage: Partial<ImageMeta>) => {
    const fullImage = allImages.find(i => i.id === partialImage.id);
    if (fullImage) {
        setSelectedImage(fullImage);
        updateURL({ image: fullImage.id });
    } else if (partialImage.id) {
        // If not in feed, update URL so generic subscription picks it up
        updateURL({ image: partialImage.id });
    }
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    setDroppedFile(null);
    if (activeView !== 'profile') {
        setActiveView('home');
        updateURL(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    updateURL({ user: userToView.uploaderUid });
  };

  const handleBack = () => {
    setActiveView(lastView);
    setProfileUser(null);
    updateURL(null);
  }
  
  const handleSetView = (view: 'home' | 'explore' | 'notifications') => {
    if (view === activeView && (view === 'home' || view === 'explore')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setAllImages(prevImages => {
             const reshuffled = smartSortImages(prevImages);
             setDisplayedImages(reshuffled.slice(0, PAGE_SIZE));
             setCurrentIndex(PAGE_SIZE);
             return reshuffled;
        });
    } else {
        setActiveView(view);
        setProfileUser(null);
        updateURL(null);
    }
  }

  // Kept for optimistic updates
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
    handleImageUpdate(updatedImage); 

    try {
        await toggleImageLike(image, user);
    } catch (error) {
        console.error("Failed to toggle like:", error);
        handleImageUpdate(image);
    }
  };

  const handleImageDelete = async (imageId: string) => {
    try {
        await deleteImageFromFirestore(imageId);
        setSelectedImage(null);
        updateURL(null);
    } catch (error) {
        console.error("Failed to delete image:", error);
    }
  };

  const renderContent = () => {
    if (authLoading || (imagesLoading && displayedImages.length === 0 && activeView !== 'profile')) {
       return <SkeletonGrid />;
    }
    
    if (activeView === 'profile' && profileUser) {
        return (
            <>
                <SEOHead 
                    title={`${profileUser.uploaderName}'s Profile`}
                    description={`Check out photos and images uploaded by ${profileUser.uploaderName} on Glass Gallery.`}
                    imageUrl={profileUser.uploaderPhotoURL}
                    type="profile"
                    url={window.location.href}
                />
                <ProfilePage user={profileUser} loggedInUser={user} onBack={handleBack} onImageClick={handleImageClick} onViewProfile={handleViewProfile} onLikeToggle={handleLikeToggle} />
            </>
        );
    }
    
    if (activeView === 'explore') {
        return (
            <>
                <SEOHead 
                    title="Explore Images"
                    description="Discover trending categories and tags on Glass Gallery."
                    url={window.location.href}
                />
                <ExplorePage images={allImages} user={user} onImageClick={handleImageClick} onViewProfile={handleViewProfile} onLikeToggle={handleLikeToggle} />
            </>
        );
    }

    // HOME
    return (
        <>
            <SEOHead 
                title="Home"
                description="A modern image sharing platform. Discover and share beautiful images."
                url={window.location.href}
            />
            <ImageGrid images={displayedImages} user={user} onImageClick={handleImageClick} onViewProfile={handleViewProfile} onLikeToggle={handleLikeToggle} />
        </>
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
          onClose={() => {
            setSelectedImage(null);
            if (activeView === 'profile' && profileUser) {
                updateURL({ user: profileUser.uploaderUid });
            } else {
                updateURL(null);
            }
          }}
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
