const { jsonResponse, requirePermission } = require('./_firebaseAdmin');
const {
  buildInventoryPlan,
  inventoryDocuments,
  legacyEquipmentItems
} = require('./_inventoryPlanning');
const { mergeProjectOperations } = require('./_projectPrivacy');

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  const authorization = await requirePermission(event, 'inventory.read');
  if (!authorization.authorized) return authorization.response;

  try {
    const { db } = authorization;
    const [
      inventorySnapshot,
      projectsSnapshot,
      operationsSnapshot,
      inverterSnapshot,
      batterySnapshot
    ] = await Promise.all([
      db.collection('inventory').get(),
      db.collection('projects').get(),
      db.collection('projectOperations').get(),
      db.collection('inverters').get(),
      db.collection('batteries').get()
    ]);

    const unifiedInventory = inventoryDocuments(inventorySnapshot);
    const legacyFallback = legacyEquipmentItems(
      inverterSnapshot,
      batterySnapshot,
      unifiedInventory
    );
    const operationsById = new Map(
      operationsSnapshot.docs.map(operationDoc => [operationDoc.id, operationDoc.data()])
    );
    const projects = projectsSnapshot.docs.map(projectDoc => mergeProjectOperations(
      { id: projectDoc.id, ...projectDoc.data() },
      operationsById.get(projectDoc.id)
    ));
    const plan = buildInventoryPlan([...unifiedInventory, ...legacyFallback], projects);

    return jsonResponse(200, {
      ...plan,
      hasLegacyFallback: legacyFallback.length > 0,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Unable to build inventory plan:', error);
    return jsonResponse(500, { error: 'Unable to build inventory planning data' });
  }
};
