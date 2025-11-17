import React from 'react';
import { signInWithGoogle, signInWithApple } from '../services/firebase';
import Button from './Button';

interface LoginModalProps {
    onClose: () => void;
}

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,35.59,44,29.668,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);
const AppleIcon = () => (
    <svg className="w-5 h-5 mr-3 text-primary" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.171,11.752c0,1.388-0.612,2.688-1.745,3.611c-1.07,0.869-2.556,1.35-3.98,1.35c-0.129,0-0.516-0.035-0.854-0.081c-0.902-0.126-1.847-0.342-2.825-0.342c-1.012,0-1.957,0.216-2.858,0.342c-0.338,0.046-0.725,0.081-0.854,0.081c-1.424,0-2.91-0.481-3.98-1.35c-1.133-0.923-1.745-2.223-1.745-3.611c0-1.913,1.18-3.483,2.959-3.483c0.902,0,1.758,0.387,2.57,1.069c0.75,0.63,1.35,1.528,1.893,1.528c0.543,0,1.143-0.898,1.893-1.528c0.812-0.682,1.668-1.069,2.57-1.069C17.991,8.269,19.171,9.839,19.171,11.752z M15.227,6.012c0.75-0.855,1.293-1.98,1.571-3.155c-1.314-0.034-2.736,0.683-3.61,1.571c-0.75,0.765-1.425,1.966-1.636,3.121C12.865,7.633,14.319,6.969,15.227,6.012z"></path>
    </svg>
);

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
    const handleLogin = async (loginProvider: () => Promise<any>) => {
        try {
            await loginProvider();
            // The onAuthStateChanged listener in App.tsx will handle closing the modal.
        } catch (error) {
            console.error("Sign-In Error", error);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-sm text-center bg-surface border border-border rounded-2xl shadow-lg p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                    <button onClick={onClose} className="absolute -top-4 -right-4 text-secondary hover:text-primary transition-colors text-3xl leading-none">&times;</button>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">
                        Welcome!
                    </h1>
                    <p className="text-md text-secondary mt-2">
                        Sign in to create and share your images.
                    </p>
                </div>
                <div className="space-y-4 pt-2">
                    <Button onClick={() => handleLogin(signInWithGoogle)} fullWidth variant="secondary">
                        <GoogleIcon /> Sign in with Google
                    </Button>
                    <Button onClick={() => handleLogin(signInWithApple)} fullWidth variant="secondary">
                        <AppleIcon /> Sign in with Apple
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
