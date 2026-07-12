const { jsonResponse, requirePermission } = require('./_firebaseAdmin');
const {
  buildInventoryPlan,
  inventoryDocuments,
  legacyEquipmentItems,
  projectStockPlan
} = require('./_inventoryPlanning');
const { mergeProjectOperations } = require('./_projectPrivacy');

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
    const [
      projectSnapshot,
      projectOperationsSnapshot,
      inventorySnapshot,
      projectsSnapshot,
      operationsSnapshot,
      inverterSnapshot,
      batterySnapshot
    ] = await Promise.all([
      db.collection('projects').doc(projectId).get(),
      db.collection('projectOperations').doc(projectId).get(),
      db.collection('inventory').get(),
      db.collection('projects').get(),
      db.collection('projectOperations').get(),
      db.collection('inverters').get(),
      db.collection('batteries').get()
    ]);

    if (!projectSnapshot.exists) return jsonResponse(404, { error: 'Project not found' });

    const unifiedInventory = inventoryDocuments(inventorySnapshot);
    const legacyFallback = legacyEquipmentItems(
      inverterSnapshot,
      batterySnapshot,
      unifiedInventory
    );
    const inventory = [...unifiedInventory, ...legacyFallback];
    const operationsById = new Map(
      operationsSnapshot.docs.map(operationDoc => [operationDoc.id, operationDoc.data()])
    );
    const projects = projectsSnapshot.docs.map(projectDoc => mergeProjectOperations(
      { id: projectDoc.id, ...projectDoc.data() },
      operationsById.get(projectDoc.id)
    ));
    const plan = buildInventoryPlan(inventory, projects);
    const project = mergeProjectOperations(
      { id: projectSnapshot.id, ...projectSnapshot.data() },
      projectOperationsSnapshot.exists ? projectOperationsSnapshot.data() : null
    );

    return jsonResponse(200, {
      plan: projectStockPlan(project, plan),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Unable to build project stock plan:', error);
    return jsonResponse(500, { error: 'Unable to calculate quotation supply requirements' });
  }
};
