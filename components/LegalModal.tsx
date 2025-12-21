
import React, { useState, useEffect, useRef } from 'react';
import { TERMS_OF_SERVICE, PRIVACY_POLICY, CONTENT_GUIDELINES } from '../constants/legalText';
import Button from './Button';

interface LegalModalProps {
  onClose: () => void;
  initialTab?: 'terms' | 'privacy' | 'guidelines';
}

const LegalModal: React.FC<LegalModalProps> = ({ onClose, initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'guidelines'>(initialTab);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset scroll position when tab changes
  useEffect(() => {
    if (contentRef.current) {
        contentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const getContent = () => {
    switch (activeTab) {
      case 'terms': return TERMS_OF_SERVICE;
      case 'privacy': return PRIVACY_POLICY;
      case 'guidelines': return CONTENT_GUIDELINES;
      default: return TERMS_OF_SERVICE;
    }
  };

  const getTitle = () => {
      switch (activeTab) {
        case 'terms': return 'Terms of Service';
        case 'privacy': return 'Privacy Policy';
        case 'guidelines': return 'Content Guidelines';
        default: return 'Legal';
      }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center p-5 border-b border-border bg-surface/80 backdrop-blur-sm z-10 shrink-0 gap-4 md:gap-0">
           <h2 className="text-2xl font-bold text-primary tracking-tight">Legal Center</h2>
           
           {/* Tab Navigation */}
           <div className="flex bg-background/50 p-1 rounded-xl border border-border">
              <button 
                onClick={() => setActiveTab('terms')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'terms' ? 'bg-accent text-primary shadow-md' : 'text-secondary hover:text-primary hover:bg-white/5'}`}
              >
                Terms of Service
              </button>
              <button 
                onClick={() => setActiveTab('privacy')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'privacy' ? 'bg-accent text-primary shadow-md' : 'text-secondary hover:text-primary hover:bg-white/5'}`}
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setActiveTab('guidelines')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'guidelines' ? 'bg-accent text-primary shadow-md' : 'text-secondary hover:text-primary hover:bg-white/5'}`}
              >
                Guidelines
              </button>
           </div>
           
           <button onClick={onClose} className="hidden md:block text-secondary hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
           </button>
        </div>

        {/* Content Section */}
        <div ref={contentRef} className="flex-grow overflow-y-auto bg-background custom-scrollbar">
            <div className="max-w-4xl mx-auto p-8 md:p-12 pb-20">
                <h1 className="text-3xl md:text-4xl font-extrabold text-primary mb-8 pb-4 border-b border-border">{getTitle()}</h1>
                <div className="prose prose-invert prose-lg max-w-none text-secondary/90 whitespace-pre-wrap font-sans leading-relaxed tracking-wide">
                    {getContent()}
                </div>
            </div>
        </div>

        {/* Footer Section */}
        <div className="p-4 border-t border-border bg-surface/80 backdrop-blur-sm flex justify-between items-center shrink-0">
            <span className="text-xs text-secondary hidden md:inline-block">By using Glass Gallery, you agree to these terms.</span>
            <Button onClick={onClose} variant="secondary" className="px-8">Close</Button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
