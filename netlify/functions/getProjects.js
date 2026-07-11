// Read projects with role- and ownership-based access control.
const {
  HttpError,
  getDb,
  json,
  requireUser,
  toPublicError
} = require('../lib/firebaseAdmin');

function canReadProject(user, project) {
  return user.role === 'admin' || project.customerId === user.uid || project.createdBy === user.uid;
}

async function findProject(db, projectId) {
  const directSnapshot = await db.collection('projects').doc(projectId).get();
  if (directSnapshot.exists) {
    return { id: directSnapshot.id, ...directSnapshot.data() };
  }

  const stringMatch = await db.collection('projects').where('projectId', '==', projectId).limit(1).get();
  if (!stringMatch.empty) {
    const document = stringMatch.docs[0];
    return { id: document.id, ...document.data() };
  }

  if (!Number.isNaN(Number(projectId))) {
    const numberMatch = await db.collection('projects').where('projectId', '==', Number(projectId)).limit(1).get();
    if (!numberMatch.empty) {
      const document = numberMatch.docs[0];
      return { id: document.id, ...document.data() };
    }
  }

  return null;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed.' }, { Allow: 'GET' });
  }

  try {
    const user = await requireUser(event);
    const db = getDb();
    const queryParameters = event.queryStringParameters || {};

    if (queryParameters.projectId) {
      const projectId = String(queryParameters.projectId).trim();
      if (!projectId || projectId.length > 128) {
        throw new HttpError(400, 'A valid projectId is required.');
      }

      const project = await findProject(db, projectId);
      if (!project) {
        throw new HttpError(404, 'Project not found.');
      }
      if (!canReadProject(user, project)) {
        throw new HttpError(403, 'You do not have permission to view this project.');
      }

      return json(200, { project });
    }

    let snapshot;
    if (user.role === 'admin') {
      snapshot = await db.collection('projects').get();
    } else {
      snapshot = await db.collection('projects').where('customerId', '==', user.uid).get();
    }

    const projects = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((project) => canReadProject(user, project))
      .sort((a, b) => {
        const aTime = a.createdAt && typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

    return json(200, { projects });
  } catch (error) {
    return toPublicError(error);
  }
};
