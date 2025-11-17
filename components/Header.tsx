import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { logOut } from '../services/firebase';
import { ProfileUser } from '../types';

interface SidebarProps {
  user: User | null;
  onCreateClick: () => void;
  onLoginClick: () => void;
  activeView: 'home' | 'explore' | 'profile';
  setView: (view: 'home' | 'explore') => void;
  onViewProfile: (user: ProfileUser) => void;
}

const NavItem: React.FC<{ children: React.ReactNode, label: string, onClick?: () => void, active?: boolean, isProminent?: boolean }> = ({ children, label, onClick, active, isProminent }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full p-3 my-3 rounded-lg transition-all duration-200 group-hover:space-x-4
      ${active ? 'bg-surface font-semibold text-primary' : ''}
      ${isProminent ? 'bg-accent text-primary font-semibold hover:bg-accent-hover' : ''}
      ${!active && !isProminent ? 'text-secondary hover:text-primary hover:bg-surface/80' : ''}
    `}
    aria-label={label}
  >
    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">{children}</div>
    <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ user, onCreateClick, onLoginClick, activeView, setView, onViewProfile }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleMyProfileClick = () => {
    if (user) {
        onViewProfile({
            uploaderUid: user.uid,
            uploaderName: user.displayName || 'User',
            uploaderPhotoURL: user.photoURL || ''
        });
        setDropdownOpen(false);
    }
  }

  return (
    <aside className="h-screen w-20 hover:w-56 transition-all duration-300 group bg-background border-r border-border p-3 flex flex-col sticky top-0">
      {/* Logo */}
      <div className="flex items-center group-hover:space-x-3 p-3 mb-8">
         <div className="w-10 h-10 rounded-lg bg-surface flex-shrink-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </div>
        <span className="text-xl font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Glass</span>
      </div>

      {/* Navigation */}
      <nav className="flex-grow flex flex-col">
        <NavItem label="Home" active={activeView === 'home'} onClick={() => setView('home')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </NavItem>
         <NavItem label="Explore" active={activeView === 'explore'} onClick={() => setView('explore')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </NavItem>
        <NavItem label="Create" onClick={onCreateClick} isProminent>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </NavItem>
      </nav>

      {/* User Profile / Login */}
      <div className="mt-auto">
        {user ? (
          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center w-full p-2 rounded-lg hover:bg-surface">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}&backgroundColor=ff5722,e91e63,9c27b0,673ab7,3f51b5,2196f3,03a9f4,00bcd4,009688,4caf50,8bc34a,cddc39,ffeb3b,ffc107,ff9800`}
                alt="User Avatar"
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 group-hover:ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-primary truncate whitespace-nowrap">{user.displayName || 'User'}</p>
                <p className="text-xs text-secondary truncate whitespace-nowrap">Options</p>
              </div>
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-52 bg-surface border border-border rounded-lg shadow-xl py-1 z-10">
                <div className="px-4 py-2 text-xs text-secondary border-b border-border">
                  Signed in as<br />
                  <span className="font-semibold text-sm text-primary">{user.displayName || user.email}</span>
                </div>
                <button
                  onClick={handleMyProfileClick}
                  className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-border"
                >
                  My Profile
                </button>
                <button
                  onClick={() => {
                    logOut();
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <NavItem label="Sign In" onClick={onLoginClick}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </NavItem>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
