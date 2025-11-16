import React, { useState, useEffect, useCallback } from 'react';
// Fix: Use Firebase v8 compatibility User type.
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { getImagesFromFirestore } from './services/firestoreService';
import type { ImageMeta } from './types';

import Sidebar from './components/Header';
import LoginModal from './components/LoginScreen';
import ImageGrid from './components/ImageGrid';
import UploadModal from './components/UploadModal';
import ImageDetailModal from './components/ImageDetailModal';
import Spinner from './components/Spinner';
import ExplorePage from './components/ExplorePage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageMeta | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'explore'>('home');


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
    fetchImages();
  }, [fetchImages]);

  const handleImageClick = (image: ImageMeta) => {
    setSelectedImage(image);
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    fetchImages();
  };

  const handleCreateClick = () => {
    if (user) {
      setUploadModalOpen(true);
    } else {
      setLoginModalOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-primary font-sans">
      <div className="flex-shrink-0">
         <Sidebar 
            user={user} 
            onCreateClick={handleCreateClick} 
            onLoginClick={() => setLoginModalOpen(true)}
            activeView={activeView}
            setView={setActiveView}
          />
      </div>
      <main className="flex-1 p-6 md:p-8">
        {authLoading || imagesLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : (
          <>
            {activeView === 'home' && <ImageGrid images={images} onImageClick={handleImageClick} />}
            {activeView === 'explore' && <ExplorePage images={images} onImageClick={handleImageClick} />}
          </>
        )}
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
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

export default App;