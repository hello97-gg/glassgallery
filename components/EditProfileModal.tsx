
import React, { useState, useRef } from 'react';
import type { ProfileUser } from '../types';
import { uploadImage } from '../services/storageService';
import { updateUserProfile } from '../services/firestoreService';
import Button from './Button';
import Spinner from './Spinner';
import LocationPicker from './LocationPicker';
import imageCompression from 'browser-image-compression';

interface EditProfileModalProps {
  user: ProfileUser;
  onClose: () => void;
  onUpdateSuccess: (updatedProfile: ProfileUser) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onUpdateSuccess }) => {
  const [displayName, setDisplayName] = useState(user.uploaderName);
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [email, setEmail] = useState(user.email || '');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user.uploaderPhotoURL);
  
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState(user.backgroundImageURL || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (file: File, type: 'avatar' | 'bg') => {
    if (!file.type.startsWith('image/')) return;

    try {
        const options = {
            maxSizeMB: type === 'avatar' ? 0.5 : 2,
            maxWidthOrHeight: type === 'avatar' ? 500 : 1920,
            useWebWorker: true,
        };
        const compressed = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'avatar') {
                setAvatarFile(compressed);
                setAvatarPreview(reader.result as string);
            } else {
                setBgFile(compressed);
                setBgPreview(reader.result as string);
            }
        };
        reader.readAsDataURL(compressed);
    } catch (err) {
        console.error("Compression error", err);
        setError("Failed to process image.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
        let newPhotoURL = user.uploaderPhotoURL;
        let newBgURL = user.backgroundImageURL || '';

        if (avatarFile) {
            const res = await uploadImage(avatarFile);
            newPhotoURL = res.url;
        }
        if (bgFile) {
            const res = await uploadImage(bgFile);
            newBgURL = res.url;
        }

        const updates: Partial<ProfileUser> = {
            uploaderName: displayName,
            bio,
            location,
            email,
            uploaderPhotoURL: newPhotoURL,
            backgroundImageURL: newBgURL,
        };

        await updateUserProfile(user.uploaderUid, updates);
        onUpdateSuccess({ ...user, ...updates });
        onClose();

    } catch (err) {
        console.error(err);
        setError("Failed to update profile. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-primary">Edit Profile</h2>
                  <button onClick={onClose} className="text-secondary hover:text-primary transition-colors text-3xl leading-none">&times;</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Images Section */}
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-secondary mb-2">Header Image</label>
                          <div 
                              onClick={() => bgInputRef.current?.click()}
                              className="w-full h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer bg-cover bg-center hover:opacity-80 transition-opacity relative overflow-hidden"
                              style={{ backgroundImage: bgPreview ? `url(${bgPreview})` : 'none' }}
                          >
                              {!bgPreview && <span className="text-secondary">Click to upload header</span>}
                              <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'bg')} />
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                           <div 
                              onClick={() => avatarInputRef.current?.click()}
                              className="w-20 h-20 rounded-full border-2 border-dashed border-border flex-shrink-0 flex items-center justify-center cursor-pointer bg-cover bg-center hover:opacity-80 transition-opacity relative overflow-hidden"
                              style={{ backgroundImage: `url(${avatarPreview})` }}
                           >
                              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'avatar')} />
                           </div>
                           <div className="text-sm text-secondary">
                               <p>Click avatar to change.</p>
                               <p>Recommended: Square, 500x500px.</p>
                           </div>
                      </div>
                  </div>

                  {/* Text Fields */}
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Display Name</label>
                          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-background border border-border rounded-md py-2 px-3 text-primary focus:ring-accent focus:border-accent" required />
                      </div>
                       <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Bio</label>
                          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-background border border-border rounded-md py-2 px-3 text-primary focus:ring-accent focus:border-accent" placeholder="Tell us about yourself..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                               <label className="block text-sm font-medium text-secondary mb-1">Location</label>
                               <div className="relative">
                                    <input 
                                        type="text" 
                                        value={location} 
                                        onChange={(e) => setLocation(e.target.value)} 
                                        className="w-full bg-background border border-border rounded-md py-2 pl-3 pr-10 text-primary focus:ring-accent focus:border-accent" 
                                        placeholder="City, Country" 
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowMap(true)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-accent cursor-pointer"
                                        title="Pick on map"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                               </div>
                          </div>
                          <div>
                               <label className="block text-sm font-medium text-secondary mb-1">Email (Public)</label>
                               <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-background border border-border rounded-md py-2 px-3 text-primary focus:ring-accent focus:border-accent" placeholder="contact@example.com" />
                          </div>
                      </div>
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <div className="flex justify-end gap-3">
                      <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
                      <Button type="submit" disabled={isLoading}>
                          {isLoading ? <Spinner /> : 'Save Profile'}
                      </Button>
                  </div>
              </form>
          </div>
        </div>
      </div>
      
      {showMap && (
          <LocationPicker 
              onSelect={(loc) => setLocation(loc)}
              onClose={() => setShowMap(false)}
          />
      )}
    </>
  );
};

export default EditProfileModal;
