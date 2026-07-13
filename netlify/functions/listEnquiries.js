const { jsonResponse, requirePermission } = require('./_firebaseAdmin');

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value._seconds) return new Date(Number(value._seconds) * 1000).toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function publicMessage(document) {
  const data = document.data();
  return {
    id: document.id,
    enquiryId: data.enquiryId || document.id,
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    interest: data.interest || 'general',
    message: data.message || '',
    source: data.source || 'contact-page',
    status: data.status || 'new',
    priority: data.priority || 'normal',
    assignedTo: data.assignedTo || '',
    assignedToUid: data.assignedToUid || '',
    internalNotes: Array.isArray(data.internalNotes)
      ? data.internalNotes.map(note => ({
        noteId: note.noteId || '',
        text: note.text || '',
        actorUid: note.actorUid || '',
        actorEmail: note.actorEmail || '',
        createdAt: toIso(note.createdAt)
      }))
      : [],
    activityHistory: Array.isArray(data.activityHistory)
      ? data.activityHistory.map(activity => ({
        action: activity.action || '',
        fromStatus: activity.fromStatus || '',
        toStatus: activity.toStatus || '',
        note: activity.note || '',
        actorUid: activity.actorUid || '',
        actorEmail: activity.actorEmail || '',
        createdAt: toIso(activity.createdAt)
      }))
      : [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    lastActionAt: toIso(data.lastActionAt),
    resolvedAt: toIso(data.resolvedAt)
  };
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  const authorization = await requirePermission(event, 'messages.read');
  if (!authorization.authorized) return authorization.response;

  try {
    const snapshot = await authorization.db
      .collection('enquiries')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    const messages = snapshot.docs.map(publicMessage);
    const summary = messages.reduce((result, message) => {
      result.total += 1;
      result[message.status] = (result[message.status] || 0) + 1;
      if (message.priority === 'urgent') result.urgent += 1;
      return result;
    }, {
      total: 0,
      new: 0,
      in_progress: 0,
      contacted: 0,
      resolved: 0,
      spam: 0,
      urgent: 0
    });

    return jsonResponse(200, {
      messages,
      summary,
      truncated: snapshot.size >= 500,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Unable to load contact messages:', error);
    return jsonResponse(500, { error: 'Unable to load contact messages' });
  }
};
