const crypto = require('crypto');
const {
  authorize,
  getAdminServices,
  jsonResponse,
  roleHasPermission
} = require('./_firebaseAdmin');

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function fail(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}

function validateCustomer(payload) {
  const customer = {
    name: cleanText(payload.name, 100),
    email: cleanText(payload.email, 160).toLowerCase(),
    phone: cleanText(payload.phone, 30),
    address: cleanText(payload.address, 500),
    additionalNotes: cleanText(payload.additionalNotes, 1000)
  };
  if (!customer.name) fail(400, 'INVALID_CUSTOMER', 'Customer name is required.');
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) fail(400, 'INVALID_CUSTOMER', 'A valid customer email is required.');
  if (!customer.phone) fail(400, 'INVALID_CUSTOMER', 'Customer phone is required.');
  if (!customer.address) fail(400, 'INVALID_CUSTOMER', 'Installation address is required.');
  return customer;
}

function createProjectId() {
  return `PRJ-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await authorize(event);
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const recommendationId = cleanText(payload.recommendationId, 100);
    if (!/^REC-[0-9a-f-]{36}$/i.test(recommendationId)) {
      return jsonResponse(400, { code: 'INVALID_RECOMMENDATION', error: 'A valid calculator recommendation is required.' });
    }

    const customer = validateCustomer(payload);
    const canCreateManagedProject = roleHasPermission(authorization.role, 'projects.create');
    const managedProject = Boolean(payload.managedProject);
    if (managedProject && !canCreateManagedProject) {
      return jsonResponse(403, { code: 'PERMISSION_DENIED', error: 'You do not have permission to create a managed project.' });
    }

    const { db, fieldValue } = getAdminServices();
    const recommendationRef = db.collection('recommendations').doc(recommendationId);
    const projectId = createProjectId();
    const projectRef = db.collection('projects').doc(projectId);

    await db.runTransaction(async transaction => {
      const recommendationSnapshot = await transaction.get(recommendationRef);
      if (!recommendationSnapshot.exists) {
        fail(404, 'RECOMMENDATION_NOT_FOUND', 'The calculator result is no longer available. Please calculate the system again.');
      }

      const stored = recommendationSnapshot.data();
      if (stored.consumedAt || stored.projectId) {
        fail(409, 'RECOMMENDATION_USED', 'This calculator result has already been submitted.');
      }
      if (timestampMillis(stored.expiresAt) <= Date.now()) {
        fail(410, 'RECOMMENDATION_EXPIRED', 'The calculator result expired. Please calculate the system again.');
      }
      if (stored.createdForUid && stored.createdForUid !== authorization.user.uid) {
        fail(403, 'RECOMMENDATION_OWNER_MISMATCH', 'This calculator result belongs to another signed-in user.');
      }
      if (managedProject && stored.audience !== 'staff') {
        fail(400, 'STAFF_RECOMMENDATION_REQUIRED', 'Generate the recommendation from the managed-project workspace.');
      }

      const recommendation = stored.fullRecommendation;
      if (!recommendation?.success || !Array.isArray(recommendation.billOfMaterials)) {
        fail(422, 'INVALID_RECOMMENDATION', 'The calculator result cannot be used to create a quotation.');
      }

      const suggestedPrice = managedProject ? finiteNumber(payload.suggestedPrice) : finiteNumber(recommendation.offerPrice);
      if (suggestedPrice <= 0) fail(400, 'INVALID_PRICE', 'Quoted price must be greater than zero.');

      const now = fieldValue.serverTimestamp();
      const newProject = {
        projectId,
        customerId: managedProject ? null : authorization.user.uid,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        address: customer.address,

        status: 'quote_pending',
        panelCount: finiteNumber(recommendation.panelCount),
        panel: recommendation.panel,
        inverter: recommendation.inverter,
        battery: recommendation.battery || null,
        billOfMaterials: recommendation.billOfMaterials,
        inventoryAssessment: recommendation.inventoryAssessment,
        calculationInput: stored.calculationInput || {},
        recommendationId,

        materialCost: finiteNumber(recommendation.materialCost),
        laborCost: finiteNumber(recommendation.laborCost),
        totalCostWithoutMarkup: finiteNumber(recommendation.totalCostWithoutMarkup),
        totalCostWithMarkup: finiteNumber(recommendation.totalCostWithMarkup),
        quotedPrice: suggestedPrice,
        finalPrice: null,

        advancePercentage: 50,
        advanceAmount: null,
        balanceAmount: null,
        paymentStatus: 'not_started',
        paymentHistory: [],

        createdAt: now,
        updatedAt: now,
        quoteSentDate: null,
        approvalDate: null,
        installationScheduledDate: null,
        installationStartDate: null,
        completionDate: null,

        adminNotes: '',
        customerNotes: customer.additionalNotes,
        technicalNotes: '',
        sitePhotos: [],
        techniciansAssigned: [],
        customerSignoff: false,
        completionNotes: '',
        createdByUid: authorization.user.uid,
        createdByRole: authorization.role,
        managedProject
      };

      transaction.set(projectRef, newProject);
      transaction.update(recommendationRef, {
        consumedAt: now,
        consumedBy: authorization.user.uid,
        projectId
      });
    });

    return jsonResponse(201, {
      success: true,
      projectId,
      message: managedProject ? 'Project created successfully.' : 'Your solar requirement was submitted successfully.'
    });
  } catch (error) {
    console.error('Quotation creation failed:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { code: 'INVALID_JSON', error: 'Invalid JSON request body' });
    return jsonResponse(error.status || 500, {
      code: error.code || 'QUOTATION_CREATE_FAILED',
      error: error.status ? error.message : 'Unable to submit the quotation at this time.'
    });
  }
};
