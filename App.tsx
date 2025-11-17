import React, { useState, useEffect, useCallback } from 'react';
// Fix: Use Firebase v8 compatibility User type.
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { getImagesFromFirestore, deleteImageFromFirestore, getNotificationsForUser, toggleImageLike } from './services/firestoreService';
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [shuffledImages, setShuffledImages] = useState<ImageMeta[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageMeta | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isNotificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  
  const [activeView, setActiveView] = useState<'home' | 'explore' | 'profile' | 'notifications'>('home');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [lastView, setLastView] = useState<'home' | 'explore'>('home');

  const [notifications, setNotifications] = useState<Notification[]>([]);

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
      const fetchedImages = await getImagesFromFirestore();
      setImages(fetchedImages); // Keep original order for explore page
      
      // Shuffle a copy for the home page grid to prevent re-shuffling on like
      const array = [...fetchedImages];
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
      }
      setShuffledImages(array);

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

  const handleImageClick = (image: ImageMeta) => {
    setSelectedImage(image);
  };
  
  const handleImageClickFromNotification = (partialImage: Partial<ImageMeta>) => {
    // Notifications only contain partial data. Find the full image object.
    const fullImage = images.find(i => i.id === partialImage.id) || shuffledImages.find(i => i.id === partialImage.id);
    if (fullImage) {
        setSelectedImage(fullImage);
    } else {
        // Fallback or error handling if image not found in current state
        console.warn("Could not find full image data for notification.", partialImage);
    }
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    // If on profile page, stay there, otherwise go home to see new image
    if (activeView !== 'profile') {
        setActiveView('home');
    }
    fetchImages();
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
    setSelectedImage(null); // Close detail modal if open
  };

  const handleBack = () => {
    setActiveView(lastView);
    setProfileUser(null);
  }
  
  const handleSetView = (view: 'home' | 'explore' | 'notifications') => {
    setActiveView(view);
    setProfileUser(null); // Clear profile when navigating away
  }

  const handleImageUpdate = (updatedImage: ImageMeta) => {
    setImages(prevImages => prevImages.map(img => img.id === updatedImage.id ? updatedImage : img));
    setShuffledImages(prevShuffled => prevShuffled.map(img => img.id === updatedImage.id ? updatedImage : img));
    if (selectedImage && selectedImage.id === updatedImage.id) {
        setSelectedImage(updatedImage);
    }
  };

  const handleLikeToggle = async (image: ImageMeta) => {
    if (!user) {
        setLoginModalOpen(true);
        return;
    }
    
    // Optimistic update
    const hasLiked = image.likedBy?.includes(user.uid);
    const updatedImage = {
        ...image,
        likeCount: (image.likeCount || 0) + (hasLiked ? -1 : 1),
        likedBy: hasLiked
            ? image.likedBy?.filter(id => id !== user.uid)
            : [...(image.likedBy || []), user.uid],
    };
    handleImageUpdate(updatedImage);

    try {
        await toggleImageLike(image, user);
    } catch (error) {
        console.error("Failed to toggle like:", error);
        // Revert optimistic update on failure
        handleImageUpdate(image); 
    }
  };


  const handleImageDelete = async (imageId: string) => {
    try {
        await deleteImageFromFirestore(imageId);
        setImages(prevImages => prevImages.filter(img => img.id !== imageId));
        setShuffledImages(prevShuffled => prevShuffled.filter(img => img.id !== imageId));
        setSelectedImage(null); // Close the modal
    } catch (error) {
        console.error("Failed to delete image:", error);
        // Here you might want to show an error toast to the user
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
        return <ExplorePage images={images} user={user} onImageClick={handleImageClick} onViewProfile={handleViewProfile} onLikeToggle={handleLikeToggle} />;
    }

    return <ImageGrid images={shuffledImages} user={user} onImageClick={handleImageClick} onViewProfile={handleViewProfile} onLikeToggle={handleLikeToggle} />;
  }


  return (
    <div className="flex min-h-screen w-full bg-background text-primary font-sans">
      {/* --- Desktop Sidebar --- */}
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

      {/* --- Main Content --- */}
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        {renderContent()}
      </main>

      {/* --- Mobile Bottom Navigation --- */}
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
      
      {isUploadModalOpen && user && (
        <UploadModal
          user={user}
          onClose={() => setUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
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