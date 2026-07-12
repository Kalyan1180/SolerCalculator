const crypto = require('crypto');
const {
  authorize,
  getAdminServices,
  jsonResponse,
  roleHasPermission
} = require('./_firebaseAdmin');
const { publicBattery, publicEquipment } = require('./_projectPrivacy');

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

function safeRequirements(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map(line => ({
    type: cleanText(line?.type, 40) || 'other',
    name: cleanText(line?.name, 150) || 'Equipment',
    unit: cleanText(line?.unit, 40) || 'piece',
    requiredQuantity: Math.max(0, Math.ceil(finiteNumber(line?.requiredQuantity)))
  })).filter(line => line.requiredQuantity > 0);
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
    const operationsRef = db.collection('projectOperations').doc(projectId);

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

      const publicView = stored.publicRecommendation || {};
      const advancePercentage = 50;
      const advanceAmount = Math.round((suggestedPrice * advancePercentage / 100) * 100) / 100;
      const balanceAmount = Math.max(0, Math.round((suggestedPrice - advanceAmount) * 100) / 100);
      const eventTime = new Date();
      const serverTime = fieldValue.serverTimestamp();
      const customerProject = {
        projectId,
        customerId: managedProject ? null : authorization.user.uid,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        address: customer.address,

        status: 'quote_pending',
        statusHistory: [{ from: null, to: 'quote_pending', message: 'Project created', changedAt: eventTime }],
        siteSurveyStatus: 'not_scheduled',
        siteSurveyScheduledDate: null,
        siteSurveyCompletedDate: null,
        siteSurveySummary: '',
        siteSurveyHistory: [],
        panelCount: Math.max(1, Math.ceil(finiteNumber(recommendation.panelCount))),
        panel: publicView.panel || publicEquipment(recommendation.panel, 'panel'),
        inverter: publicView.inverter || publicEquipment(recommendation.inverter, 'inverter'),
        battery: publicView.battery || publicBattery(recommendation.battery),
        systemRequirements: safeRequirements(publicView.requirements),

        quotedPrice: suggestedPrice,
        finalPrice: null,
        advancePercentage,
        advanceAmount,
        balanceAmount,
        amountPaid: 0,
        amountDue: suggestedPrice,
        paymentStatus: 'not_started',
        paymentHistory: [],

        createdAt: serverTime,
        updatedAt: serverTime,
        quoteSentDate: null,
        approvalDate: null,
        installationScheduledDate: null,
        installationStartDate: null,
        completionDate: null,

        customerNotes: customer.additionalNotes,
        sitePhotos: [],
        customerSignoff: false,
        completionNotes: '',
        revision: 0
      };

      const projectOperations = {
        projectId,
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

        siteSurvey: {
          status: 'not_scheduled',
          scheduledDate: null,
          completedDate: null,
          surveyor: '',
          findings: '',
          roofType: '',
          meterType: '',
          shadowAssessment: '',
          sanctionedLoad: '',
          recommendedCapacity: ''
        },
        adminNotes: '',
        technicalNotes: '',
        techniciansAssigned: [],
        salesOwner: authorization.user.email || '',
        installationCoordinator: '',
        targetCompletionDate: null,
        paymentLedger: [],
        activityLog: [{
          activityId: `ACT-${Date.now()}`,
          type: 'project_created',
          actorUid: authorization.user.uid,
          actorEmail: authorization.user.email || '',
          createdAt: eventTime
        }],
        createdByUid: authorization.user.uid,
        createdByRole: authorization.role,
        managedProject,
        revision: 0,
        createdAt: serverTime,
        updatedAt: serverTime
      };

      transaction.set(projectRef, customerProject);
      transaction.set(operationsRef, projectOperations);
      transaction.update(recommendationRef, {
        consumedAt: serverTime,
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
