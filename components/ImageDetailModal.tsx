
import React, { useState, useRef, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { ImageMeta, ProfileUser } from '../types';
import { LICENSES, FLAGS } from '../constants';
import { updateImageDetails, deleteImageFromFirestore, incrementDownloadCount, subscribeToImage } from '../services/firestoreService';
import Button from './Button';
import Spinner from './Spinner';

interface ImageDetailModalProps {
  image: ImageMeta;
  user: User | null;
  onClose: () => void;
  onViewProfile: (user: ProfileUser) => void;
  onImageUpdate: (updatedImage: ImageMeta) => void;
  onImageDelete: (imageId: string) => void;
  onLikeToggle: (image: ImageMeta) => void;
}

const InfoChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block bg-border text-secondary text-xs font-medium mr-2 px-2.5 py-1 rounded-full">
        {children}
    </span>
);

const AttributionModal: React.FC<{ image: ImageMeta, onClose: () => void }> = ({ image, onClose }) => {
  const [copied, setCopied] = useState(false);

  const hasOriginalWork = !!image.originalWorkUrl;
  let attributionText = '';
  let copyText = '';
  let shoutoutText = '';

  if (hasOriginalWork) {
      let sourceText = 'the original source';
      try {
          // Extract hostname for display, e.g., "unsplash.com"
          const hostname = new URL(image.originalWorkUrl!).hostname;
          sourceText = hostname.replace(/^www\./, '');
      } catch (e) { /* Fallback is fine */ }
      
      shoutoutText = `Give credit to the original creator by copying the source link below.`;
      attributionText = `Image from ${sourceText}`;
      copyText = `Image source: ${image.originalWorkUrl}`;

  } else {
      shoutoutText = `Give a shoutout to ${image.uploaderName} on social or copy the text below to attribute.`;
      attributionText = `Photo by ${image.uploaderName} on Glass Gallery`;
      copyText = `Photo by ${image.uploaderName} on Glass Gallery (${image.imageUrl})`;
  }


  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-md flex flex-col items-start p-6 relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-light text-secondary hover:text-primary">&times;</button>
        <div className="flex items-start gap-4 w-full">
          <img src={image.imageUrl} alt="thumbnail" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
          <div className="flex-grow">
            <h2 className="text-xl font-bold text-primary">Say thanks!</h2>
            <p className="text-sm text-secondary mt-1">{shoutoutText}</p>
          </div>
        </div>
        
        <div className="w-full mt-4 p-3 bg-background border border-border rounded-lg text-sm text-primary relative flex justify-between items-center">
          <span className="pr-10">{attributionText}</span>
          <button onClick={handleCopy} className="p-1.5 text-secondary hover:text-primary bg-border rounded-md flex-shrink-0">
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const HeartIconSolid = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
);
const HeartIconOutline = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);


