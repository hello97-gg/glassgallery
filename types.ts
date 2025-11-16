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
  flags: string[];
  originalWorkUrl?: string;
  uploadedAt: firebase.firestore.Timestamp;
}

export interface License {
  value: string;
  label: string;
}
