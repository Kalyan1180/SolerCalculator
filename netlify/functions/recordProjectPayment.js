const crypto = require('crypto');
const {
  getAdminServices,
  jsonResponse,
  requirePermission
} = require('./_firebaseAdmin');
const { sendProjectNotification } = require('./_projectMailer');
const {
  loadProjectBundle,
  notificationRecord,
  numberValue,
  paymentStatusFor,
  paymentTotal,
  text,
  workflowError
} = require('./_projectWorkflow');

function currentPaid(project) {
  const recorded = paymentTotal(project);
  if (recorded > 0) return recorded;
  if (project.paymentStatus === 'balance_paid') return numberValue(project.quotedPrice);
  if (project.paymentStatus === 'advance_paid') return numberValue(project.advanceAmount);
  return numberValue(project.amountPaid);
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await requirePermission(event, 'projects.payments');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const projectId = text(payload.projectId, 200);
    const expectedRevision = Number(payload.expectedRevision || 0);
    const amount = Math.round(numberValue(payload.amount) * 100) / 100;
    const method = text(payload.method, 50) || 'unspecified';
    const reference = text(payload.reference, 120);
    const note = text(payload.note, 500);
    const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
    if (!projectId) throw workflowError(400, 'PROJECT_ID_REQUIRED', 'Project ID is required.');
    if (amount <= 0) throw workflowError(400, 'INVALID_PAYMENT', 'Payment amount must be greater than zero.');
    if (Number.isNaN(receivedAt.getTime())) throw workflowError(400, 'INVALID_PAYMENT_DATE', 'Payment date is invalid.');

    const { db, fieldValue } = getAdminServices();
    const { project, operations, merged } = await loadProjectBundle(db, projectId);
    if (!project.approvalDate) throw workflowError(409, 'PROJECT_NOT_APPROVED', 'Approve the quotation before recording payments.');

    const quotedPrice = numberValue(project.quotedPrice);
    const previouslyPaid = currentPaid(project);
    const remainingBefore = Math.max(0, quotedPrice - previouslyPaid);
    if (remainingBefore <= 0) throw workflowError(409, 'PROJECT_ALREADY_PAID', 'This project has already been paid in full.');
    if (amount > remainingBefore + 0.01) {
      throw workflowError(400, 'PAYMENT_EXCEEDS_BALANCE', `Payment cannot exceed the remaining amount of Rs. ${remainingBefore.toFixed(2)}.`);
    }

    const totalPaid = Math.min(quotedPrice, Math.round((previouslyPaid + amount) * 100) / 100);
    const paymentStatus = paymentStatusFor(totalPaid, quotedPrice, numberValue(project.advanceAmount));
    const payment = {
      paymentId: `PAY-${crypto.randomUUID()}`,
      amount,
      method,
      reference,
      note,
      receivedAt,
      recordedAt: new Date(),
      recordedByUid: authorization.user.uid,
      recordedByEmail: authorization.user.email || ''
    };
    const publicPayment = {
      paymentId: payment.paymentId,
      amount,
      method,
      reference,
      receivedAt,
      recordedAt: payment.recordedAt
    };
    const revision = expectedRevision + 1;
    const projectAfter = {
      ...merged,
      amountPaid: totalPaid,
      amountDue: Math.max(0, quotedPrice - totalPaid),
      paymentStatus,
      revision
    };
    const notification = notificationRecord({
      projectId,
      type: 'payment_received',
      recipient: project.customerEmail,
      payload: { project: projectAfter, payment: publicPayment },
      actor: authorization.user
    });

    const projectRef = db.collection('projects').doc(projectId);
    const operationsRef = db.collection('projectOperations').doc(projectId);
    const notificationRef = db.collection('projectNotifications').doc(notification.notificationId);
    const auditRef = db.collection('auditLogs').doc();

    await db.runTransaction(async transaction => {
      const [freshProject, freshOperations] = await Promise.all([
        transaction.get(projectRef),
        transaction.get(operationsRef)
      ]);
      if (!freshProject.exists) throw workflowError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
      const liveRevision = Number(freshOperations.exists
        ? freshOperations.data().revision || freshProject.data().revision || 0
        : freshProject.data().revision || 0);
      if (liveRevision !== expectedRevision) {
        throw workflowError(409, 'PROJECT_CHANGED', 'The project changed while this page was open. Refresh and try again.');
      }

      transaction.set(projectRef, {
        paymentStatus,
        amountPaid: totalPaid,
        amountDue: Math.max(0, quotedPrice - totalPaid),
        paymentHistory: fieldValue.arrayUnion(publicPayment),
        updatedAt: new Date(),
        revision
      }, { merge: true });
      transaction.set(operationsRef, {
        projectId,
        paymentLedger: fieldValue.arrayUnion(payment),
        activityLog: fieldValue.arrayUnion({
          activityId: `ACT-${Date.now()}`,
          type: 'payment_recorded',
          amount,
          method,
          reference,
          actorUid: authorization.user.uid,
          actorEmail: authorization.user.email || '',
          createdAt: new Date()
        }),
        updatedAt: new Date(),
        revision
      }, { merge: true });
      transaction.set(notificationRef, notification);
      transaction.set(auditRef, {
        action: 'project.payment.recorded',
        projectId,
        paymentId: payment.paymentId,
        amount,
        method,
        reference,
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        createdAt: new Date()
      });
    });

    let email;
    try {
      const delivery = await sendProjectNotification(notification);
      await notificationRef.set({
        status: 'sent', attempts: 1, sentAt: new Date(), lastAttemptAt: new Date(),
        messageId: delivery.messageId, error: ''
      }, { merge: true });
      email = { sent: true, notificationId: notification.notificationId };
    } catch (mailError) {
      console.error('Payment receipt email failed:', mailError);
      await notificationRef.set({
        status: 'failed', attempts: 1, lastAttemptAt: new Date(),
        error: String(mailError.message || 'Email delivery failed').slice(0, 1000)
      }, { merge: true });
      email = {
        sent: false,
        notificationId: notification.notificationId,
        error: 'Payment recorded, but the receipt email could not be delivered. Retry it from the notification history.'
      };
    }

    return jsonResponse(200, {
      success: true,
      paymentId: payment.paymentId,
      amountPaid: totalPaid,
      amountDue: Math.max(0, quotedPrice - totalPaid),
      paymentStatus,
      revision,
      email
    });
  } catch (error) {
    console.error('Payment recording failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(error.status || 500, {
      code: error.code || 'PAYMENT_RECORD_FAILED',
      error: error.status ? error.message : 'Unable to record the payment.'
    });
  }
};
