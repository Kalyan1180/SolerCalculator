const { jsonResponse, requirePermission } = require('./_firebaseAdmin');
const {
  equipmentOptions,
  loadInventoryContext,
  loadProjectBundle,
  projectStockPlan,
  timestampMillis
} = require('./_projectWorkflow');

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  const authorization = await requirePermission(event, 'projects.read');
  if (!authorization.authorized) return authorization.response;

  const projectId = String(event.queryStringParameters?.projectId || '').trim();
  if (!projectId) return jsonResponse(400, { error: 'Project ID is required' });

  try {
    const { db } = authorization;
    const [{ merged }, inventoryContext, notificationSnapshot] = await Promise.all([
      loadProjectBundle(db, projectId),
      loadInventoryContext(db),
      db.collection('projectNotifications').where('projectId', '==', projectId).get()
    ]);

    const notifications = notificationSnapshot.docs
      .map(notificationDoc => ({ id: notificationDoc.id, ...notificationDoc.data(), payload: undefined }))
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
      .slice(0, 50);
    const equipment = equipmentOptions(inventoryContext.plan);

    return jsonResponse(200, {
      project: {
        ...merged,
        siteSurveyStatus: merged.siteSurveyStatus || merged.siteSurvey?.status || 'not_scheduled',
        revision: Number(merged.revision || 0)
      },
      equipment,
      stockPlan: projectStockPlan(merged, inventoryContext.plan),
      notifications,
      capabilities: {
        canUpdate: authorization.permissions.includes('projects.update'),
        canDelete: authorization.permissions.includes('projects.delete'),
        canRecordPayments: authorization.permissions.includes('projects.payments'),
        canSendNotifications: authorization.permissions.includes('notifications.send'),
        canSeedPanels: authorization.permissions.includes('inventory.write')
      },
      setupRequired: {
        panelModels: equipment.panels.length === 0
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Unable to load project workspace:', error);
    return jsonResponse(error.status || 500, {
      code: error.code || 'PROJECT_WORKSPACE_FAILED',
      error: error.status ? error.message : 'Unable to load the project workspace.'
    });
  }
};
