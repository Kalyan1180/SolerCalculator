// src/utils/storageService.js
import { storage } from '@/firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function safeSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

function validateFile(file) {
  if (!file) throw new Error('A file is required.');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Only JPEG, PNG and WebP images are supported.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Image must be 5 MB or smaller.');
}

export async function uploadProjectPhoto(projectId, file) {
  try {
    const safeProjectId = safeSegment(projectId);
    if (!safeProjectId) throw new Error('A valid project ID is required.');
    validateFile(file);

    const fileName = `${Date.now()}_${safeSegment(file.name) || 'photo'}`;
    const path = `project-photos/${safeProjectId}/${fileName}`;
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: { projectId: safeProjectId }
    });
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      fileName,
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
    const safeProjectId = safeSegment(projectId);
    if (!safeProjectId) throw new Error('A valid project ID is required.');
    const folderRef = ref(storage, `project-photos/${safeProjectId}`);
    const result = await listAll(folderRef);
    const photos = await Promise.all(result.items.map(async (item) => ({
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
      throw new Error('Invalid project photo path.');
    }
    await deleteObject(ref(storage, photoPath));
    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { success: false, error: error.message };
  }
}

export async function uploadMultiplePhotos(projectId, files) {
  const uploads = [];
  const failures = [];

  for (const file of Array.from(files || [])) {
    const result = await uploadProjectPhoto(projectId, file);
    if (result.success) {
      uploads.push(result);
    } else {
      failures.push({ fileName: file.name, error: result.error });
    }
  }

  return {
    success: uploads.length > 0 || failures.length === 0,
    uploads,
    failures,
    error: uploads.length === 0 && failures.length
      ? failures.map((failure) => `${failure.fileName}: ${failure.error}`).join('; ')
      : null
  };
}
