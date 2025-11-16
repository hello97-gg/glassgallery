import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { logOut } from '../services/firebase';

interface SidebarProps {
  user: User | null;
  onCreateClick: () => void;
  onLoginClick: () => void;
  activeView: 'home' | 'explore';
  setView: (view: 'home' | 'explore') => void;
}

const NavItem: React.FC<{ children: React.ReactNode, label: string, onClick?: () => void, active?: boolean, isProminent?: boolean }> = ({ children, label, onClick, active, isProminent }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full p-3 my-2 rounded-lg transition-all duration-200 group-hover:space-x-4
      ${active ? 'bg-surface font-semibold text-primary' : ''}
      ${isProminent ? 'bg-accent text-primary font-semibold hover:bg-accent-hover' : ''}
      ${!active && !isProminent ? 'text-secondary hover:text-primary hover:bg-surface' : ''}
    `}
    aria-label={label}
  >
    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">{children}</div>
    <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ user, onCreateClick, onLoginClick, activeView, setView }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <aside className="h-screen w-20 hover:w-56 transition-all duration-300 group bg-background border-r border-border p-3 flex flex-col sticky top-0">
      {/* Logo */}
      <div className="flex items-center group-hover:space-x-4 p-3 mb-6">
         <div className="w-8 h-8 rounded-lg bg-accent flex-shrink-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
        </div>
        <span className="text-lg font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Gallery</span>
      </div>

      {/* Navigation */}
      <nav className="flex-grow flex flex-col">
        <NavItem label="Home" active={activeView === 'home'} onClick={() => setView('home')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </NavItem>
         <NavItem label="Explore" active={activeView === 'explore'} onClick={() => setView('explore')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706l-1.51-1.51a8.011 8.011 0 00-1.912 2.706H4.332zM8.027 4.332A6.012 6.012 0 0110 3.754v2.502a3.504 3.504 0 00-1.973.578l-1.67-1.67zM9.973 11.973a3.504 3.504 0 001.406-1.406l2.122 2.122a6.012 6.012 0 01-2.706 1.912v-2.628zM11.973 9.973a3.504 3.504 0 00-.578 1.973l1.67 1.67a6.012 6.012 0 01.578-1.973h-1.67zM15.668 11.973a6.012 6.012 0 01-1.912 2.706l1.51 1.51a8.011 8.011 0 001.912-2.706h-1.51zM11.973 8.027a6.012 6.012 0 01-2.706-1.912l-1.51 1.51a8.011 8.011 0 002.706 1.912V8.027zM8.027 15.668A6.012 6.012 0 0110 16.246v-2.502a3.504 3.504 0 001.973-.578l1.67 1.67zM9.973 3.504a3.504 3.504 0 00-1.406 1.406L6.445 2.788a6.012 6.012 0 012.706-1.912v2.628z" clipRule="evenodd" />
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
                src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`}
                alt="User Avatar"
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 group-hover:ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-primary truncate whitespace-nowrap">{user.displayName || 'User'}</p>
                <p className="text-xs text-secondary truncate whitespace-nowrap">View Profile</p>
              </div>
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-52 bg-surface border border-border rounded-lg shadow-xl py-1 z-10">
                <div className="px-4 py-2 text-xs text-secondary border-b border-border">
                  Signed in as<br />
                  <span className="font-semibold text-sm text-primary">{user.displayName || user.email}</span>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    logOut();
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                >
                  Sign Out
                </a>
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