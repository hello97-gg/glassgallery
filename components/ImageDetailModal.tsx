
import React from 'react';
import type { ImageMeta } from '../types';

interface ImageDetailModalProps {
  image: ImageMeta;
  onClose: () => void;
}

const InfoChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block bg-purple-500/20 text-purple-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">
        {children}
    </span>
);

const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ image, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-800/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="md:w-2/3 bg-black flex items-center justify-center">
            <img src={image.imageUrl} alt="Detailed view" className="max-w-full max-h-[50vh] md:max-h-[90vh] object-contain" />
        </div>
        <div className="md:w-1/3 p-6 space-y-4 overflow-y-auto text-white">
          <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
            <img src={image.uploaderPhotoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${image.uploaderUid}`} alt={image.uploaderName} className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-semibold">{image.uploaderName}</p>
              <p className="text-xs text-gray-400">Uploaded on {new Date(image.uploadedAt?.toDate()).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2 text-gray-300">License</h4>
            <InfoChip>{image.license}</InfoChip>
          </div>

          {image.flags.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-300">Flags</h4>
              <div className="flex flex-wrap gap-2">
                {image.flags.map(flag => <InfoChip key={flag}>{flag}</InfoChip>)}
              </div>
            </div>
          )}

          {image.originalWorkUrl && (
            <div>
                <h4 className="font-semibold mb-1 text-gray-300">Original Work</h4>
                <a href={image.originalWorkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-pink-400 hover:underline break-all">
                    {image.originalWorkUrl}
                </a>
            </div>
          )}
          
           <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-light text-white/50 hover:text-white">&times;</button>
        </div>
      </div>
    </div>
  );
};

export default ImageDetailModal;
