// src/utils/storageService.js

// Cloud Storage is intentionally disabled so the application can run entirely
// on Firebase's no-cost Spark plan. Project management, quotations, payments,
// inventory and analytics use Firestore and are unaffected.
export const PROJECT_PHOTO_UPLOADS_ENABLED = false;

const STORAGE_DISABLED_MESSAGE =
  'Site photo upload is disabled because this deployment does not use Firebase Storage. All other project features remain available.';

export async function uploadProjectPhoto() {
  return { success: false, error: STORAGE_DISABLED_MESSAGE };
}

export async function getProjectPhotos() {
  return { success: true, photos: [] };
}

export async function deleteProjectPhoto() {
  return { success: false, error: STORAGE_DISABLED_MESSAGE };
}

export async function uploadMultiplePhotos() {
  return { success: false, error: STORAGE_DISABLED_MESSAGE };
}
