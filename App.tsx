
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Fix: Use Firebase v8 compatibility User type.
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { subscribeToImages, deleteImageFromFirestore, getNotificationsForUser, toggleImageLike, PAGE_SIZE, subscribeToImage, getImagesByUploader, getImagesFromFirestore } from './services/firestoreService';
import type { ImageMeta, ProfileUser, Notification } from './types';

import Sidebar from './components/Header';
import BottomNav from './components/BottomNav';
import LoginModal from './components/LoginScreen';
import ImageGrid from './components/ImageGrid';
import UploadModal from './components/UploadModal';
import ImageDetailModal from './components/ImageDetailModal';
import ExplorePage from './components/ExplorePage';
import ProfilePage from './components/ProfilePage';
import ApiDocsPage from './components/ApiDocsPage';
import { MobileNotificationsModal } from './components/Notifications';
import FullScreenDropzone from './components/FullScreenDropzone';
import SEOHead, { DEFAULT_FAVICON } from './components/SEOHead';

// --- Favicon SVG Data URIs ---
// Compass Icon for Explore
const EXPLORE_FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f5c3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolygon points='16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76'/%3E%3C/svg%3E`;

// Code/Terminal Icon for API
const API_FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f5c3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'/%3E%3C/svg%3E`;


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
      const uploadedAt = image.uploadedAt?.toDate ? image.uploadedAt.toDate().getTime() : now;
      const ageInHours = (now - uploadedAt) / (1000 * 60 * 60);

      // 1. Recency Score (Aggressive Exponential Decay)
      let recencyScore = 0;
      if (ageInHours < 0.5) {
          recencyScore = 3000; 
      } else if (ageInHours < 4) {
          recencyScore = 1500; 
      } else if (ageInHours < 24) {
          recencyScore = 800;  
      } else if (ageInHours < 72) {
          recencyScore = 300;  
      } else {
          recencyScore = 100 / (Math.max(1, ageInHours / 24)); 
      }

      // 2. Popularity/Dopamine Score
      const likeCount = image.likeCount || 0;
      const downloadCount = image.downloadCount || 0;
      const popularityScore = (likeCount * 15) + (downloadCount * 5); 

      // 3. Variable Reward (Randomness)
      const randomFactor = Math.random() * 250;

      const finalScore = recencyScore + popularityScore + randomFactor;

      return { ...image, sortScore: finalScore };
    })
    .sort((a, b) => (b.sortScore ?? 0) - (a.sortScore ?? 0)) 
    .map(({ sortScore, ...rest }) => rest); 
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
  
  const [allImages, setAllImages] = useState<ImageMeta[]>([]);
  const [displayedImages, setDisplayedImages] = useState<ImageMeta[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedImage, setSelectedImage] = useState<ImageMeta | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isNotificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  
  const [activeView, setActiveView] = useState<'home' | 'explore' | 'profile' | 'notifications' | 'api'>('home');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [lastView, setLastView] = useState<'home' | 'explore' | 'api'>('home');
  
  // New state for Explore search
  const [exploreSearchTerm, setExploreSearchTerm] = useState('');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const dragCounter = useRef(0);


  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
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
    const searchTerm = params.get('search');
    const viewParam = params.get('view');

    if (imageId) {
      const unsubscribe = subscribeToImage(imageId, (img) => {
        if (img) {
          setSelectedImage(img);
        }
      });
      return () => unsubscribe();
    }
    
    if (userId) {
       const profile: ProfileUser = {
           uploaderUid: userId,
           uploaderName: 'Loading...',
           uploaderPhotoURL: ''
       };
       setProfileUser(profile);
       setActiveView('profile');
    } else if (viewParam === 'api') {
        setActiveView('api');
    } else if (searchTerm) {
        setExploreSearchTerm(searchTerm);
        setActiveView('explore');
    }
  }, []);

  const updateURL = (params: { image?: string; user?: string; search?: string; view?: string } | null) => {
    const url = new URL(window.location.href);
    url.search = ''; 
    
    if (params?.image) url.searchParams.set('image', params.image);
    if (params?.user) url.searchParams.set('user', params.user);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.view) url.searchParams.set('view', params.view);
    
    window.history.pushState({}, '', url.toString());
  };

  // --- Image Data Fetching Strategy ---
  // We use a hybrid approach:
  // 1. Fetch once with .get() to ensure crawlers/bots get data immediately without waiting for websocket.
  // 2. Set up .onSnapshot() for real-time updates for connected users.
  useEffect(() => {
    let unsubscribe: () => void;

    if (activeView === 'home' || activeView === 'explore') {
        if (allImages.length === 0) {
            setImagesLoading(true);
            
            // Initial explicit fetch for SEO/fast first paint
            getImagesFromFirestore().then(({ images }) => {
                 const sorted = smartSortImages(images);
                 setAllImages(sorted);
                 setDisplayedImages(sorted.slice(0, PAGE_SIZE));
                 setCurrentIndex(PAGE_SIZE);
                 setImagesLoading(false);
            }).catch(err => {
                console.error("Initial fetch failed", err);
                setImagesLoading(false);
            });
        }
        
        // Real-time listener
        unsubscribe = subscribeToImages((fetchedImages) => {
            setAllImages((prevImages) => {
                 // If this is the very first load and get() hasn't finished, handle it
                 if (prevImages.length === 0) {
                     const sorted = smartSortImages(fetchedImages);
                     setDisplayedImages(sorted.slice(0, PAGE_SIZE));
                     setCurrentIndex(PAGE_SIZE);
                     setImagesLoading(false);
                     return sorted;
                 }
                 
                 // Merge updates logic
                 const newMap = new Map(fetchedImages.map(i => [i.id, i]));
                 const currentIds = new Set(prevImages.map(i => i.id));
                 const newUploads = fetchedImages.filter(i => !currentIds.has(i.id));

                 let updatedList = prevImages
                    .filter(img => newMap.has(img.id))
                    .map(img => newMap.get(img.id)!);
                 
                 if (newUploads.length > 0) {
                     const sortedNew = newUploads.sort((a, b) => {
                         const timeA = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
                         const timeB = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
                         return timeB - timeA;
                     });
                     updatedList = [...sortedNew, ...updatedList];
                 }
                 
                 // Update display list quietly
                 setDisplayedImages(prevDisplayed => {
                    let updatedDisplayed = prevDisplayed
                        .filter(d => newMap.has(d.id)) 
                        .map(d => newMap.get(d.id)!); 
                    
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
                 
                 return updatedList;
            });
        });
    }
    
    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [activeView]);

  // Sync selectedImage
  useEffect(() => {
    if (selectedImage && allImages.length > 0) {
        const updated = allImages.find(img => img.id === selectedImage.id);
        if (updated && updated !== selectedImage) {
            setSelectedImage(updated);
        } else if (!updated) {
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

  // --- Full-screen drag-and-drop ---
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
        updateURL({ image: partialImage.id });
    }
  };
  
  const handleLocationClick = (location: string) => {
      setExploreSearchTerm(location);
      setActiveView('explore');
      updateURL({ search: location });
      setSelectedImage(null);
  }

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
        setLastView(activeView as 'home' | 'explore' | 'api');
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
  
  const handleSetView = (view: 'home' | 'explore' | 'notifications' | 'api') => {
    if (view === activeView && (view === 'home' || view === 'explore')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setAllImages(prevImages => {
             const reshuffled = smartSortImages(prevImages);
             setDisplayedImages(reshuffled.slice(0, PAGE_SIZE));
             setCurrentIndex(PAGE_SIZE);
             return reshuffled;
        });
        if (view === 'explore') {
            setExploreSearchTerm('');
            updateURL(null);
        }
    } else {
        setActiveView(view);
        setProfileUser(null);
        setExploreSearchTerm('');
        
        if (view === 'api') {
            updateURL({ view: 'api' });
        } else {
            updateURL(null);
        }
    }
  }

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
    if (activeView === 'api') {
        return (
            <>
                <SEOHead 
                    title="Developer API"
                    description="Integrate Glass Gallery into your applications with our public API."
                    url={window.location.href}
                    favicon={API_FAVICON}
                />
                <ApiDocsPage />
            </>
        );
    }

    // Fix for SEO: Do NOT block on authLoading. Only block if images are strictly loading and empty.
    // If auth is loading, we just render as if 'guest'.
    if (imagesLoading && displayedImages.length === 0 && activeView !== 'profile') {
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
                    favicon={profileUser.uploaderPhotoURL}
                />
                <ProfilePage 
                    key={profileUser.uploaderUid}
                    user={profileUser} 
                    loggedInUser={user} 
                    onBack={handleBack} 
                    onImageClick={handleImageClick} 
                    onViewProfile={handleViewProfile} 
                    onLikeToggle={handleLikeToggle}
                    onLocationClick={handleLocationClick}
                />
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
                    favicon={EXPLORE_FAVICON}
                />
                <ExplorePage 
                    images={allImages} 
                    user={user} 
                    onImageClick={handleImageClick} 
                    onViewProfile={handleViewProfile} 
                    onLikeToggle={handleLikeToggle}
                    initialSearchTerm={exploreSearchTerm}
                    onNavigateToApi={() => handleSetView('api')}
                />
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
                favicon={DEFAULT_FAVICON}
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

      {/* Added min-w-0 to fix flex child overflow issues on mobile */}
      <main className="flex-1 min-w-0 p-4 md:p-8 pb-20 md:pb-8">
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
            } else if (activeView === 'explore' && exploreSearchTerm) {
                updateURL({ search: exploreSearchTerm });
            } else if (activeView === 'api') {
                updateURL({ view: 'api' });
            } else {
                updateURL(null);
            }
          }}
          onViewProfile={handleViewProfile}
          onImageUpdate={handleImageUpdate}
          onImageDelete={handleImageDelete}
          onLikeToggle={handleLikeToggle}
          onLocationClick={handleLocationClick}
        />
      )}
    </div>
  );
};

export default App;
