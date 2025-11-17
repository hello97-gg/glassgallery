import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Notification, ImageMeta } from '../types';
import { markNotificationsAsRead } from '../services/firestoreService';
import Button from './Button';

interface NotificationProps {
  notifications: Notification[];
  onImageClick: (image: Partial<ImageMeta>) => void;
  onClose: () => void;
}

const timeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "m";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "min";
  return Math.floor(seconds) + "s";
};

// Reusable component for the list of notifications
const NotificationsList: React.FC<NotificationProps> = ({ notifications, onClose, onImageClick }) => {
    const handleMarkAllRead = () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        markNotificationsAsRead(unreadIds);
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markNotificationsAsRead([notification.id]);
        }
        onImageClick({ id: notification.imageId, imageUrl: notification.imageUrl });
        onClose();
    };
    
    return (
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg shadow-xl z-20 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex justify-between items-center flex-shrink-0">
          <h3 className="font-semibold text-primary">Notifications</h3>
          {notifications.some(n => !n.read) && (
            <Button onClick={handleMarkAllRead} variant="secondary" size="sm">Mark all as read</Button>
          )}
        </div>
        <div className="flex-grow overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 flex items-start gap-3 border-b border-border last:border-b-0 cursor-pointer transition-colors ${n.read ? 'hover:bg-border/50' : 'bg-accent/10 hover:bg-accent/20'}`}
              >
                <img src={n.actorPhotoURL} alt={n.actorName} className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-grow text-sm">
                  <p className="text-primary"><span className="font-semibold">{n.actorName}</span> liked your image.</p>
                  <p className="text-xs text-secondary">{timeAgo(n.createdAt.toDate())} ago</p>
                </div>
                <img src={n.imageUrl} alt="liked image" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-secondary">You have no notifications yet.</p>
          )}
        </div>
      </div>
    )
}

// For desktop sidebar popover
const NotificationsPanel: React.FC<NotificationProps> = ({ notifications, onClose, onImageClick }) => {
    return (
        <div className="absolute left-0 bottom-full mb-2 w-80 animate-fade-in">
           <NotificationsList notifications={notifications} onClose={onClose} onImageClick={onImageClick} />
        </div>
    );
};

// For mobile full-screen modal
export const MobileNotificationsModal: React.FC<NotificationProps> = ({ notifications, onClose, onImageClick }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in" onClick={onClose}>
            <div className="max-h-[80vh] flex" onClick={(e) => e.stopPropagation()}>
                <NotificationsList notifications={notifications} onClose={onClose} onImageClick={onImageClick} />
            </div>
        </div>
    )
}

// The bell icon component itself
export const NotificationBell: React.FC<{
  notifications: Notification[];
  onImageClick: (image: Partial<ImageMeta>) => void;
  isSidebar?: boolean;
}> = ({ notifications, onImageClick, isSidebar = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const BellIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
    );

    if (isSidebar) {
        return (
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative flex items-center w-full p-3 my-3 rounded-lg transition-all duration-200 group-hover:space-x-4 text-secondary hover:text-primary hover:bg-surface/80"
                    aria-label="Notifications"
                >
                     <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center relative">
                        <BellIcon />
                        {unreadCount > 0 && (
                             <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"></span>
                        )}
                     </div>
                     <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Notifications</span>
                </button>
                {isOpen && <NotificationsPanel notifications={notifications} onClose={() => setIsOpen(false)} onImageClick={onImageClick} />}
            </div>
        );
    }
    
    return null;
};