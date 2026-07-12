const { getAdminServices, jsonResponse, requirePermission } = require('./_firebaseAdmin');
const {
  buildInventoryPlan,
  calculatorCatalog,
  inventoryDocuments,
  legacyEquipmentItems
} = require('./_inventoryPlanning');
const { mergeProjectOperations } = require('./_projectPrivacy');

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function inverterShape(item) {
  return {
    ...item,
    peakLoad: numberValue(item.specs?.peakLoad),
    maxPanels: numberValue(item.specs?.maxPanels),
    batterySupported: numberValue(item.specs?.batterySupported),
    cost: numberValue(item.costPrice)
  };
}

function batteryShape(item) {
  return {
    ...item,
    capacity: numberValue(item.specs?.capacity),
    energy: numberValue(item.specs?.energy),
    voltage: numberValue(item.specs?.voltage) || 12,
    price: numberValue(item.costPrice)
  };
}

function panelShape(item) {
  return {
    ...item,
    wattage: numberValue(item.specs?.wattage),
    technology: String(item.specs?.technology || ''),
    cost: numberValue(item.costPrice)
  };
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  const authorization = await requirePermission(event, 'inventory.read');
  if (!authorization.authorized) return authorization.response;

  try {
    const { db } = getAdminServices();
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
    const inventory = [...unifiedInventory, ...legacyFallback];
    const operationsById = new Map(
      operationsSnapshot.docs.map(operationDoc => [operationDoc.id, operationDoc.data()])
    );
    const projects = projectsSnapshot.docs.map(projectDoc => mergeProjectOperations(
      { id: projectDoc.id, ...projectDoc.data() },
      operationsById.get(projectDoc.id)
    ));
    const plan = buildInventoryPlan(inventory, projects);
    const catalog = calculatorCatalog(plan.items);

    const inverters = catalog
      .filter(item => item.type === 'inverter')
      .map(inverterShape)
      .filter(item => item.name && item.peakLoad > 0 && item.maxPanels > 0)
      .sort((a, b) => {
        const shortageDifference = Math.max(0, 1 - a.availableQuantity) - Math.max(0, 1 - b.availableQuantity);
        return shortageDifference || a.cost - b.cost || a.peakLoad - b.peakLoad;
      });

    const batteries = catalog
      .filter(item => item.type === 'battery')
      .map(batteryShape)
      .filter(item => item.name && item.energy > 0 && item.capacity > 0)
      .sort((a, b) => b.availableQuantity - a.availableQuantity || a.price - b.price);

    const panels = catalog
      .filter(item => item.type === 'panel')
      .map(panelShape)
      .filter(item => item.name && item.wattage > 0)
      .sort((a, b) => b.availableQuantity - a.availableQuantity || a.cost - b.cost);

    const accessories = catalog
      .filter(item => ['wiring', 'mounting', 'other'].includes(item.type))
      .filter(item => item.specs?.autoInclude)
      .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

    return jsonResponse(200, {
      source: 'inventory',
      inverters,
      batteries,
      panels,
      accessories,
      inventory: catalog,
      hasLegacyFallback: legacyFallback.length > 0,
      planningUpdatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching protected planning data:', error);
    return jsonResponse(500, { error: 'Unable to load planning data' });
  }
};
