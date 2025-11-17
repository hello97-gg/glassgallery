import { db } from './firebase';
// Fix: Use Firebase v8 compatibility imports.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import type { ImageMeta, Notification } from '../types';
import type { User } from 'firebase/auth';

export const addImageToFirestore = async (
    user: User, 
    imageUrl: string, 
    license: string, 
    flags: string[], 
    originalWorkUrl?: string,
    licenseUrl?: string
    ) => {
    try {
        // Fix: Use v8 compat syntax for adding a document.
        await db.collection("images").add({
            imageUrl,
            uploaderUid: user.uid,
            uploaderName: user.displayName || 'Anonymous',
            uploaderPhotoURL: user.photoURL || '',
            license,
            licenseUrl: licenseUrl || '',
            flags,
            originalWorkUrl: originalWorkUrl || '',
            likeCount: 0,
            likedBy: [],
            // Fix: Use v8 compat syntax for serverTimestamp.
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error("Error adding document: ", error);
        throw error;
    }
};

export const getImagesFromFirestore = async (): Promise<ImageMeta[]> => {
    try {
        // Fix: Use v8 compat syntax for querying documents.
        const q = db.collection("images").orderBy("uploadedAt", "desc");
        const querySnapshot = await q.get();
        // Fix: Map documents using v8 compat API. DocumentData type is not needed.
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as ImageMeta[];
    } catch (error) {
        console.error("Error getting documents: ", error);
        throw error;
    }
};

export const getImagesByUploader = async (uploaderUid: string): Promise<ImageMeta[]> => {
    try {
      const q = db.collection("images")
        .where("uploaderUid", "==", uploaderUid)
        .orderBy("uploadedAt", "desc");
      const querySnapshot = await q.get();
      return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
      })) as ImageMeta[];
    } catch (error) {
      console.error("Error getting user documents: ", error);
      throw error;
    }
  };

export const updateImageDetails = async (imageId: string, updates: { license: string; flags: string[]; licenseUrl?: string }) => {
    try {
        const imageRef = db.collection("images").doc(imageId);
        await imageRef.update(updates);
    } catch (error) {
        console.error("Error updating document: ", error);
        throw error;
    }
};

export const deleteImageFromFirestore = async (imageId: string) => {
    try {
        const imageRef = db.collection("images").doc(imageId);
        await imageRef.delete();
    } catch (error) {
        console.error("Error deleting document: ", error);
        throw error;
    }
};

export const toggleImageLike = async (image: ImageMeta, user: User) => {
    const imageRef = db.collection("images").doc(image.id);
    const hasLiked = image.likedBy?.includes(user.uid);

    if (hasLiked) {
        // Unlike
        await imageRef.update({
            likedBy: firebase.firestore.FieldValue.arrayRemove(user.uid),
            likeCount: firebase.firestore.FieldValue.increment(-1),
        });
        // NOTE: The logic to delete the corresponding notification has been removed.
        // The user who unlikes (the actor) does not have permission to delete a 
        // notification that belongs to the image owner (the recipient).
        // This was the primary source of the "insufficient permissions" error.

    } else {
        // Like
        await imageRef.update({
            likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid),
            likeCount: firebase.firestore.FieldValue.increment(1),
        });
        // Create notification, but not for liking your own image
        if (user.uid !== image.uploaderUid) {
            await db.collection("notifications").add({
                recipientUid: image.uploaderUid,
                actorUid: user.uid,
                actorName: user.displayName || 'Someone',
                actorPhotoURL: user.photoURL || '',
                type: 'like',
                imageId: image.id,
                imageUrl: image.imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
        }
    }
};

export const getNotificationsForUser = (userId: string, callback: (notifications: Notification[]) => void): (() => void) => {
    const q = db.collection("notifications")
        .where("recipientUid", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(30);

    const unsubscribe = q.onSnapshot(querySnapshot => {
        const notifications = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Notification[];
        callback(notifications);
    });

    return unsubscribe;
};

export const markNotificationsAsRead = async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;
    const batch = db.batch();
    notificationIds.forEach(id => {
        const notifRef = db.collection("notifications").doc(id);
        batch.update(notifRef, { read: true });
    });
    await batch.commit();
};