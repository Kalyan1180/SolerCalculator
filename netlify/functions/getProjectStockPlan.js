const { jsonResponse, requirePermission } = require('./_firebaseAdmin');
const {
  buildInventoryPlan,
  inventoryDocuments,
  legacyEquipmentItems,
  projectStockPlan
} = require('./_inventoryPlanning');

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
    const [projectSnapshot, inventorySnapshot, projectsSnapshot, inverterSnapshot, batterySnapshot] = await Promise.all([
      db.collection('projects').doc(projectId).get(),
      db.collection('inventory').get(),
      db.collection('projects').get(),
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
    const projects = projectsSnapshot.docs.map(projectDoc => ({ id: projectDoc.id, ...projectDoc.data() }));
    const plan = buildInventoryPlan(inventory, projects);
    const project = { id: projectSnapshot.id, ...projectSnapshot.data() };

    return jsonResponse(200, {
      plan: projectStockPlan(project, plan),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Unable to build project stock plan:', error);
    return jsonResponse(500, { error: 'Unable to calculate quotation stock requirements' });
  }
};
