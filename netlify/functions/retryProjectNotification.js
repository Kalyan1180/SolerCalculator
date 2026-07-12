const {
  getAdminServices,
  jsonResponse,
  requirePermission
} = require('./_firebaseAdmin');
const { sendProjectNotification } = require('./_projectMailer');
const { text, workflowError } = require('./_projectWorkflow');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await requirePermission(event, 'notifications.send');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const notificationId = text(payload.notificationId, 200);
    if (!notificationId) throw workflowError(400, 'NOTIFICATION_ID_REQUIRED', 'Notification ID is required.');

    const { db, fieldValue } = getAdminServices();
    const notificationRef = db.collection('projectNotifications').doc(notificationId);
    const snapshot = await notificationRef.get();
    if (!snapshot.exists) throw workflowError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');

    const notification = { notificationId, ...snapshot.data() };
    if (!notification.payload || !notification.type) {
      throw workflowError(422, 'NOTIFICATION_NOT_RETRYABLE', 'This notification does not contain a retryable email payload.');
    }

    try {
      const delivery = await sendProjectNotification(notification);
      await notificationRef.set({
        status: 'sent',
        attempts: fieldValue.increment(1),
        sentAt: new Date(),
        lastAttemptAt: new Date(),
        messageId: delivery.messageId,
        attachmentName: delivery.attachmentName || '',
        error: '',
        lastRetriedByUid: authorization.user.uid
      }, { merge: true });
      await db.collection('auditLogs').add({
        action: 'project.notification.retried',
        projectId: notification.projectId,
        notificationId,
        attachmentName: delivery.attachmentName || '',
        outcome: 'sent',
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        createdAt: new Date()
      });
      return jsonResponse(200, {
        success: true,
        message: delivery.attachmentName
          ? `Customer email sent with ${delivery.attachmentName}.`
          : 'Customer email sent successfully.'
      });
    } catch (mailError) {
      await notificationRef.set({
        status: 'failed',
        attempts: fieldValue.increment(1),
        lastAttemptAt: new Date(),
        error: String(mailError.message || 'Email delivery failed').slice(0, 1000),
        lastRetriedByUid: authorization.user.uid
      }, { merge: true });
      throw workflowError(502, 'EMAIL_DELIVERY_FAILED', 'The email provider could not deliver this update or its attachment. Check the email configuration and try again.');
    }
  } catch (error) {
    console.error('Notification retry failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(error.status || 500, {
      code: error.code || 'NOTIFICATION_RETRY_FAILED',
      error: error.status ? error.message : 'Unable to retry the customer email.'
    });
  }
};
