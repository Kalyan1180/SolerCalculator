const crypto = require('crypto');
const {
  getAdminServices,
  jsonResponse,
  requirePermission
} = require('./_firebaseAdmin');

const ALLOWED_STATUSES = new Set(['new', 'in_progress', 'contacted', 'resolved', 'spam']);
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function workflowError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

exports.handler = async event => {
  if (!['PUT', 'POST'].includes(event.httpMethod)) {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'PUT, POST' });
  }

  const authorization = await requirePermission(event, 'messages.manage');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const enquiryId = text(payload.enquiryId, 100);
    const requestedStatus = text(payload.status, 40);
    const requestedPriority = text(payload.priority, 40);
    const assignedTo = text(payload.assignedTo, 120);
    const internalNote = text(payload.internalNote, 1500);

    if (!/^ENQ-[0-9a-f-]{36}$/i.test(enquiryId)) {
      throw workflowError(400, 'INVALID_ENQUIRY_ID', 'A valid enquiry ID is required.');
    }
    if (requestedStatus && !ALLOWED_STATUSES.has(requestedStatus)) {
      throw workflowError(400, 'INVALID_STATUS', 'Unsupported enquiry status.');
    }
    if (requestedPriority && !ALLOWED_PRIORITIES.has(requestedPriority)) {
      throw workflowError(400, 'INVALID_PRIORITY', 'Unsupported enquiry priority.');
    }
    if (!requestedStatus && !requestedPriority && payload.assignedTo === undefined && !internalNote) {
      throw workflowError(400, 'NO_CHANGES', 'No supported message changes were provided.');
    }

    const { db, fieldValue } = getAdminServices();
    const enquiryRef = db.collection('enquiries').doc(enquiryId);
    const auditRef = db.collection('auditLogs').doc();
    const now = new Date();
    let updatedMessage = null;

    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(enquiryRef);
      if (!snapshot.exists) throw workflowError(404, 'ENQUIRY_NOT_FOUND', 'The contact message was not found.');

      const current = snapshot.data();
      const nextStatus = requestedStatus || current.status || 'new';
      const nextPriority = requestedPriority || current.priority || 'normal';
      const updates = {
        status: nextStatus,
        priority: nextPriority,
        assignedTo,
        assignedToUid: assignedTo ? authorization.user.uid : '',
        updatedAt: now,
        lastActionAt: now,
        activityHistory: fieldValue.arrayUnion({
          action: internalNote ? 'note_added' : 'message_updated',
          fromStatus: current.status || 'new',
          toStatus: nextStatus,
          note: internalNote,
          actorUid: authorization.user.uid,
          actorEmail: authorization.user.email || '',
          createdAt: now
        })
      };

      if (nextStatus === 'resolved') updates.resolvedAt = now;
      if (nextStatus !== 'resolved' && current.resolvedAt) updates.resolvedAt = null;
      if (internalNote) {
        updates.internalNotes = fieldValue.arrayUnion({
          noteId: `NOTE-${crypto.randomUUID()}`,
          text: internalNote,
          actorUid: authorization.user.uid,
          actorEmail: authorization.user.email || '',
          createdAt: now
        });
      }

      transaction.set(enquiryRef, updates, { merge: true });
      transaction.set(auditRef, {
        action: 'contact.message.updated',
        enquiryId,
        previousStatus: current.status || 'new',
        newStatus: nextStatus,
        priority: nextPriority,
        assignedTo,
        noteAdded: Boolean(internalNote),
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        createdAt: now
      });

      updatedMessage = {
        enquiryId,
        status: nextStatus,
        priority: nextPriority,
        assignedTo,
        updatedAt: now.toISOString()
      };
    });

    return jsonResponse(200, {
      success: true,
      message: updatedMessage,
      notice: 'Contact message updated successfully.'
    });
  } catch (error) {
    console.error('Unable to update contact message:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(error.status || 500, {
      code: error.code || 'ENQUIRY_UPDATE_FAILED',
      error: error.status ? error.message : 'Unable to update the contact message.'
    });
  }
};
