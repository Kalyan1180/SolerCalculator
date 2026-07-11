// Create a project/quotation request using one consistent Firestore schema.
const { randomBytes } = require('crypto');
const {
  admin,
  HttpError,
  getAuth,
  getDb,
  json,
  parseJsonBody,
  requireUser,
  toPublicError
} = require('../lib/firebaseAdmin');

const MAX_TEXT_LENGTH = 500;

function cleanText(value, field, required = true, maxLength = MAX_TEXT_LENGTH) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) {
    throw new HttpError(400, `${field} is required.`);
  }
  if (text.length > maxLength) {
    throw new HttpError(400, `${field} is too long.`);
  }
  return text;
}

function cleanNumber(value, field, options = {}) {
  const number = Number(value);
  const minimum = options.minimum === undefined ? 0 : options.minimum;
  const maximum = options.maximum === undefined ? Number.MAX_SAFE_INTEGER : options.maximum;

  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new HttpError(400, `${field} must be between ${minimum} and ${maximum}.`);
  }
  return number;
}

function normalizeInverter(value) {
  if (!value || typeof value !== 'object') {
    throw new HttpError(400, 'Inverter details are required.');
  }

  return {
    id: cleanText(value.id || '', 'Inverter ID', false, 100),
    name: cleanText(value.name, 'Inverter name', true, 150),
    peakLoad: cleanNumber(value.peakLoad, 'Inverter peak load', { maximum: 1000 }),
    maxPanels: cleanNumber(value.maxPanels, 'Maximum supported panels', { maximum: 10000 }),
    batterySupported: cleanNumber(value.batterySupported || 0, 'Supported battery voltage', { maximum: 1000 }),
    cost: cleanNumber(value.cost || value.price || 0, 'Inverter cost')
  };
}

function normalizeBattery(value) {
  const selected = value && value.selectedBattery ? value.selectedBattery : value;
  const quantityValue = value && value.selectedBattery ? value.quantity : 1;

  if (!selected || typeof selected !== 'object') {
    throw new HttpError(400, 'Battery details are required.');
  }

  return {
    selectedBattery: {
      id: cleanText(selected.id || '', 'Battery ID', false, 100),
      name: cleanText(selected.name, 'Battery name', true, 150),
      capacity: cleanNumber(selected.capacity || 0, 'Battery capacity', { maximum: 100000 }),
      energy: cleanNumber(selected.energy || 0, 'Battery energy', { maximum: 100000 }),
      price: cleanNumber(selected.price || selected.cost || 0, 'Battery price')
    },
    quantity: Math.max(1, Math.round(cleanNumber(quantityValue || 1, 'Battery quantity', { minimum: 1, maximum: 1000 })))
  };
}

async function resolveCustomerId(user, email, requestedCustomerId) {
  if (user.role !== 'admin') {
    return user.uid;
  }

  const explicitCustomerId = cleanText(requestedCustomerId || '', 'Customer ID', false, 128);
  if (explicitCustomerId) {
    return explicitCustomerId;
  }

  if (!email) {
    return null;
  }

  try {
    const customer = await getAuth().getUserByEmail(email);
    return customer.uid;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  }

  try {
    const user = await requireUser(event);
    const data = parseJsonBody(event);

    const customerName = cleanText(data.customerName || data.name, 'Customer name', true, 150);
    const customerEmail = cleanText(
      user.role === 'admin' ? data.customerEmail || data.email : user.email,
      'Customer email',
      true,
      254
    ).toLowerCase();
    const customerPhone = cleanText(data.customerPhone || data.phone, 'Customer phone', true, 30);
    const address = cleanText(data.address, 'Address', true, 500);
    const panelCount = Math.round(cleanNumber(data.panelCount || data.panels, 'Panel count', { minimum: 1, maximum: 1000 }));
    const inverter = normalizeInverter(data.inverter || data.requiredInverter);
    const battery = normalizeBattery(data.battery || data.requiredBattery);

    const panelUnitCost = cleanNumber(process.env.VUE_APP_PANEL_COST_PER_PIECE || 15000, 'Panel unit cost');
    const componentCost =
      panelCount * panelUnitCost +
      inverter.cost +
      battery.quantity * battery.selectedBattery.price;

    const submittedCostWithout = Number(
      data.costWithout ?? data.calculatorResults?.costWithout ?? componentCost
    );
    const materialCost = componentCost;
    const laborCost = Number.isFinite(submittedCostWithout)
      ? Math.max(0, submittedCostWithout - componentCost)
      : 0;
    const quotedPrice = cleanNumber(
      data.quotedPrice ?? data.suggestedPrice ?? data.cost ?? data.calculatorResults?.special,
      'Quoted price'
    );

    const customerId = await resolveCustomerId(user, customerEmail, data.customerId);
    const projectId = `PRJ-${Date.now()}-${randomBytes(5).toString('hex')}`;
    const timestamp = admin.firestore.Timestamp.now();

    const project = {
      projectId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      address,
      status: 'quote_pending',
      panelCount,
      panelUnitCost,
      inverter,
      battery,
      materialCost,
      laborCost,
      totalCostWithMarkup: cleanNumber(
        data.costWith ?? data.calculatorResults?.costWith ?? quotedPrice,
        'Total cost with markup'
      ),
      quotedPrice,
      finalPrice: null,
      advancePercentage: 50,
      advanceAmount: null,
      balanceAmount: null,
      paymentStatus: 'not_started',
      paymentMethod: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: user.uid,
      quoteSentDate: null,
      approvalDate: null,
      installationScheduledDate: null,
      installationStartDate: null,
      completionDate: null,
      adminNotes: '',
      customerNotes: cleanText(data.customerNotes || data.additionalNotes || data.note || '', 'Customer notes', false, 2000),
      technicalNotes: '',
      sitePhotos: [],
      techniciansAssigned: [],
      customerSignoff: false,
      completionNotes: ''
    };

    await getDb().collection('projects').doc(projectId).set(project);

    return json(201, {
      message: 'Project created successfully.',
      projectId,
      project
    });
  } catch (error) {
    return toPublicError(error);
  }
};
