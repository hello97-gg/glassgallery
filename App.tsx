import React, { useState, useEffect, useCallback, useRef } from 'react';
// Fix: Use Firebase v8 compatibility User type.
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { getImagesFromFirestore, deleteImageFromFirestore, getNotificationsForUser, toggleImageLike, PAGE_SIZE } from './services/firestoreService';
import type { ImageMeta, ProfileUser, Notification } from './types';

import Sidebar from './components/Header';
import BottomNav from './components/BottomNav';
import LoginModal from './components/LoginScreen';
import ImageGrid from './components/ImageGrid';
import UploadModal from './components/UploadModal';
import ImageDetailModal from './components/ImageDetailModal';
import Spinner from './components/Spinner';
import ExplorePage from './components/ExplorePage';
import ProfilePage from './components/ProfilePage';
import { MobileNotificationsModal } from './components/Notifications';
import FullScreenDropzone from './components/FullScreenDropzone';

// Fisher-Yates shuffle utility
const shuffle = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
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

  const fetchImages = useCallback(async () => {
    setImagesLoading(true);
    try {
      const { images: fetchedImages } = await getImagesFromFirestore();
      const shuffled = shuffle([...fetchedImages]);
      setAllImages(shuffled);
      setDisplayedImages(shuffled.slice(0, PAGE_SIZE));
      setCurrentIndex(PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setImagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView !== 'profile') {
      fetchImages();
    }
  }, [fetchImages, activeView]);

  const loadMoreImages = useCallback(() => {
    if (imagesLoading || allImages.length === 0) return;

    if (currentIndex < allImages.length) {
        const nextIndex = currentIndex + PAGE_SIZE;
        const newImages = allImages.slice(currentIndex, nextIndex);
        setDisplayedImages(prev => [...prev, ...newImages]);
        setCurrentIndex(nextIndex);
    } else {
        // Reached the end, re-shuffle and append to create an infinite loop
        const reshuffled = shuffle([...allImages]);
        setAllImages(reshuffled);
        const newImages = reshuffled.slice(0, PAGE_SIZE);
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
    fetchImages(); // Refetch all to include the new one
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
        handleImageUpdate(image); // Revert on failure
    }
  };

  const handleImageDelete = async (imageId: string) => {
    try {
        await deleteImageFromFirestore(imageId);
        setDisplayedImages(prev => prev.filter(img => img.id !== imageId));
        setAllImages(prev => prev.filter(img => img.id !== imageId));
        setSelectedImage(null);
    } catch (error) {
        console.error("Failed to delete image:", error);
    }
  };

  const renderContent = () => {
    if (authLoading || (imagesLoading && activeView !== 'profile')) {
       return (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
       );
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
