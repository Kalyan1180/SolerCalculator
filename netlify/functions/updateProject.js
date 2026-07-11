// Admin-only project updates for legacy callers. New UI writes through projectModel.js.
const {
  admin,
  HttpError,
  getDb,
  json,
  parseJsonBody,
  requireUser,
  toPublicError
} = require('../lib/firebaseAdmin');

const ALLOWED_FIELDS = new Set([
  'customerPhone',
  'phone',
  'percentCompletion',
  'customerNotes',
  'adminNotes',
  'technicalNotes',
  'completionNotes',
  'advancePrice',
  'finalPrice',
  'customerSignoff'
]);

function sanitizeUpdates(updateData) {
  if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
    throw new HttpError(400, 'updateData must be an object.');
  }

  const updates = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (!ALLOWED_FIELDS.has(key)) {
      continue;
    }

    if (['percentCompletion', 'advancePrice', 'finalPrice'].includes(key)) {
      const numericValue = Number(value);
      const maximum = key === 'percentCompletion' ? 100 : Number.MAX_SAFE_INTEGER;
      if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > maximum) {
        throw new HttpError(400, `${key} has an invalid value.`);
      }
      updates[key] = numericValue;
    } else if (key === 'customerSignoff') {
      updates[key] = Boolean(value);
    } else {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text.length > 2000) {
        throw new HttpError(400, `${key} is too long.`);
      }
      updates[key] = text;
    }
  }

  if (!Object.keys(updates).length) {
    throw new HttpError(400, 'No supported fields were supplied for update.');
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  return updates;
}

async function findProjectReference(db, projectId) {
  const directReference = db.collection('projects').doc(projectId);
  const directSnapshot = await directReference.get();
  if (directSnapshot.exists) {
    return directReference;
  }

  const possibleValues = [projectId];
  if (!Number.isNaN(Number(projectId))) {
    possibleValues.push(Number(projectId));
  }

  for (const value of possibleValues) {
    const snapshot = await db.collection('projects').where('projectId', '==', value).limit(1).get();
    if (!snapshot.empty) {
      return snapshot.docs[0].ref;
    }
  }

  return null;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'PUT') {
    return json(405, { error: 'Method not allowed.' }, { Allow: 'PUT' });
  }

  try {
    await requireUser(event, { roles: ['admin'] });
    const data = parseJsonBody(event);
    const projectId = typeof data.projectId === 'string' || typeof data.projectId === 'number'
      ? String(data.projectId).trim()
      : '';

    if (!projectId || projectId.length > 128) {
      throw new HttpError(400, 'A valid projectId is required.');
    }

    const db = getDb();
    const projectReference = await findProjectReference(db, projectId);
    if (!projectReference) {
      throw new HttpError(404, 'Project not found.');
    }

    const updates = sanitizeUpdates(data.updateData);
    await projectReference.update(updates);

    return json(200, { message: 'Project updated successfully.' });
  } catch (error) {
    return toPublicError(error);
  }
};
