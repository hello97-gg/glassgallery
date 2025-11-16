import React, { useState, useEffect, useCallback } from 'react';
// Fix: Use Firebase v8 compatibility User type.
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { getImagesFromFirestore } from './services/firestoreService';
import type { ImageMeta, ProfileUser } from './types';

import Sidebar from './components/Header';
import LoginModal from './components/LoginScreen';
import ImageGrid from './components/ImageGrid';
import UploadModal from './components/UploadModal';
import ImageDetailModal from './components/ImageDetailModal';
import Spinner from './components/Spinner';
import ExplorePage from './components/ExplorePage';
import ProfilePage from './components/ProfilePage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageMeta | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  
  const [activeView, setActiveView] = useState<'home' | 'explore' | 'profile'>('home');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [lastView, setLastView] = useState<'home' | 'explore'>('home');


  useEffect(() => {
    // Fix: Use v8 compat syntax for onAuthStateChanged.
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      // Close login modal if user signs in successfully
      if (currentUser) {
        setLoginModalOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchImages = useCallback(async () => {
    setImagesLoading(true);
    try {
      const fetchedImages = await getImagesFromFirestore();
      setImages(fetchedImages); // Let firestore order by date, no need to shuffle
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
    if (activeView === 'home' || activeView === 'explore') {
        setLastView(activeView);
    }
    setProfileUser(userToView);
    setActiveView('profile');
    setSelectedImage(null); // Close detail modal if open
  };

  const handleBack = () => {
    setActiveView(lastView);
    setProfileUser(null);
  }
  
  const handleSetView = (view: 'home' | 'explore') => {
    setActiveView(view);
    setProfileUser(null); // Clear profile when navigating away
  }

  const handleImageUpdate = (updatedImage: ImageMeta) => {
    setImages(prevImages => prevImages.map(img => img.id === updatedImage.id ? updatedImage : img));
    if (selectedImage && selectedImage.id === updatedImage.id) {
        setSelectedImage(updatedImage);
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
        return <ProfilePage user={profileUser} onBack={handleBack} onImageClick={handleImageClick} onViewProfile={handleViewProfile} />;
    }
    
    if (activeView === 'explore') {
        return <ExplorePage images={images} onImageClick={handleImageClick} onViewProfile={handleViewProfile} />;
    }

    return <ImageGrid images={images} onImageClick={handleImageClick} onViewProfile={handleViewProfile} />;
  }


  return (
    <div className="flex min-h-screen w-full bg-background text-primary font-sans">
      <div className="flex-shrink-0">
         <Sidebar 
            user={user} 
            onCreateClick={handleCreateClick} 
            onLoginClick={() => setLoginModalOpen(true)}
            activeView={activeView}
            setView={handleSetView}
            onViewProfile={handleViewProfile}
          />
      </div>
      <main className="flex-1 p-6 md:p-8">
        {renderContent()}
      </main>
      
      {isUploadModalOpen && user && (
        <UploadModal
          user={user}
          onClose={() => setUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {isLoginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}

      {selectedImage && (
        <ImageDetailModal
          image={selectedImage}
          user={user}
          onClose={() => setSelectedImage(null)}
          onViewProfile={handleViewProfile}
          onImageUpdate={handleImageUpdate}
        />
      )}
    </div>
  );
};

export default App;