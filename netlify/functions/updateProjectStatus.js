const {
  getAdminServices,
  jsonResponse,
  requirePermission
} = require('./_firebaseAdmin');
const { sendProjectNotification } = require('./_projectMailer');
const {
  STATUS_TRANSITIONS,
  calculateTerms,
  loadProjectBundle,
  notificationRecord,
  numberValue,
  paymentTotal,
  statusDateUpdates,
  text,
  workflowError
} = require('./_projectWorkflow');

function amountPaid(project) {
  const ledgerTotal = paymentTotal(project);
  const recordedTotal = numberValue(project?.amountPaid);
  const statusFallback = project?.paymentStatus === 'balance_paid'
    ? numberValue(project?.quotedPrice)
    : project?.paymentStatus === 'advance_paid'
      ? numberValue(project?.advanceAmount)
      : 0;
  return Math.max(0, ledgerTotal, recordedTotal, statusFallback);
}

function minimumCompletionPayment(project) {
  return Math.round(numberValue(project?.quotedPrice) * 0.5 * 100) / 100;
}

function assertCompletionPayment(project) {
  const minimum = minimumCompletionPayment(project);
  const paid = amountPaid(project);
  if (minimum <= 0) {
    throw workflowError(409, 'PROJECT_PRICE_REQUIRED', 'Set a valid quoted price before completing the installation.');
  }
  if (paid + 0.01 < minimum) {
    const remaining = Math.max(0, minimum - paid);
    throw workflowError(
      409,
      'MINIMUM_PAYMENT_REQUIRED',
      `At least 50% of the quoted amount must be recorded before completion. Received Rs. ${paid.toFixed(2)}; minimum required Rs. ${minimum.toFixed(2)}; remaining Rs. ${remaining.toFixed(2)}.`
    );
  }
}

async function updateDelivery(db, notificationId, values) {
  await db.collection('projectNotifications').doc(notificationId).set(values, { merge: true });
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await requirePermission(event, 'projects.update');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const projectId = text(payload.projectId, 200);
    const newStatus = text(payload.status, 50);
    const note = text(payload.customerMessage, 1000);
    const expectedRevision = Number(payload.expectedRevision || 0);
    if (!projectId) throw workflowError(400, 'PROJECT_ID_REQUIRED', 'Project ID is required.');

    const { db, fieldValue } = getAdminServices();
    const { project, merged } = await loadProjectBundle(db, projectId);
    const previousStatus = project.status;
    const allowed = STATUS_TRANSITIONS[previousStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw workflowError(409, 'INVALID_STATUS_TRANSITION', `Cannot change project from ${previousStatus} to ${newStatus}.`);
    }
    if (newStatus === 'approved' && project.siteSurveyStatus !== 'completed') {
      throw workflowError(
        409,
        'SITE_SURVEY_REQUIRED',
        'Complete and record the site survey before approving the quotation.'
      );
    }
    if (newStatus === 'completed') assertCompletionPayment(project);

    const now = new Date();
    const scheduledDate = payload.installationScheduledDate ? new Date(payload.installationScheduledDate) : null;
    if (scheduledDate && Number.isNaN(scheduledDate.getTime())) {
      throw workflowError(400, 'INVALID_DATE', 'Installation date is invalid.');
    }

    const publicUpdates = {
      status: newStatus,
      updatedAt: now,
      revision: expectedRevision + 1,
      ...statusDateUpdates(newStatus, now, scheduledDate)
    };
    if (newStatus === 'approved') {
      const terms = calculateTerms({
        quotedPrice: project.quotedPrice,
        advancePercentage: project.advancePercentage || 50,
        advanceAmount: project.advanceAmount,
        mode: project.advanceAmount ? 'amount' : 'percentage'
      });
      Object.assign(publicUpdates, terms, { finalPrice: terms.quotedPrice });
    }

    const projectAfter = { ...merged, ...publicUpdates };
    const notification = notificationRecord({
      projectId,
      type: 'status_changed',
      recipient: project.customerEmail,
      payload: { project: projectAfter, previousStatus, newStatus, note },
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
      const liveProject = freshProject.data();
      const liveStatus = liveProject.status;
      const liveRevision = Number(freshOperations.exists
        ? freshOperations.data().revision || liveProject.revision || 0
        : liveProject.revision || 0);
      if (liveRevision !== expectedRevision || liveStatus !== previousStatus) {
        throw workflowError(409, 'PROJECT_CHANGED', 'The project changed while this page was open. Refresh and try again.');
      }
      if (newStatus === 'approved' && liveProject.siteSurveyStatus !== 'completed') {
        throw workflowError(409, 'SITE_SURVEY_REQUIRED', 'Complete the site survey before approving the quotation.');
      }
      if (newStatus === 'completed') assertCompletionPayment(liveProject);

      transaction.set(projectRef, {
        ...publicUpdates,
        statusHistory: fieldValue.arrayUnion({
          from: previousStatus,
          to: newStatus,
          message: note,
          changedAt: now
        })
      }, { merge: true });
      transaction.set(operationsRef, {
        projectId,
        revision: expectedRevision + 1,
        updatedAt: now,
        activityLog: fieldValue.arrayUnion({
          activityId: `ACT-${Date.now()}`,
          type: 'status_changed',
          from: previousStatus,
          to: newStatus,
          note,
          actorUid: authorization.user.uid,
          actorEmail: authorization.user.email || '',
          createdAt: now
        })
      }, { merge: true });
      transaction.set(notificationRef, notification);
      transaction.set(auditRef, {
        action: 'project.status.updated',
        projectId,
        previousStatus,
        newStatus,
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        notificationId: notification.notificationId,
        minimumPaymentChecked: newStatus === 'completed',
        createdAt: now
      });
    });

    let email;
    try {
      const delivery = await sendProjectNotification(notification);
      await updateDelivery(db, notification.notificationId, {
        status: 'sent',
        attempts: 1,
        sentAt: new Date(),
        lastAttemptAt: new Date(),
        messageId: delivery.messageId,
        attachmentName: delivery.attachmentName || '',
        error: ''
      });
      email = {
        sent: true,
        notificationId: notification.notificationId,
        attachmentName: delivery.attachmentName || ''
      };
    } catch (mailError) {
      console.error('Automatic status email failed:', mailError);
      await updateDelivery(db, notification.notificationId, {
        status: 'failed',
        attempts: 1,
        lastAttemptAt: new Date(),
        error: String(mailError.message || 'Email delivery failed').slice(0, 1000)
      });
      email = {
        sent: false,
        notificationId: notification.notificationId,
        error: 'Status updated, but the customer email or document attachment failed. Retry it from the notification history.'
      };
    }

    return jsonResponse(200, {
      success: true,
      status: newStatus,
      revision: expectedRevision + 1,
      email
    });
  } catch (error) {
    console.error('Status update failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(error.status || 500, {
      code: error.code || 'STATUS_UPDATE_FAILED',
      error: error.status ? error.message : 'Unable to update the project status.'
    });
  }
};
