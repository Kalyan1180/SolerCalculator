const {
  getAdminServices,
  jsonResponse,
  requirePermission
} = require('./_firebaseAdmin');
const { sendProjectNotification } = require('./_projectMailer');
const {
  loadProjectBundle,
  notificationRecord,
  text,
  workflowError
} = require('./_projectWorkflow');

function validDate(value, fieldName) {
  if (!value) return null;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) throw workflowError(400, 'INVALID_SURVEY_DATE', `${fieldName} is invalid.`);
  return date;
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
    const action = text(payload.action, 30);
    const expectedRevision = Number(payload.expectedRevision || 0);
    if (!projectId) throw workflowError(400, 'PROJECT_ID_REQUIRED', 'Project ID is required.');
    if (!['schedule', 'complete'].includes(action)) {
      throw workflowError(400, 'INVALID_SURVEY_ACTION', 'Choose schedule or complete for the site survey.');
    }

    const { db, fieldValue } = getAdminServices();
    const { project, operations, merged } = await loadProjectBundle(db, projectId);
    if (['approved', 'installation_scheduled', 'in_progress', 'completed'].includes(project.status) && action === 'schedule') {
      throw workflowError(409, 'SURVEY_ALREADY_REQUIRED', 'The project has already moved beyond quotation approval.');
    }

    const existingSurvey = operations.siteSurvey && typeof operations.siteSurvey === 'object'
      ? operations.siteSurvey
      : {};
    const scheduledDate = validDate(payload.scheduledDate || existingSurvey.scheduledDate, 'Survey date');
    const surveyor = text(payload.surveyor || existingSurvey.surveyor, 150);
    const customerMessage = text(payload.customerMessage, 1000);
    const findings = text(payload.findings || existingSurvey.findings, 3000);
    const roofType = text(payload.roofType || existingSurvey.roofType, 120);
    const meterType = text(payload.meterType || existingSurvey.meterType, 120);
    const shadowAssessment = text(payload.shadowAssessment || existingSurvey.shadowAssessment, 1000);
    const sanctionedLoad = text(payload.sanctionedLoad || existingSurvey.sanctionedLoad, 120);
    const recommendedCapacity = text(payload.recommendedCapacity || existingSurvey.recommendedCapacity, 120);

    if (!scheduledDate) throw workflowError(400, 'SURVEY_DATE_REQUIRED', 'Choose the site survey date.');
    if (!surveyor) throw workflowError(400, 'SURVEYOR_REQUIRED', 'Assign a surveyor before saving the site survey.');
    if (action === 'complete' && findings.length < 10) {
      throw workflowError(400, 'SURVEY_FINDINGS_REQUIRED', 'Record the technical survey findings before marking the survey complete.');
    }

    const now = new Date();
    const status = action === 'schedule' ? 'scheduled' : 'completed';
    const completedDate = action === 'complete' ? now : null;
    const revision = expectedRevision + 1;
    const survey = {
      status,
      scheduledDate,
      completedDate,
      surveyor,
      findings,
      roofType,
      meterType,
      shadowAssessment,
      sanctionedLoad,
      recommendedCapacity,
      updatedAt: now,
      updatedByUid: authorization.user.uid,
      updatedByEmail: authorization.user.email || ''
    };
    const projectAfter = {
      ...merged,
      siteSurveyStatus: status,
      siteSurveyScheduledDate: scheduledDate,
      siteSurveyCompletedDate: completedDate || project.siteSurveyCompletedDate || null,
      siteSurveySummary: customerMessage,
      revision
    };
    const notification = notificationRecord({
      projectId,
      type: action === 'schedule' ? 'site_survey_scheduled' : 'site_survey_completed',
      recipient: project.customerEmail,
      payload: { project: projectAfter, survey, action: status, note: customerMessage },
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
        siteSurveyStatus: status,
        siteSurveyScheduledDate: scheduledDate,
        siteSurveyCompletedDate: completedDate || freshProject.data().siteSurveyCompletedDate || null,
        siteSurveySummary: customerMessage,
        siteSurveyHistory: fieldValue.arrayUnion({
          action: status,
          scheduledDate,
          completedDate,
          message: customerMessage,
          changedAt: now
        }),
        updatedAt: now,
        revision
      }, { merge: true });
      transaction.set(operationsRef, {
        projectId,
        siteSurvey: survey,
        activityLog: fieldValue.arrayUnion({
          activityId: `ACT-${Date.now()}`,
          type: `site_survey_${status}`,
          summary: `${status === 'scheduled' ? 'Site survey scheduled' : 'Site survey completed'} by ${surveyor}`,
          actorUid: authorization.user.uid,
          actorEmail: authorization.user.email || '',
          createdAt: now
        }),
        updatedAt: now,
        revision
      }, { merge: true });
      transaction.set(notificationRef, notification);
      transaction.set(auditRef, {
        action: `project.site-survey.${status}`,
        projectId,
        surveyor,
        scheduledDate,
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        notificationId: notification.notificationId,
        createdAt: now
      });
    });

    let email;
    try {
      const delivery = await sendProjectNotification(notification);
      await notificationRef.set({
        status: 'sent',
        attempts: 1,
        sentAt: new Date(),
        lastAttemptAt: new Date(),
        messageId: delivery.messageId,
        attachmentName: delivery.attachmentName || '',
        error: ''
      }, { merge: true });
      email = { sent: true, notificationId: notification.notificationId };
    } catch (mailError) {
      console.error('Site survey email failed:', mailError);
      await notificationRef.set({
        status: 'failed',
        attempts: 1,
        lastAttemptAt: new Date(),
        error: String(mailError.message || 'Email delivery failed').slice(0, 1000)
      }, { merge: true });
      email = {
        sent: false,
        notificationId: notification.notificationId,
        error: 'Site survey was saved, but the customer email failed. Retry it from communication history.'
      };
    }

    return jsonResponse(200, { success: true, status, revision, email });
  } catch (error) {
    console.error('Site survey update failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(error.status || 500, {
      code: error.code || 'SITE_SURVEY_UPDATE_FAILED',
      error: error.status ? error.message : 'Unable to update the site survey.'
    });
  }
};
