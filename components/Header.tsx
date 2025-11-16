import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { logOut } from '../services/firebase';

interface SidebarProps {
  user: User | null;
  onCreateClick: () => void;
  onLoginClick: () => void;
}

const NavItem: React.FC<{ children: React.ReactNode, label: string, onClick?: () => void, active?: boolean }> = ({ children, label, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-4 w-full p-3 rounded-lg transition-colors ${active ? 'bg-accent text-white font-semibold' : 'text-primary hover:bg-border'}`}
    aria-label={label}
  >
    {children}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ user, onCreateClick, onLoginClick }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <aside className="fixed top-0 left-0 h-screen w-20 hover:w-56 transition-all duration-300 group bg-surface border-r border-border p-3 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center space-x-4 p-3 mb-8">
         <div className="w-8 h-8 rounded-lg bg-accent flex-shrink-0"></div>
         <span className="text-lg font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">Gallery</span>
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-2 overflow-hidden">
        <NavItem label="Home" active>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </NavItem>
        <NavItem label="Create" onClick={onCreateClick}>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </NavItem>
      </nav>

      {/* User Profile / Login */}
      <div className="mt-auto overflow-hidden">
        {user ? (
          <div className="relative">
             <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-4 w-full p-2 rounded-lg hover:bg-border">
                <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full flex-shrink-0"
                />
                <div className="text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-sm font-semibold text-primary truncate">{user.displayName || 'User'}</p>
                    <p className="text-xs text-secondary truncate">View Profile</p>
                </div>
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-52 bg-surface border border-border rounded-lg shadow-xl py-1">
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
                  className="block px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
                >
                  Sign Out
                </a>
              </div>
            )}
          </div>
        ) : (
             <NavItem label="Sign In" onClick={onLoginClick}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" /></svg>
            </NavItem>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;