// src/utils/storageService.js
// Firebase Storage integration for photo uploads

import { storage } from '@/firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage';

/**
 * Upload photo to Firebase Storage
 */
export async function uploadProjectPhoto(projectId, file) {
  try {
    const fileName = `${projectId}_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `project-photos/${projectId}/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Photo uploaded:', snapshot.metadata.name);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL:', downloadURL);

    return {
      success: true,
      fileName: fileName,
      downloadURL: downloadURL,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all photos for a project
 */
export async function getProjectPhotos(projectId) {
  try {
    const folderRef = ref(storage, `project-photos/${projectId}`);
    const result = await listAll(folderRef);

    const photos = [];
    for (const item of result.items) {
      const url = await getDownloadURL(item);
      photos.push({
        name: item.name,
        url: url,
        path: item.fullPath
      });
    }

    return { success: true, photos };
  } catch (error) {
    console.error('Error fetching project photos:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a photo from Firebase Storage
 */
export async function deleteProjectPhoto(photoPath) {
  try {
    const photoRef = ref(storage, photoPath);
    await deleteObject(photoRef);
    console.log('Photo deleted:', photoPath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload multiple photos
 */
export async function uploadMultiplePhotos(projectId, files) {
  try {
    const uploadResults = [];

    for (const file of files) {
      const result = await uploadProjectPhoto(projectId, file);
      if (result.success) {
        uploadResults.push(result);
      }
    }

    return { success: true, uploads: uploadResults };
  } catch (error) {
    console.error('Error uploading multiple photos:', error);
    return { success: false, error: error.message };
  }
}
