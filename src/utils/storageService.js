// src/utils/storageService.js
import { storage } from '@/firebase';
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes
} from 'firebase/storage';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 12;

function safePathSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function validateProjectId(projectId) {
  const safeProjectId = safePathSegment(projectId);
  if (!safeProjectId) throw new Error('Project ID is required');
  return safeProjectId;
}

function validateImage(file) {
  if (!(file instanceof File)) throw new Error('Invalid upload file');
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`${file.name}: only JPEG, PNG and WebP images are allowed`);
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`${file.name}: image must be smaller than 8 MB`);
  }
}

export async function uploadProjectPhoto(projectId, file) {
  try {
    const safeProjectId = validateProjectId(projectId);
    validateImage(file);
    const safeFileName = safePathSegment(file.name) || 'image';
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${safeFileName}`;
    const storageRef = ref(storage, `project-photos/${safeProjectId}/${uniqueFileName}`);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: { projectId: safeProjectId }
    });
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      fileName: snapshot.metadata.name,
      path: snapshot.ref.fullPath,
      downloadURL,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { success: false, error: error.message };
  }
}

export async function getProjectPhotos(projectId) {
  try {
    const safeProjectId = validateProjectId(projectId);
    const result = await listAll(ref(storage, `project-photos/${safeProjectId}`));
    const photos = await Promise.all(result.items.map(async item => ({
      name: item.name,
      url: await getDownloadURL(item),
      path: item.fullPath
    })));
    return { success: true, photos };
  } catch (error) {
    console.error('Error fetching project photos:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteProjectPhoto(photoPath) {
  try {
    if (!String(photoPath || '').startsWith('project-photos/')) {
      throw new Error('Invalid project photo path');
    }
    await deleteObject(ref(storage, photoPath));
    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { success: false, error: error.message };
  }
}

export async function uploadMultiplePhotos(projectId, files) {
  try {
    const fileList = Array.from(files || []);
    if (!fileList.length) return { success: false, error: 'Select at least one image' };
    if (fileList.length > MAX_FILES_PER_UPLOAD) {
      return { success: false, error: `Upload no more than ${MAX_FILES_PER_UPLOAD} images at once` };
    }

    fileList.forEach(validateImage);
    const results = await Promise.all(fileList.map(file => uploadProjectPhoto(projectId, file)));
    const failures = results.filter(result => !result.success);
    if (failures.length) {
      return {
        success: false,
        error: failures.map(result => result.error).join('; '),
        uploads: results.filter(result => result.success)
      };
    }
    return { success: true, uploads: results };
  } catch (error) {
    console.error('Error uploading multiple photos:', error);
    return { success: false, error: error.message };
  }
}
