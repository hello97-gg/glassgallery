import React from 'react';

const FullScreenDropzone: React.FC = () => {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in"
      aria-hidden="true" // It's a decorative element for a drag action
    >
      <div className="w-full h-full border-4 border-dashed border-accent rounded-3xl flex flex-col items-center justify-center text-primary pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-accent/80 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h2 className="text-3xl font-bold">Drop Your Image Here</h2>
        <p className="text-lg text-secondary mt-2">Upload a new creation to the gallery</p>
      </div>
    </div>
  );
};

export default FullScreenDropzone;
