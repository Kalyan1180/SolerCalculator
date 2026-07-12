const {
  getAdminServices,
  jsonResponse,
  requirePermission
} = require('./_firebaseAdmin');
const { sendProjectNotification } = require('./_projectMailer');
const {
  buildEditedSystem,
  calculateTerms,
  customerVisibleChanges,
  loadInventoryContext,
  loadProjectBundle,
  notificationRecord,
  numberValue,
  text,
  workflowError
} = require('./_projectWorkflow');

function validDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value._seconds) return new Date(Number(value._seconds) * 1000);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw workflowError(400, 'INVALID_DATE', 'Project date is invalid.');
  return date;
}

function paidAmount(project) {
  const historyTotal = Array.isArray(project?.paymentHistory)
    ? project.paymentHistory.reduce((sum, entry) => sum + Math.max(0, numberValue(entry?.amount)), 0)
    : 0;
  return Math.max(historyTotal, Math.max(0, numberValue(project?.amountPaid)));
}

function validateBackupEnergy(operations, system) {
  const selectedBattery = system.operationalUpdates?.battery?.selectedBattery;
  if (!selectedBattery) return;

  const requiredEnergy = Math.max(0, numberValue(operations.calculationInput?.unitPerDay) * 3 / 5);
  if (requiredEnergy <= 0) return;

  const batteryEnergy = Math.max(0, numberValue(
    selectedBattery.specs?.energy ?? selectedBattery.energy
  ));
  const batteryQuantity = Math.max(0, numberValue(system.operationalUpdates.battery.quantity));
  const suppliedEnergy = batteryEnergy * batteryQuantity;
  if (batteryEnergy <= 0 || suppliedEnergy + 0.0001 < requiredEnergy) {
    throw workflowError(
      400,
      'BATTERY_CAPACITY_INSUFFICIENT',
      `The selected battery combination supplies ${suppliedEnergy.toFixed(2)} kWh, below the required ${requiredEnergy.toFixed(2)} kWh backup capacity.`
    );
  }
}

function customerFields(payload, current) {
  const customerName = text(payload.customerName ?? current.customerName, 100);
  const customerEmail = text(payload.customerEmail ?? current.customerEmail, 160).toLowerCase();
  const customerPhone = text(payload.customerPhone ?? current.customerPhone, 30);
  const address = text(payload.address ?? current.address, 500);
  if (!customerName) throw workflowError(400, 'INVALID_CUSTOMER', 'Customer name is required.');
  if (!/^\S+@\S+\.\S+$/.test(customerEmail)) throw workflowError(400, 'INVALID_CUSTOMER', 'A valid customer email is required.');
  if (!customerPhone) throw workflowError(400, 'INVALID_CUSTOMER', 'Customer phone is required.');
  if (!address) throw workflowError(400, 'INVALID_CUSTOMER', 'Installation address is required.');
  return { customerName, customerEmail, customerPhone, address };
}

async function markNotification(db, notificationId, values) {
  await db.collection('projectNotifications').doc(notificationId).set(values, { merge: true });
}

