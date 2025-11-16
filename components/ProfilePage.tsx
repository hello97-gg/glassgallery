import React, { useState, useEffect } from 'react';
import type { ProfileUser, ImageMeta } from '../types';
import { getImagesByUploader } from '../services/firestoreService';
import ImageGrid from './ImageGrid';
import Spinner from './Spinner';
import Button from './Button';

interface ProfilePageProps {
  user: ProfileUser;
  onBack: () => void;
  onImageClick: (image: ImageMeta) => void;
  onViewProfile: (user: ProfileUser) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack, onImageClick, onViewProfile }) => {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserImages = async () => {
      setIsLoading(true);
      try {
        const userImages = await getImagesByUploader(user.uploaderUid);
        setImages(userImages);
      } catch (error) {
        console.error("Failed to fetch user images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserImages();
  }, [user.uploaderUid]);

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
                src={user.uploaderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.uploaderName}`}
                alt={user.uploaderName}
                className="w-16 h-16 rounded-full border-2 border-border"
            />
            <div>
                <h1 className="text-3xl font-bold text-primary">{user.uploaderName}</h1>
                <p className="text-md text-secondary">{images.length} uploads</p>
            </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner />
        </div>
      ) : (
        <ImageGrid images={images} onImageClick={onImageClick} onViewProfile={onViewProfile} />
      )}
    </div>
  );
};

export default ProfilePage;
