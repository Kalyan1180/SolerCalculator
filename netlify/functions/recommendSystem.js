const crypto = require('crypto');
const {
  getAdminServices,
  jsonResponse,
  requireAnyPermission
} = require('./_firebaseAdmin');
const {
  buildInventoryPlan,
  calculatorCatalog,
  inventoryDocuments,
  legacyEquipmentItems
} = require('./_inventoryPlanning');
const { mergeProjectOperations } = require('./_projectPrivacy');
const {
  buildSystemRecommendation,
  customerRecommendation,
  finiteNumber,
  wholeNumber
} = require('./_systemRecommendation');

const RECOMMENDATION_LIFETIME_MS = 30 * 60 * 1000;

function validationError(input) {
  const unitPerDay = finiteNumber(input.unitPerDay);
  const peakLoad = finiteNumber(input.peakLoad);
  const panelCount = wholeNumber(input.panelCount);

  if (unitPerDay <= 0 || unitPerDay > 1000) return 'Daily energy must be between 0 and 1,000 kWh.';
  if (peakLoad < 0 || peakLoad > 1000) return 'Peak load must be between 0 and 1,000 kW.';
  if (!Number.isInteger(Number(input.panelCount)) || panelCount < 1 || panelCount > 500) {
    return 'Panel count must be a whole number between 1 and 500.';
  }
  return null;
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const mode = payload.mode === 'staff' ? 'staff' : 'customer';
    const input = {
      unitPerDay: finiteNumber(payload.unitPerDay),
      peakLoad: finiteNumber(payload.peakLoad),
      panelCount: wholeNumber(payload.panelCount)
    };
    const invalid = validationError(payload);
    if (invalid) return jsonResponse(400, { error: invalid });

    let staffAuthorization = null;
    if (mode === 'staff') {
      staffAuthorization = await requireAnyPermission(event, ['projects.create', 'inventory.read']);
      if (!staffAuthorization.authorized) return staffAuthorization.response;
    }

    const { db, fieldValue } = getAdminServices();
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
    const fallbackEquipment = legacyEquipmentItems(
      inverterSnapshot,
      batterySnapshot,
      unifiedInventory
    );
    const inventory = [...unifiedInventory, ...fallbackEquipment];
    const operationsById = new Map(
      operationsSnapshot.docs.map(operationDoc => [operationDoc.id, operationDoc.data()])
    );
    const projects = projectsSnapshot.docs.map(projectDoc => mergeProjectOperations(
      { id: projectDoc.id, ...projectDoc.data() },
      operationsById.get(projectDoc.id)
    ));
    const plan = buildInventoryPlan(inventory, projects);
    const catalog = calculatorCatalog(plan.items);
    const fullRecommendation = buildSystemRecommendation({ ...input, catalog });

    if (!fullRecommendation.success) {
      const publicError = 'A suitable system could not be generated for this requirement. Please contact ANT Solar for a manual assessment.';
      return jsonResponse(422, {
        error: mode === 'staff' ? fullRecommendation.error : publicError
      });
    }

    const recommendationId = `REC-${crypto.randomUUID()}`;
    const publicView = customerRecommendation(fullRecommendation, recommendationId, input);
    const recommendationRef = db.collection('recommendations').doc(recommendationId);
    await recommendationRef.set({
      recommendationId,
      audience: mode,
      createdForUid: staffAuthorization?.user?.uid || null,
      calculationInput: input,
      publicRecommendation: publicView,
      fullRecommendation,
      createdAt: fieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + RECOMMENDATION_LIFETIME_MS),
      consumedAt: null,
      consumedBy: null,
      projectId: null
    });

    if (mode === 'staff') {
      return jsonResponse(200, {
        recommendationId,
        recommendation: {
          ...fullRecommendation,
          recommendationId,
          calculationInput: input
        }
      });
    }

    return jsonResponse(200, { recommendation: publicView });
  } catch (error) {
    console.error('System recommendation failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(500, { error: 'Unable to calculate the system requirement at this time.' });
  }
};
