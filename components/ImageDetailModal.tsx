import React from 'react';
import type { ImageMeta, ProfileUser } from '../types';

interface ImageDetailModalProps {
  image: ImageMeta;
  onClose: () => void;
  onViewProfile: (user: ProfileUser) => void;
}

const InfoChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block bg-border text-secondary text-xs font-medium mr-2 px-2.5 py-1 rounded-full">
        {children}
    </span>
);

const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ image, onClose, onViewProfile }) => {
  
  const handleProfileClick = () => {
    onViewProfile({
      uploaderUid: image.uploaderUid,
      uploaderName: image.uploaderName,
      uploaderPhotoURL: image.uploaderPhotoURL,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="md:w-2/3 bg-background flex items-center justify-center p-2">
            <img src={image.imageUrl} alt="Detailed view" className="max-w-full max-h-[50vh] md:max-h-[85vh] object-contain rounded-lg" />
        </div>
        <div className="md:w-1/3 p-6 space-y-4 overflow-y-auto text-primary relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-light text-secondary hover:text-primary">&times;</button>
          
          <button onClick={handleProfileClick} className="w-full text-left flex items-center gap-3 border-b border-border pb-4 hover:bg-border/50 p-2 -m-2 rounded-lg transition-colors">
            <img src={image.uploaderPhotoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${image.uploaderUid}`} alt={image.uploaderName} className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-semibold">{image.uploaderName}</p>
              <p className="text-xs text-secondary">Uploaded on {new Date(image.uploadedAt?.toDate()).toLocaleDateString()}</p>
            </div>
          </button>
          
          <div>
            <h4 className="font-semibold mb-2 text-secondary text-sm">License</h4>
            <InfoChip>{image.license}</InfoChip>
          </div>

          {image.flags.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-secondary text-sm">Flags</h4>
              <div className="flex flex-wrap gap-2">
                {image.flags.map(flag => <InfoChip key={flag}>{flag}</InfoChip>)}
              </div>
            </div>
          )}

          {image.originalWorkUrl && (
            <div>
                <h4 className="font-semibold mb-1 text-secondary text-sm">Original Work</h4>
                <a href={image.originalWorkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
                    {image.originalWorkUrl}
                </a>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default ImageDetailModal;