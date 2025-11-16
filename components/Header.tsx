
import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { logOut } from '../services/firebase';
import Button from './Button';

interface HeaderProps {
  user: User;
  onUploadClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onUploadClick }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight text-text-main">
          Glass Gallery
        </h1>
        <div className="flex items-center space-x-4">
          <Button onClick={onUploadClick} size="sm">
            Upload Image
          </Button>
          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="block transition-transform duration-300 hover:scale-110">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`}
                alt="User Avatar"
                className="w-10 h-10 rounded-full border-2 border-surface"
              />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-white/5 rounded-lg shadow-xl py-1">
                <div className="px-4 py-2 text-sm text-text-muted border-b border-white/5">
                  Signed in as<br />
                  <span className="font-semibold text-text-main">{user.displayName || user.email}</span>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    logOut();
                    setDropdownOpen(false);
                  }}
                  className="block px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Sign Out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;