// Fix: Use Firebase v8 compatibility imports to resolve module errors for Timestamp.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface ImageMeta {
  id: string;
  imageUrl: string;
  uploaderUid: string;
  uploaderName: string;
  uploaderPhotoURL: string;
  license: string;
  licenseUrl?: string;
  flags: string[];
  originalWorkUrl?: string;
  uploadedAt: firebase.firestore.Timestamp;
  likeCount?: number;
  likedBy?: string[];
}

export interface License {
  value: string;
  label: string;
  url?: string;
}

export interface ProfileUser {
  uploaderUid: string;
  uploaderName: string;
  uploaderPhotoURL: string;
}

export interface Notification {
  id: string;
  recipientUid: string;
  actorUid: string;
  actorName: string;
  actorPhotoURL: string;
  type: 'like';
  imageId: string;
  imageUrl: string;
  createdAt: firebase.firestore.Timestamp;
  read: boolean;
}
