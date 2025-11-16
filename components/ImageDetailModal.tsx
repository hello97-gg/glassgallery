import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import type { ImageMeta, ProfileUser } from '../types';
import { LICENSES, FLAGS } from '../constants';
import { updateImageDetails } from '../services/firestoreService';
import Button from './Button';
import Spinner from './Spinner';

interface ImageDetailModalProps {
  image: ImageMeta;
  user: User | null;
  onClose: () => void;
  onViewProfile: (user: ProfileUser) => void;
  onImageUpdate: (updatedImage: ImageMeta) => void;
  onImageDelete: (imageId: string) => void;
}

const InfoChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block bg-border text-secondary text-xs font-medium mr-2 px-2.5 py-1 rounded-full">
        {children}
    </span>
);

const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ image, user, onClose, onViewProfile, onImageUpdate, onImageDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLicense, setEditedLicense] = useState(image.license);
  const [editedFlags, setEditedFlags] = useState<string[]>(image.flags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.uid === image.uploaderUid;
  
  const handleProfileClick = () => {
    onViewProfile({
      uploaderUid: image.uploaderUid,
      uploaderName: image.uploaderName,
      uploaderPhotoURL: image.uploaderPhotoURL,
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit
      setEditedLicense(image.license);
      setEditedFlags(image.flags || []);
      setError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleFlagToggle = (flag: string) => {
    setEditedFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const handleSave = async () => {
    if (editedFlags.length === 0) {
      setError("Please select at least one tag.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const updates = {
        license: editedLicense,
        flags: editedFlags,
      };
      await updateImageDetails(image.id, updates);
      onImageUpdate({ ...image, ...updates });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save changes:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
      if (window.confirm("Are you sure you want to permanently delete this image? This action cannot be undone.")) {
          setIsDeleting(true);
          onImageDelete(image.id);
          // The parent component will handle closing the modal after deletion.
      }
  };

  const renderDetails = () => {
    if (isEditing) {
      return (
        <>
          <div>
            <label htmlFor="license-edit" className="font-semibold mb-2 text-secondary text-sm block">License</label>
            <select id="license-edit" value={editedLicense} onChange={(e) => setEditedLicense(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-primary">
              {LICENSES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="font-semibold mb-2 text-secondary text-sm block">Tags</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FLAGS.map(flag => (
                <button key={flag} type="button" onClick={() => handleFlagToggle(flag)} className={`px-3 py-1 text-sm rounded-full transition-colors ${editedFlags.includes(flag) ? 'bg-accent text-primary' : 'bg-border text-secondary hover:bg-border/80'}`}>
                  {flag}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </>
      );
    }

    return (
      <>
        <div>
          <h4 className="font-semibold mb-2 text-secondary text-sm">License</h4>
          <InfoChip>{image.license}</InfoChip>
        </div>
        {image.flags && image.flags.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-secondary text-sm">Flags</h4>
            <div className="flex flex-wrap gap-2">
              {image.flags.map(flag => <InfoChip key={flag}>{flag}</InfoChip>)}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="md:w-2/3 bg-background flex items-center justify-center p-2">
            <img src={image.imageUrl} alt="Detailed view" className="max-w-full max-h-[50vh] md:max-h-[85vh] object-contain rounded-lg" />
        </div>
        <div className="md:w-1/3 p-6 flex flex-col space-y-4 overflow-y-auto text-primary relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-light text-secondary hover:text-primary">&times;</button>
          
          <button onClick={handleProfileClick} className="w-full text-left flex items-center gap-3 border-b border-border pb-4 hover:bg-border/50 p-2 -m-2 rounded-lg transition-colors">
            <img src={image.uploaderPhotoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${image.uploaderUid}`} alt={image.uploaderName} className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-semibold">{image.uploaderName}</p>
              <p className="text-xs text-secondary">Uploaded on {new Date(image.uploadedAt?.toDate()).toLocaleDateString()}</p>
            </div>
          </button>
          
          <div className="flex-grow space-y-4">
             {image.isNSFW && (
                <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-300 text-sm flex items-start gap-3">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.22 3.006-1.742 3.006H4.42c-1.522 0-2.492-1.672-1.742-3.006l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>This content is flagged as potentially sensitive.</span>
                </div>
            )}
            {renderDetails()}
            {image.originalWorkUrl && (
              <div>
                  <h4 className="font-semibold mb-1 text-secondary text-sm">Original Work</h4>
                  <a href={image.originalWorkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
                      {image.originalWorkUrl}
                  </a>
              </div>
            )}
          </div>
          
          {isOwner && (
            <div className="mt-auto pt-4 border-t border-border flex justify-end items-center gap-3">
                {isEditing ? (
                    <>
                        <Button onClick={handleEditToggle} variant="secondary" disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                          {isSaving ? <Spinner/> : 'Save'}
                        </Button>
                    </>
                ) : (
                    <>
                         <Button onClick={handleDelete} variant="secondary" className="!bg-red-900/50 !text-red-400 hover:!bg-red-800/50" disabled={isDeleting}>
                            {isDeleting ? <Spinner/> : 'Delete'}
                        </Button>
                        <Button onClick={handleEditToggle} variant="secondary">
                            Edit
                        </Button>
                    </>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageDetailModal;