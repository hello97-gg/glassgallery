import React from 'react';
import type { User } from 'firebase/auth';
import { ProfileUser } from '../types';

interface BottomNavProps {
  user: User | null;
  onCreateClick: () => void;
  onLoginClick: () => void;
  activeView: 'home' | 'explore' | 'profile';
  setView: (view: 'home' | 'explore') => void;
  onViewProfile: (user: ProfileUser) => void;
}

const NavItem: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}> = ({ children, onClick, active }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-1/4 h-16 transition-colors duration-200 focus:outline-none ${active ? 'text-primary' : 'text-secondary hover:text-primary'}`}
    aria-current={active ? 'page' : undefined}
  >
    {children}
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ user, onCreateClick, onLoginClick, activeView, setView, onViewProfile }) => {

  const handleProfileClick = () => {
    if (user) {
        onViewProfile({
            uploaderUid: user.uid,
            uploaderName: user.displayName || 'User',
            uploaderPhotoURL: user.photoURL || ''
        });
    } else {
        onLoginClick();
    }
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex justify-around items-center z-40 md:hidden">
      <NavItem onClick={() => setView('home')} active={activeView === 'home'}>
        {activeView === 'home' ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )}
      </NavItem>
      <NavItem onClick={() => setView('explore')} active={activeView === 'explore'}>
         <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </NavItem>
      <NavItem onClick={onCreateClick}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      </NavItem>
      <NavItem onClick={handleProfileClick} active={activeView === 'profile'}>
        {user ? (
            <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}&backgroundColor=ff5722,e91e63,9c27b0,673ab7,3f51b5,2196f3,03a9f4,00bcd4,009688,4caf50,8bc34a,cddc39,ffeb3b,ffc107,ff9800`}
                alt="User Avatar" 
                className={`w-7 h-7 rounded-full ${activeView === 'profile' ? 'ring-2 ring-offset-2 ring-offset-surface ring-primary' : ''}`}
            />
        ) : (
            <div className={`w-7 h-7 rounded-full flex items-center justify-center`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 16 16"><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
            </div>
        )}
      </NavItem>
    </footer>
  );
};

export default BottomNav;