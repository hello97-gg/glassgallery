
import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { uploadToCatbox } from '../services/catboxService';
import { addImageToFirestore } from '../services/firestoreService';
import { LICENSES, FLAGS } from '../constants';
import Button from './Button';
import Spinner from './Spinner';
import imageCompression from 'browser-image-compression';
import { GoogleGenAI, Modality } from '@google/genai';


interface UploadModalProps {
  user: User;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ user, onClose, onUploadSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [license, setLicense] = useState<string>(LICENSES[0].value);
  const [licenseUrl, setLicenseUrl] = useState('');
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [originalWorkUrl, setOriginalWorkUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing image...');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (selectedFiles && selectedFiles.length > 0) {
        setIsLoading(true);
        setLoadingMessage(`Compressing ${selectedFiles.length} image(s)...`);
        setError(null);
        setPreviews([]);
        setFiles([]);

        try {
            const options = {
                maxSizeMB: 2,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };
            
            const compressedFilesPromises = Array.from(selectedFiles).map(file => {
                if (!file.type.startsWith('image/')) {
                    throw new Error(`File "${file.name}" is not a valid image.`);
                }
                return imageCompression(file, options);
            });
            const compressedFiles = await Promise.all(compressedFilesPromises);
            
            setFiles(compressedFiles);
            
            const previewPromises = compressedFiles.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            const newPreviews = await Promise.all(previewPromises);
            setPreviews(newPreviews);
            setIsLoading(false);

        } catch (err) {
            console.error("Image processing error:", err);
            const errorMessage = err instanceof Error ? err.message : "Could not process the image(s). Please try different ones.";
            setError(errorMessage);
            setFiles([]);
            setPreviews([]);
            setIsLoading(false);
        }
    } else if (selectedFiles && selectedFiles.length === 0) {
      // Do nothing if no files are selected (e.g., user cancels file picker)
    }
     else {
        setError("Please select at least one valid image file.");
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
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
    if (isLoading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
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

  const fileToGenerativePart = async (file: File) => {
      const base64EncodedDataPromise = new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
      });
      return {
          inlineData: {
              mimeType: file.type,
              data: await base64EncodedDataPromise as string,
          },
      };
  };

  function dataURLtoFile(dataurl: string, filename: string): File {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) {
          throw new Error('Invalid data URL');
      }
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, {type:mime});
  }

  const handleCollageSubmit = async () => {
    setIsLoading(true);
    setLoadingMessage('Generating collage with AI...');
    setError(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const imageParts = await Promise.all(files.map(file => fileToGenerativePart(file)));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { text: 'Create an artistic, seamless photo collage from the following images. The final result should be a single beautiful image that blends the inputs harmoniously.' },
                    ...imageParts
                ]
            },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });

        const collagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!collagePart?.inlineData) {
            throw new Error('AI did not return a valid image. Please try again.');
        }

        const { data: base64Data, mimeType } = collagePart.inlineData;
        const collageFile = dataURLtoFile(`data:${mimeType};base64,${base64Data}`, 'ai-collage.png');
        
        setLoadingMessage('Uploading collage...');
        
        const { url: imageUrl } = await uploadToCatbox(collageFile);
        
        const finalFlags = selectedFlags.includes('Collage') ? selectedFlags : [...selectedFlags, 'Collage'];
        
        await addImageToFirestore(user, imageUrl, license, finalFlags, originalWorkUrl, license === 'Other' ? licenseUrl : '');
        
        onUploadSuccess();

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Collage generation failed. Please try again.';
        setError(errorMessage);
        console.error(err);
        setIsLoading(false);
    }
  };

  const handleSingleUploadSubmit = async () => {
    setIsLoading(true);
    setLoadingMessage('Uploading image...');
    setError(null);
    try {
      const { url: imageUrl } = await uploadToCatbox(files[0]);
      await addImageToFirestore(user, imageUrl, license, selectedFlags, originalWorkUrl, license === 'Other' ? licenseUrl : '');
      onUploadSuccess();
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError("Please select an image to upload.");
      return;
    }
    if (selectedFlags.length === 0) {
      setError("Please select at least one tag for the image.");
      return;
    }
    if (!user) return;

    if (files.length > 1) {
        await handleCollageSubmit();
    } else {
        await handleSingleUploadSubmit();
    }
  };

  const renderUploadState = () => {
      if (isLoading) {
          return (
             <div className="flex flex-col items-center justify-center text-center h-full">
                <Spinner />
                <p className="mt-2 text-sm text-secondary">{loadingMessage}</p>
            </div>
          );
      }
       if (previews.length > 0) {
           return (
            <div className="w-full h-full p-2 overflow-y-auto bg-background/50 rounded-md">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {previews.map((src, index) => (
                        <div key={index} className="aspect-square bg-surface rounded overflow-hidden">
                            <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover"/>
                        </div>
                    ))}
                </div>
            </div>
           );
       }

       return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-secondary/50" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                    <p className="text-sm text-secondary">Drag 'n' drop or click to upload</p>
                    <p className="text-xs text-secondary/70">Select multiple files to create a collage</p>
                </div>
            </div>
       );
  }

  const submitButtonText = files.length > 1 ? 'Generate Collage & Upload' : 'Upload';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary">Upload Image(s)</h2>
                <button onClick={onClose} className="text-secondary hover:text-primary transition-colors text-3xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Image File(s)</label>
                    <label 
                        htmlFor="file-upload"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`mt-1 flex justify-center items-center h-48 px-2 pt-2 pb-2 border-2 border-border border-dashed rounded-md transition-colors ${isLoading ? '' : 'cursor-pointer'} ${isDragging ? 'border-accent bg-accent/10' : 'hover:border-secondary/50'}`}
                    >
                        {renderUploadState()}
                        <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={handleFileChange} accept="image/*" disabled={isLoading} />
                    </label>
                </div>

                <div>
                    <label htmlFor="license" className="block text-sm font-medium text-secondary">License</label>
                    <select id="license" value={license} onChange={(e) => setLicense(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-primary">
                        {LICENSES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                </div>
                
                {license === 'Other' && (
                  <div>
                    <label htmlFor="licenseUrl" className="block text-sm font-medium text-secondary">License URL</label>
                    <input type="url" id="licenseUrl" value={licenseUrl} onChange={(e) => setLicenseUrl(e.target.value)} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 text-primary focus:outline-none focus:ring-accent focus:border-accent" placeholder="https://creativecommons.org/licenses/by/4.0/" required />
                  </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-secondary">Tags (select at least one)</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {FLAGS.filter(f => f !== 'Collage').map(flag => ( // Don't show Collage as a user-selectable option
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
                    <Button type="submit" disabled={isLoading || files.length === 0 || selectedFlags.length === 0}>
                        {isLoading ? <Spinner /> : submitButtonText}
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;