exports.handler = async event => {
  if (event.httpMethod !== 'PUT') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'PUT' });
  }

  const authorization = await requirePermission(event, 'projects.update');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const projectId = text(payload.projectId, 200);
    if (!projectId) return jsonResponse(400, { error: 'Project ID is required' });

    const { db, fieldValue } = getAdminServices();
    const [{ project, operations, merged }, inventoryContext] = await Promise.all([
      loadProjectBundle(db, projectId),
      loadInventoryContext(db)
    ]);

    const expectedRevision = Number(payload.expectedRevision ?? merged.revision ?? 0);
    const currentPaid = paidAmount(project);
    const requestedTerms = calculateTerms({
      quotedPrice: payload.quotedPrice ?? project.quotedPrice,
      advancePercentage: payload.advancePercentage ?? project.advancePercentage ?? 50,
      advanceAmount: payload.advanceAmount ?? project.advanceAmount,
      mode: payload.advanceMode === 'amount' ? 'amount' : 'percentage'
    });

    const commercialChanged = (
      Math.abs(requestedTerms.quotedPrice - numberValue(project.quotedPrice)) > 0.009
      || Math.abs(requestedTerms.advanceAmount - numberValue(project.advanceAmount)) > 0.009
    );
    if (currentPaid > 0 && commercialChanged) {
      throw workflowError(409, 'PAYMENTS_LOCK_COMMERCIALS', 'Price and advance terms cannot be changed after a payment has been recorded. Correct the payment ledger before revising commercial terms.');
    }

    const system = buildEditedSystem({ project, operations, plan: inventoryContext.plan, payload });
    validateBackupEnergy(operations, system);
    const customers = customerFields(payload, project);
    const scheduledDate = validDate(payload.installationScheduledDate ?? project.installationScheduledDate);
    const now = new Date();
    const publicUpdates = {
      ...customers,
      ...system.publicUpdates,
      ...requestedTerms,
      finalPrice: project.approvalDate ? requestedTerms.quotedPrice : project.finalPrice || null,
      amountPaid: currentPaid,
      amountDue: Math.max(0, requestedTerms.quotedPrice - currentPaid),
      installationScheduledDate: scheduledDate,
      customerNotes: text(payload.customerNotes ?? project.customerNotes, 1000),
      updatedAt: now,
      revision: expectedRevision + 1
    };
    const operationalUpdates = {
      ...system.operationalUpdates,
      adminNotes: text(payload.adminNotes ?? operations.adminNotes, 2000),
      technicalNotes: text(payload.technicalNotes ?? operations.technicalNotes, 3000),
      installationCoordinator: text(payload.installationCoordinator ?? operations.installationCoordinator, 150),
      salesOwner: text(payload.salesOwner ?? operations.salesOwner, 150),
      targetCompletionDate: validDate(payload.targetCompletionDate ?? operations.targetCompletionDate),
      updatedAt: now,
      revision: expectedRevision + 1
    };

    const after = { ...merged, ...publicUpdates, ...operationalUpdates };
    const changes = customerVisibleChanges(merged, after);
    const notifyCustomer = Boolean(payload.notifyCustomer) && changes.length > 0;
    const notification = notifyCustomer
      ? notificationRecord({
        projectId,
        type: 'project_changed',
        recipient: publicUpdates.customerEmail,
        payload: { project: after, changes },
        actor: authorization.user
      })
      : null;

    const projectRef = db.collection('projects').doc(projectId);
    const operationsRef = db.collection('projectOperations').doc(projectId);
    const auditRef = db.collection('auditLogs').doc();
    const notificationRef = notification
      ? db.collection('projectNotifications').doc(notification.notificationId)
      : null;

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
        throw workflowError(409, 'PROJECT_CHANGED', 'This project was changed by another user. Refresh the workspace and try again.');
      }

      transaction.set(projectRef, publicUpdates, { merge: true });
      transaction.set(operationsRef, {
        projectId,
        ...operationalUpdates,
        activityLog: fieldValue.arrayUnion({
          activityId: `ACT-${Date.now()}`,
          type: 'project_edited',
          summary: changes.length ? changes.map(change => change.label).join(', ') : 'Internal project fields updated',
          actorUid: authorization.user.uid,
          actorEmail: authorization.user.email || '',
          createdAt: now
        })
      }, { merge: true });
      transaction.set(auditRef, {
        action: 'project.updated',
        projectId,
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        changedFields: changes.map(change => change.label),
        notifyCustomer,
        createdAt: now
      });
      if (notificationRef) transaction.set(notificationRef, notification);
    });

    let email = { attempted: false, sent: false };
    if (notification) {
      email.attempted = true;
      try {
        const delivery = await sendProjectNotification(notification);
        await markNotification(db, notification.notificationId, {
          status: 'sent',
          attempts: 1,
          sentAt: new Date(),
          lastAttemptAt: new Date(),
          messageId: delivery.messageId,
          error: ''
        });
        email = { attempted: true, sent: true, notificationId: notification.notificationId };
      } catch (mailError) {
        console.error('Project revision email failed:', mailError);
        await markNotification(db, notification.notificationId, {
          status: 'failed',
          attempts: 1,
          lastAttemptAt: new Date(),
          error: String(mailError.message || 'Email delivery failed').slice(0, 1000)
        });
        email = {
          attempted: true,
          sent: false,
          notificationId: notification.notificationId,
          error: 'Project saved, but the customer email could not be delivered. Retry it from the notification history.'
        };
      }
    }

    return jsonResponse(200, {
      success: true,
      revision: expectedRevision + 1,
      changes,
      email,
      stockAssessment: system.operationalUpdates.inventoryAssessment
    });
  } catch (error) {
    console.error('Project update failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(error.status || 500, {
      code: error.code || 'PROJECT_UPDATE_FAILED',
      error: error.status ? error.message : 'Unable to update the project.'
    });
  }
};
