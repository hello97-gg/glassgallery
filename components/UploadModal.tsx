import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { uploadToCatbox } from '../services/catboxService';
import { addImageToFirestore } from '../services/firestoreService';
import { LICENSES, FLAGS } from '../constants';
import Button from './Button';
import Spinner from './Spinner';
import imageCompression from 'browser-image-compression';
import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';

interface UploadModalProps {
  user: User;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ user, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [license, setLicense] = useState<string>(LICENSES[0].value);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [originalWorkUrl, setOriginalWorkUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing image...');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isNsfw, setIsNsfw] = useState(false);
  const [nsfwModel, setNsfwModel] = useState<nsfwjs.NSFWJS | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);

  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('Setting up NSFWJS model...');
        setWasmPaths('https://aistudiocdn.com/@tensorflow/tfjs-backend-wasm@^4.20.0/dist/');
        await tf.setBackend('wasm');
        const model = await nsfwjs.load();
        setNsfwModel(model);
        console.log('NSFWJS model loaded.');
      } catch (err) {
        console.error("Failed to load NSFWJS model", err);
        setError("Could not load content moderator. Uploads may proceed without checks.");
      } finally {
        setIsModelLoading(false);
      }
    };
    loadModel();
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
        setIsLoading(true);
        setLoadingMessage('Compressing image...');
        setError(null);
        setPreview(null);
        setFile(null);
        setIsNsfw(false);

        try {
            const options = {
                maxSizeMB: 2,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };
            
            const compressedFile = await imageCompression(selectedFile, options);
            
            setFile(compressedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                const previewUrl = reader.result as string;
                setPreview(previewUrl);

                if (nsfwModel) {
                    setLoadingMessage('Analyzing content...');
                    const img = document.createElement('img');
                    img.src = previewUrl;
                    img.onload = async () => {
                        try {
                            const predictions = await nsfwModel.classify(img);
                            console.log('NSFW Predictions:', predictions);
                            const nsfwPrediction = predictions.find(p =>
                                (p.className === 'Porn' || p.className === 'Hentai' || p.className === 'Sexy') && p.probability > 0.65
                            );
                            const isNsfwDetected = !!nsfwPrediction;
                            setIsNsfw(isNsfwDetected);
                             if (isNsfwDetected) {
                                console.log(`NSFW content detected: ${nsfwPrediction?.className} (${(nsfwPrediction.probability * 100).toFixed(2)}%)`);
                            }
                        } catch (err) {
                             console.error("NSFW check failed:", err);
                             setError("Content analysis failed. Assuming content is safe.");
                             setIsNsfw(false); // Fail safe
                        } finally {
                            setIsLoading(false);
                        }
                    };
                    img.onerror = () => {
                        setError("Could not load image for analysis.");
                        setIsLoading(false);
                    };
                } else {
                     setIsLoading(false); // No model, just finish loading
                }
            };
            reader.readAsDataURL(compressedFile);

        } catch (err) {
            console.error("Image compression error:", err);
            setError("Could not process the image. Please try a different one.");
            setFile(null);
            setPreview(null);
            setIsLoading(false);
        }
    } else {
        setError("Please select a valid image file.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && !isModelLoading) {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isLoading || isModelLoading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.files = e.dataTransfer.files;
      }
    }
  };

  const handleFlagToggle = (flag: string) => {
    setError(null);
    setSelectedFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select an image to upload.");
      return;
    }
    if (selectedFlags.length === 0) {
      setError("Please select at least one tag for the image.");
      return;
    }
    if (!user) return;


    setIsLoading(true);
    setLoadingMessage('Uploading image...');
    setError(null);
    try {
      const { url: imageUrl } = await uploadToCatbox(file);
      await addImageToFirestore(user, imageUrl, license, selectedFlags, isNsfw, originalWorkUrl);
      onUploadSuccess();
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderUploadState = () => {
      if (isModelLoading) {
          return (
             <div className="flex flex-col items-center text-center">
                <Spinner />
                <p className="mt-2 text-sm text-secondary">Loading content moderator...</p>
            </div>
          );
      }
      if (isLoading) {
          return (
             <div className="flex flex-col items-center text-center">
                <Spinner />
                <p className="mt-2 text-sm text-secondary">{loadingMessage}</p>
            </div>
          );
      }
       if (preview) {
           return <img src={preview} alt="Preview" className="max-h-full rounded-md object-contain" />;
       }

       return (
            <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-secondary/50" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                <p className="text-sm text-secondary">Drag 'n' drop or click to upload</p>
            </div>
       );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary">Upload an Image</h2>
                <button onClick={onClose} className="text-secondary hover:text-primary transition-colors text-3xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Image File</label>
                    <label 
                        htmlFor="file-upload"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`mt-1 flex justify-center items-center h-48 px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md transition-colors ${(isLoading || isModelLoading) ? '' : 'cursor-pointer'} ${isDragging ? 'border-accent bg-accent/10' : 'hover:border-secondary/50'}`}
                    >
                        {renderUploadState()}
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" disabled={isLoading || isModelLoading} />
                    </label>
                </div>

                <div>
                    <label htmlFor="license" className="block text-sm font-medium text-secondary">License</label>
                    <select id="license" value={license} onChange={(e) => setLicense(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-primary">
                        {LICENSES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary">Tags (select at least one)</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {FLAGS.map(flag => (
                            <button key={flag} type="button" onClick={() => handleFlagToggle(flag)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedFlags.includes(flag) ? 'bg-accent text-primary' : 'bg-border text-secondary hover:bg-border/80'}`}>
                                {flag}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="originalWork" className="block text-sm font-medium text-secondary">Original Work URL (Optional)</label>
                    <input type="url" id="originalWork" value={originalWorkUrl} onChange={(e) => setOriginalWorkUrl(e.target.value)} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 text-primary focus:outline-none focus:ring-accent focus:border-accent" placeholder="https://example.com/source_image"/>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
                    <Button type="submit" disabled={isLoading || !file || selectedFlags.length === 0 || isModelLoading}>
                        {isLoading || isModelLoading ? <Spinner /> : 'Upload'}
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;