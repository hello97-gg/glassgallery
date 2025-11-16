
import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { uploadToCatbox } from '../services/catboxService';
import { addImageToFirestore } from '../services/firestoreService';
import { LICENSES, FLAGS } from '../constants';
import Button from './Button';
import Spinner from './Spinner';

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
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
        setError(null);
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
    setIsDragging(true);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFlagToggle = (flag: string) => {
    setSelectedFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setIsLoading(true);
    setError(null);
    try {
      const imageUrl = await uploadToCatbox(file);
      await addImageToFirestore(user, imageUrl, license, selectedFlags, originalWorkUrl);
      onUploadSuccess();
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-main">Upload an Image</h2>
                <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors text-3xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Image File</label>
                    <label 
                        htmlFor="file-upload"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`mt-1 flex justify-center items-center h-48 px-6 pt-5 pb-6 border-2 border-secondary border-dashed rounded-md cursor-pointer transition-colors ${isDragging ? 'border-accent bg-accent/10' : 'hover:border-text-muted'}`}
                    >
                        {preview ? (
                            <img src={preview} alt="Preview" className="max-h-full rounded-md object-contain" />
                        ) : (
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-text-muted" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                <p className="text-sm text-text-muted">Drag 'n' drop or click to upload</p>
                            </div>
                        )}
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" required/>
                    </label>
                </div>

                <div>
                    <label htmlFor="license" className="block text-sm font-medium text-text-muted">License</label>
                    <select id="license" value={license} onChange={(e) => setLicense(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-secondary border border-white/10 rounded-md focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text-main">
                        {LICENSES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-muted">Flags</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {FLAGS.map(flag => (
                            <button key={flag} type="button" onClick={() => handleFlagToggle(flag)} className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedFlags.includes(flag) ? 'bg-accent text-white' : 'bg-secondary text-text-muted hover:bg-white/10'}`}>
                                {flag}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="originalWork" className="block text-sm font-medium text-text-muted">Original Work URL (Optional)</label>
                    <input type="url" id="originalWork" value={originalWorkUrl} onChange={(e) => setOriginalWorkUrl(e.target.value)} className="mt-1 block w-full bg-secondary border border-white/10 rounded-md shadow-sm py-2 px-3 text-text-main focus:outline-none focus:ring-accent focus:border-accent" placeholder="https://example.com/source_image"/>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
                    <Button type="submit" disabled={isLoading || !file}>
                        {isLoading ? <Spinner /> : 'Upload'}
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;