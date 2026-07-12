const { authorize, jsonResponse } = require('./_firebaseAdmin');
const { sanitizeCustomerProject } = require('./_projectPrivacy');

function jsonSafe(value) {
  if (value == null) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, jsonSafe(nested)]));
  }
  return value;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  const authorization = await authorize(event);
  if (!authorization.authorized) return authorization.response;

  try {
    const snapshot = await authorization.db
      .collection('projects')
      .where('customerId', '==', authorization.user.uid)
      .get();

    const projects = snapshot.docs
      .map(projectDoc => sanitizeCustomerProject(projectDoc.data(), projectDoc.id))
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
      .map(jsonSafe);

    return jsonResponse(200, { projects });
  } catch (error) {
    console.error('Unable to load customer projects:', error);
    return jsonResponse(500, { error: 'Unable to load your projects at this time.' });
  }
};
