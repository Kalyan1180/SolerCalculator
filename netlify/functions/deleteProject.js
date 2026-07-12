const {
  getAdminServices,
  jsonResponse,
  requirePermission
} = require('./_firebaseAdmin');
const { loadProjectBundle, text, workflowError } = require('./_projectWorkflow');

exports.handler = async event => {
  if (event.httpMethod !== 'DELETE') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'DELETE' });
  }

  const authorization = await requirePermission(event, 'projects.delete');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const projectId = text(payload.projectId, 200);
    const confirmation = text(payload.confirmation, 200);
    const reason = text(payload.reason, 1000);
    if (!projectId) throw workflowError(400, 'PROJECT_ID_REQUIRED', 'Project ID is required.');
    if (confirmation !== projectId) {
      throw workflowError(400, 'DELETE_CONFIRMATION_REQUIRED', 'Type the full project ID to confirm deletion.');
    }
    if (reason.length < 5) throw workflowError(400, 'DELETE_REASON_REQUIRED', 'Enter a reason for deleting this project.');

    const { db } = getAdminServices();
    await loadProjectBundle(db, projectId);
    const projectRef = db.collection('projects').doc(projectId);
    const operationsRef = db.collection('projectOperations').doc(projectId);
    const archiveRef = db.collection('deletedProjects').doc(projectId);
    const auditRef = db.collection('auditLogs').doc();
    const deletedAt = new Date();

    await db.runTransaction(async transaction => {
      const [projectSnapshot, operationsSnapshot] = await Promise.all([
        transaction.get(projectRef),
        transaction.get(operationsRef)
      ]);
      if (!projectSnapshot.exists) throw workflowError(404, 'PROJECT_NOT_FOUND', 'Project not found.');

      transaction.set(archiveRef, {
        projectId,
        project: projectSnapshot.data(),
        operations: operationsSnapshot.exists ? operationsSnapshot.data() : null,
        deletedAt,
        deletedByUid: authorization.user.uid,
        deletedByEmail: authorization.user.email || '',
        reason
      });
      transaction.delete(projectRef);
      if (operationsSnapshot.exists) transaction.delete(operationsRef);
      transaction.set(auditRef, {
        action: 'project.deleted',
        projectId,
        customerEmail: projectSnapshot.data().customerEmail || '',
        previousStatus: projectSnapshot.data().status || '',
        quotedPrice: Number(projectSnapshot.data().quotedPrice || 0),
        reason,
        archiveCollection: 'deletedProjects',
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        createdAt: deletedAt
      });
    });

    return jsonResponse(200, {
      success: true,
      message: 'Project removed from active operations and preserved in the deletion archive.'
    });
  } catch (error) {
    console.error('Project deletion failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(error.status || 500, {
      code: error.code || 'PROJECT_DELETE_FAILED',
      error: error.status ? error.message : 'Unable to delete the project.'
    });
  }
};
