
import React, { useState, useEffect, useCallback } from 'react';
// Fix: Use Firebase v8 compatibility User type.
import type { User } from 'firebase/auth';
import { auth } from './services/firebase';
import { getImagesFromFirestore } from './services/firestoreService';
import type { ImageMeta } from './types';

import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import ImageGrid from './components/ImageGrid';
import UploadModal from './components/UploadModal';
import ImageDetailModal from './components/ImageDetailModal';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageMeta | null>(null);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    // Fix: Use v8 compat syntax for onAuthStateChanged.
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchImages = useCallback(async () => {
    if (!user) return;
    setImagesLoading(true);
    try {
      const fetchedImages = await getImagesFromFirestore();
      // Simple shuffle algorithm
      for (let i = fetchedImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fetchedImages[i], fetchedImages[j]] = [fetchedImages[j], fetchedImages[i]];
      }
      setImages(fetchedImages);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setImagesLoading(false);
    }
  }, [user]);

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-purple-900">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-purple-900/60 to-gray-900 bg-[length:200%_200%] animate-bg-pan text-white font-sans">
      <Header user={user} onUploadClick={() => setUploadModalOpen(true)} />
      <main className="container mx-auto px-4 py-8 pt-24">
        {imagesLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : (
          <ImageGrid images={images} onImageClick={handleImageClick} />
        )}
      </main>
      
      {isUploadModalOpen && (
        <UploadModal
          user={user}
          onClose={() => setUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

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