const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ image, user, onClose, onViewProfile, onImageUpdate, onImageDelete, onLikeToggle }) => {
  // Use local state to track real-time updates for the modal specifically
  const [currentImage, setCurrentImage] = useState<ImageMeta>(image);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedLicense, setEditedLicense] = useState(image.license);
  const [editedLicenseUrl, setEditedLicenseUrl] = useState(image.licenseUrl || '');
  const [editedFlags, setEditedFlags] = useState<string[]>(image.flags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);
  
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = subscribeToImage(image.id, (updatedImage) => {
        setCurrentImage(updatedImage);
    });
    return () => unsubscribe();
  }, [image.id]);
  
  // Update local state if parent props change (e.g. swapping images in feed)
  useEffect(() => {
    setCurrentImage(image);
  }, [image]);

  const isOwner = user?.uid === currentImage.uploaderUid;
  const hasLiked = user && currentImage.likedBy?.includes(user.uid);
  
  const handleProfileClick = () => {
    onViewProfile({
      uploaderUid: currentImage.uploaderUid,
      uploaderName: currentImage.uploaderName,
      uploaderPhotoURL: currentImage.uploaderPhotoURL,
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit
      setEditedLicense(currentImage.license);
      setEditedLicenseUrl(currentImage.licenseUrl || '');
      setEditedFlags(currentImage.flags || []);
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
        licenseUrl: editedLicense === 'Other' ? editedLicenseUrl : '',
      };
      await updateImageDetails(currentImage.id, updates);
      // Optimistic update passed to parent
      onImageUpdate({ ...currentImage, ...updates });
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
          onImageDelete(currentImage.id);
      }
  };

  const handleDownload = async () => {
    // Increment download count immediately on server
    incrementDownloadCount(currentImage.id);
    
    // Optimistically update UI (although subscription will catch it too)
    setCurrentImage(prev => ({ ...prev, downloadCount: (prev.downloadCount || 0) + 1 }));
    onImageUpdate({ ...currentImage, downloadCount: (currentImage.downloadCount || 0) + 1 });

    try {
      const response = await fetch(currentImage.imageUrl);
      if (!response.ok) throw new Error('Network response was not ok.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const filename = currentImage.imageUrl.split('/').pop()?.split('?')[0] || 'download.jpg';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setShowAttribution(true);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Could not download the image. Please try again.');
    }
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
          // Double tap detected
          if (!hasLiked) {
              onLikeToggle(currentImage);
          }
          setShowHeartAnimation(true);
          setTimeout(() => setShowHeartAnimation(false), 800);
      }
      lastTap.current = now;
  };

  const renderDetails = () => {
    if (isEditing) {
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="license-edit" className="font-semibold mb-2 text-secondary text-sm block">License</label>
            <select id="license-edit" value={editedLicense} onChange={(e) => setEditedLicense(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-primary">
              {LICENSES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
           {editedLicense === 'Other' && (
            <div>
              <label htmlFor="licenseUrl-edit" className="font-semibold mb-2 text-secondary text-sm block">License URL</label>
              <input type="url" id="licenseUrl-edit" value={editedLicenseUrl} onChange={(e) => setEditedLicenseUrl(e.target.value)} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 text-primary focus:outline-none focus:ring-accent focus:border-accent" placeholder="https://creativecommons.org/licenses/..." required/>
            </div>
          )}
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
        </div>
      );
    }

    const licenseInfo = LICENSES.find(l => l.value === currentImage.license);
    const licenseName = licenseInfo?.label || currentImage.license;
    const licenseExplanationUrl = licenseInfo?.url;

    return (
      <div className="space-y-4">
        <div>
            <h4 className="font-semibold mb-2 text-secondary text-sm">Downloads</h4>
            <InfoChip>{(currentImage.downloadCount || 0).toLocaleString()}</InfoChip>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-secondary text-sm">License</h4>
          {currentImage.license === 'Other' && currentImage.licenseUrl ? (
             <a href={currentImage.licenseUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-border text-accent hover:underline text-xs font-medium mr-2 px-2.5 py-1 rounded-full">
                {licenseName} (Custom URL)
             </a>
          ) : licenseExplanationUrl ? (
             <a href={licenseExplanationUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-border text-secondary hover:text-primary hover:underline text-xs font-medium mr-2 px-2.5 py-1 rounded-full transition-colors">
                {licenseName}
             </a>
          ) : (
            <InfoChip>{licenseName}</InfoChip>
          )}
        </div>
        {currentImage.flags && currentImage.flags.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-secondary text-sm">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {currentImage.flags.map(flag => <InfoChip key={flag}>{flag}</InfoChip>)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="md:w-2/3 bg-background flex items-center justify-center p-2 relative group select-none">
            <img 
                src={currentImage.imageUrl} 
                alt="Detailed view" 
                className="max-w-full max-h-[50vh] md:max-h-[85vh] object-contain rounded-lg touch-manipulation cursor-pointer"
                onClick={handleDoubleTap}
            />
            {showHeartAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white drop-shadow-2xl opacity-90" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
            <button onClick={handleDownload} title="Download Image" className="absolute top-4 right-4 bg-surface/70 backdrop-blur-sm p-2 rounded-full text-primary hover:bg-surface transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
        </div>
        <div className="md:w-1/3 p-6 flex flex-col space-y-4 overflow-y-auto text-primary relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-light text-secondary hover:text-primary">&times;</button>
          
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <button onClick={handleProfileClick} className="flex-grow text-left flex items-center gap-3 hover:bg-border/50 p-2 -m-2 rounded-lg transition-colors">
              <img src={currentImage.uploaderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentImage.uploaderName}&backgroundColor=ff5722,e91e63,9c27b0,673ab7,3f51b5,2196f3,03a9f4,00bcd4,009688,4caf50,8bc34a,cddc39,ffeb3b,ffc107,ff9800`} alt={currentImage.uploaderName} className="w-12 h-12 rounded-full" />
              <div>
                <p className="font-semibold">{currentImage.uploaderName}</p>
                <p className="text-xs text-secondary">Uploaded on {new Date(currentImage.uploadedAt?.toDate()).toLocaleDateString()}</p>
              </div>
            </button>
            <button onClick={() => onLikeToggle(currentImage)} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors ${hasLiked ? 'bg-accent/20 text-accent' : 'bg-border text-secondary hover:bg-border/80'}`}>
                {hasLiked ? <HeartIconSolid /> : <HeartIconOutline />}
                <span>{currentImage.likeCount || 0}</span>
            </button>
          </div>
          
          <div className="flex-grow space-y-4">
            {renderDetails()}
             <div>
                <h4 className="font-semibold mb-1 text-secondary text-sm">Image URL</h4>
                <div className="relative">
                    <input type="text" readOnly value={currentImage.imageUrl} className="w-full bg-background border border-border rounded-md py-1 px-2 text-xs text-secondary pr-8 select-all" />
                    <button onClick={() => navigator.clipboard.writeText(currentImage.imageUrl)} className="absolute top-1/2 right-1 -translate-y-1/2 p-1 text-secondary hover:text-primary" title="Copy URL">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </div>
            {currentImage.originalWorkUrl && (
              <div>
                  <h4 className="font-semibold mb-1 text-secondary text-sm">Original Work</h4>
                  <a href={currentImage.originalWorkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
                      {currentImage.originalWorkUrl}
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
       {showAttribution && <AttributionModal image={currentImage} onClose={() => setShowAttribution(false)} />}
    </div>
  );
};

export default ImageDetailModal;
