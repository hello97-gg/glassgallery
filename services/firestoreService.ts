
import { db } from './firebase';
// Fix: Use Firebase v8 compatibility imports.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import type { ImageMeta, Notification } from '../types';
import type { User } from 'firebase/auth';

export const PAGE_SIZE = 20; // Increased for better client-side pagination feel

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
            downloadCount: 0,
            // Fix: Use v8 compat syntax for serverTimestamp.
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error("Error adding document: ", error);
        throw error;
    }
};

export const getImagesFromFirestore = async (): Promise<{ images: ImageMeta[] }> => {
    try {
        const q = db.collection("images").orderBy("uploadedAt", "desc");
        const querySnapshot = await q.get();
        
        const images = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as ImageMeta[];

        return { images };
    } catch (error) {
        console.error("Error getting documents: ", error);
        throw error;
    }
};

// Real-time subscription for the feed
export const subscribeToImages = (callback: (images: ImageMeta[]) => void) => {
    const q = db.collection("images").orderBy("uploadedAt", "desc");
    return q.onSnapshot(snapshot => {
        const images = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as ImageMeta[];
        callback(images);
    }, (error) => {
        console.error("Error subscribing to images:", error);
    });
};

// Real-time subscription for a single image (Detail View)
export const subscribeToImage = (imageId: string, callback: (image: ImageMeta) => void) => {
    return db.collection("images").doc(imageId).onSnapshot(doc => {
        if (doc.exists) {
            callback({ id: doc.id, ...doc.data() } as ImageMeta);
        }
    }, (error) => {
        console.error("Error subscribing to image:", error);
    });
};

export const getImagesByUploader = async (uploaderUid: string): Promise<{ images: ImageMeta[] }> => {
    try {
      const q = db.collection("images")
        .where("uploaderUid", "==", uploaderUid)
        .orderBy("uploadedAt", "desc");

      const querySnapshot = await q.get();
      const images = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
      })) as ImageMeta[];
      
      return { images };
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

export const incrementDownloadCount = async (imageId: string) => {
    try {
        const imageRef = db.collection("images").doc(imageId);
        await imageRef.update({
            downloadCount: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.error("Error incrementing download count: ", error);
    }
};

export const toggleImageLike = async (image: ImageMeta, user: User) => {
    const imageRef = db.collection("images").doc(image.id);

    // This object will hold the result of the transaction to be used later.
    let transactionResult: { wasLike: boolean, uploaderUid: string } | null = null;

    // Phase 1: Atomically update the like count and array in a transaction.
    // This keeps the transaction simple, focusing only on one document to avoid
    // complex security rule failures that can occur with multi-document writes.
    await db.runTransaction(async (transaction) => {
        const imageDoc = await transaction.get(imageRef);
        if (!imageDoc.exists) {
            throw new Error("Image does not exist!");
        }

        const data = imageDoc.data() as ImageMeta;
        const likedBy = data.likedBy || [];
        const hasLiked = likedBy.includes(user.uid);
        
        let newLikedBy;
        if (hasLiked) {
            // Unlike action
            newLikedBy = likedBy.filter(uid => uid !== user.uid);
            transactionResult = { wasLike: false, uploaderUid: data.uploaderUid };
        } else {
            // Like action
            newLikedBy = [...likedBy, user.uid];
            transactionResult = { wasLike: true, uploaderUid: data.uploaderUid };
        }
        
        // Atomically update the image with the computed correct values.
        transaction.update(imageRef, {
            likedBy: newLikedBy,
            likeCount: newLikedBy.length,
        });
    });

    // Phase 2: If the transaction resulted in a "like", create a notification.
    // This runs outside the transaction. It's a common pattern to ensure the core
    // action succeeds without being blocked by secondary operations like notifications.
    if (transactionResult?.wasLike && user.uid !== transactionResult.uploaderUid) {
        try {
            await db.collection("notifications").add({
                recipientUid: transactionResult.uploaderUid,
                actorUid: user.uid,
                actorName: user.displayName || 'Someone',
                actorPhotoURL: user.photoURL || '',
                type: 'like',
                imageId: image.id,
                imageUrl: image.imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
        } catch (notificationError) {
            // Log the error but don't re-throw it, as the main "like" action was successful.
            console.error("Failed to create like notification:", notificationError);
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
