const crypto = require('crypto');
const {
  buildInventoryPlan,
  inventoryDocuments,
  legacyEquipmentItems,
  projectStockPlan
} = require('./_inventoryPlanning');
const {
  mergeProjectOperations,
  publicBattery,
  publicEquipment
} = require('./_projectPrivacy');

const COMMITTED_STATUSES = new Set(['approved', 'installation_scheduled', 'in_progress']);
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'quote_rejected']);
const STATUS_TRANSITIONS = Object.freeze({
  quote_pending: ['quote_sent', 'cancelled'],
  quote_sent: ['approved', 'quote_rejected', 'cancelled'],
  quote_rejected: [],
  approved: ['installation_scheduled', 'cancelled'],
  installation_scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
});

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wholeNumber(value, fallback = 0) {
  return Math.max(0, Math.ceil(numberValue(value, fallback)));
}

function text(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value._seconds) return Number(value._seconds) * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function paymentTotal(project) {
  return Array.isArray(project?.paymentHistory)
    ? project.paymentHistory.reduce((sum, entry) => sum + Math.max(0, numberValue(entry?.amount)), 0)
    : Math.max(0, numberValue(project?.amountPaid));
}

function paymentStatusFor(totalPaid, quotedPrice, advanceAmount) {
  const epsilon = 0.01;
  if (totalPaid + epsilon >= quotedPrice) return 'balance_paid';
  if (totalPaid + epsilon >= advanceAmount) return 'advance_paid';
  return 'not_started';
}

function calculateTerms({ quotedPrice, advancePercentage, advanceAmount, mode = 'percentage' }) {
  const price = Math.round(numberValue(quotedPrice) * 100) / 100;
  if (price <= 0) throw workflowError(400, 'INVALID_PRICE', 'Quoted price must be greater than zero.');

  let percentage;
  let amount;
  if (mode === 'amount') {
    amount = Math.round(numberValue(advanceAmount) * 100) / 100;
    percentage = price > 0 ? (amount / price) * 100 : 0;
  } else {
    percentage = numberValue(advancePercentage, 50);
    amount = Math.round((price * percentage / 100) * 100) / 100;
  }

  percentage = Math.round(percentage * 100) / 100;
  if (percentage < 50 || percentage > 100) {
    throw workflowError(400, 'INVALID_ADVANCE', 'Advance must be between 50% and 100% of the quoted price.');
  }
  if (amount < price * 0.5 || amount > price) {
    throw workflowError(400, 'INVALID_ADVANCE', 'Advance amount must be between 50% and 100% of the quoted price.');
  }

  return {
    quotedPrice: price,
    advancePercentage: percentage,
    advanceAmount: amount,
    balanceAmount: Math.max(0, Math.round((price - amount) * 100) / 100)
  };
}

function workflowError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function loadInventoryContext(db) {
  const [inventorySnapshot, projectsSnapshot, operationsSnapshot, inverterSnapshot, batterySnapshot] = await Promise.all([
    db.collection('inventory').get(),
    db.collection('projects').get(),
    db.collection('projectOperations').get(),
    db.collection('inverters').get(),
    db.collection('batteries').get()
  ]);

  const unifiedInventory = inventoryDocuments(inventorySnapshot);
  const legacyFallback = legacyEquipmentItems(inverterSnapshot, batterySnapshot, unifiedInventory);
  const operationsById = new Map(operationsSnapshot.docs.map(doc => [doc.id, doc.data()]));
  const projects = projectsSnapshot.docs.map(projectDoc => mergeProjectOperations(
    { id: projectDoc.id, ...projectDoc.data() },
    operationsById.get(projectDoc.id)
  ));
  const inventory = [...unifiedInventory, ...legacyFallback];
  const plan = buildInventoryPlan(inventory, projects);
  return { inventory, projects, plan, operationsById, hasLegacyFallback: legacyFallback.length > 0 };
}

async function loadProjectBundle(db, projectId) {
  const normalizedId = text(projectId, 200);
  if (!normalizedId) throw workflowError(400, 'PROJECT_ID_REQUIRED', 'Project ID is required.');
  const [projectSnapshot, operationsSnapshot] = await Promise.all([
    db.collection('projects').doc(normalizedId).get(),
    db.collection('projectOperations').doc(normalizedId).get()
  ]);
  if (!projectSnapshot.exists) throw workflowError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const project = { id: projectSnapshot.id, ...projectSnapshot.data() };
  const operations = operationsSnapshot.exists
    ? { id: operationsSnapshot.id, ...operationsSnapshot.data() }
    : { id: normalizedId, projectId: normalizedId };
  return { project, operations, merged: mergeProjectOperations(project, operations) };
}

function optionFor(item) {
  return {
    id: item.id,
    itemId: item.itemId || item.id,
    sku: item.sku,
    type: item.type,
    name: item.name,
    unit: item.unit,
    specs: item.specs || {},
    quantityOnHand: wholeNumber(item.quantity),
    availableQuantity: wholeNumber(item.availableAfterCommitted),
    stockStatus: item.stockStatus,
    outOfStock: wholeNumber(item.availableAfterCommitted) <= 0,
    lowStock: item.stockStatus === 'low_stock',
    discontinued: Boolean(item.discontinued),
    legacySource: Boolean(item.legacySource),
    costPrice: Math.max(0, numberValue(item.costPrice)),
    sellingPrice: Math.max(0, numberValue(item.sellingPrice))
  };
}

function equipmentOptions(plan) {
  const groups = { panels: [], inverters: [], batteries: [] };
  plan.items.forEach(item => {
    if (!['panel', 'inverter', 'battery'].includes(item.type)) return;
    const option = optionFor(item);
    if (item.type === 'panel') groups.panels.push(option);
    if (item.type === 'inverter') groups.inverters.push(option);
    if (item.type === 'battery') groups.batteries.push(option);
  });
  Object.values(groups).forEach(items => items.sort((a, b) => {
    if (a.discontinued !== b.discontinued) return a.discontinued ? 1 : -1;
    if (a.outOfStock !== b.outOfStock) return a.outOfStock ? 1 : -1;
    return a.name.localeCompare(b.name);
  }));
  return groups;
}

function existingEquipmentId(item) {
  return text(item?.inventoryId || item?.itemId || item?.id, 200);
}

function findItem(plan, itemId, type, fallback) {
  const normalizedId = text(itemId, 200);
  const found = plan.items.find(item => (
    item.type === type
    && (item.id === normalizedId || item.itemId === normalizedId || item.legacySourceId === normalizedId)
  ));
  if (found) return found;
  if (fallback && !normalizedId) return fallback;
  throw workflowError(400, 'INVALID_EQUIPMENT', `The selected ${type} is not available in the managed equipment catalogue.`);
}

function currentReservedQuantity(operations, itemId, type, committed) {
  if (!committed || !Array.isArray(operations.billOfMaterials)) return 0;
  return operations.billOfMaterials
    .filter(line => line.type === type && String(line.itemId || '') === String(itemId || ''))
    .reduce((sum, line) => sum + wholeNumber(line.requiredQuantity), 0);
}

function bomLine(item, requiredQuantity, operations, projectStatus) {
  const required = wholeNumber(requiredQuantity);
  const committed = COMMITTED_STATUSES.has(projectStatus);
  const currentReserved = currentReservedQuantity(operations, item.id, item.type, committed);
  const available = Math.max(0, wholeNumber(item.availableAfterCommitted) + currentReserved);
  return {
    itemId: item.id,
    sku: item.sku || '',
    type: item.type,
    name: item.name,
    unit: item.unit || 'piece',
    requiredQuantity: required,
    availableQuantity: available,
    shortfall: Math.max(0, required - available),
    stockStatus: item.stockStatus || '',
    unitCost: Math.max(0, numberValue(item.costPrice)),
    sellingPrice: Math.max(0, numberValue(item.sellingPrice)),
    legacySourceId: item.legacySourceId || ''
  };
}

function validateCompatibility({ panelCount, inverter, battery, batteryQuantity, peakLoad }) {
  const inverterPeak = numberValue(inverter.specs?.peakLoad);
  const maxPanels = wholeNumber(inverter.specs?.maxPanels);
  if (maxPanels > 0 && panelCount > maxPanels) {
    throw workflowError(400, 'INVERTER_TOO_SMALL', `${inverter.name} supports a maximum of ${maxPanels} panels.`);
  }
  if (inverterPeak > 0 && numberValue(peakLoad) > inverterPeak) {
    throw workflowError(400, 'INVERTER_TOO_SMALL', `${inverter.name} does not support the recorded peak load.`);
  }

  const bankVoltage = numberValue(inverter.specs?.batterySupported);
  if (bankVoltage <= 0 && battery) {
    throw workflowError(400, 'BATTERY_NOT_SUPPORTED', `${inverter.name} is configured as a no-battery/grid-tie inverter.`);
  }
  if (bankVoltage > 0 && !battery) {
    throw workflowError(400, 'BATTERY_REQUIRED', `${inverter.name} requires a compatible battery bank.`);
  }
  if (battery) {
    const batteryVoltage = numberValue(battery.specs?.voltage, 12) || 12;
    const seriesQuantity = bankVoltage / batteryVoltage;
    if (!Number.isInteger(seriesQuantity) || seriesQuantity <= 0) {
      throw workflowError(400, 'BATTERY_INCOMPATIBLE', `${battery.name} cannot form the ${bankVoltage} V battery bank required by ${inverter.name}.`);
    }
    if (batteryQuantity < seriesQuantity || batteryQuantity % seriesQuantity !== 0) {
      throw workflowError(400, 'BATTERY_QUANTITY_INVALID', `Battery quantity must be a multiple of ${seriesQuantity} for the selected inverter.`);
    }
  }
}

function buildEditedSystem({ project, operations, plan, payload }) {
  const panelCount = wholeNumber(payload.panelCount || project.panelCount);
  if (panelCount < 1 || panelCount > 500) throw workflowError(400, 'INVALID_PANEL_COUNT', 'Panel count must be between 1 and 500.');

  const currentPanel = plan.items.find(item => item.type === 'panel' && item.id === existingEquipmentId(operations.panel || project.panel));
  const currentInverter = plan.items.find(item => item.type === 'inverter' && item.id === existingEquipmentId(operations.inverter || project.inverter));
  const currentBatteryValue = operations.battery?.selectedBattery || project.battery?.selectedBattery;
  const currentBattery = plan.items.find(item => item.type === 'battery' && item.id === existingEquipmentId(currentBatteryValue));

  const panel = findItem(plan, payload.panelId, 'panel', currentPanel);
  const inverter = findItem(plan, payload.inverterId, 'inverter', currentInverter);
  const batteryId = text(payload.batteryId, 200);
  const battery = batteryId ? findItem(plan, batteryId, 'battery', currentBattery) : null;
  const batteryQuantity = battery ? wholeNumber(payload.batteryQuantity || operations.battery?.quantity || project.battery?.quantity || 1) : 0;
  const peakLoad = numberValue(operations.calculationInput?.peakLoad || payload.peakLoad);

  validateCompatibility({ panelCount, inverter, battery, batteryQuantity, peakLoad });

  const billOfMaterials = [
    bomLine(panel, panelCount, operations, project.status),
    bomLine(inverter, 1, operations, project.status)
  ];
  if (battery) billOfMaterials.push(bomLine(battery, batteryQuantity, operations, project.status));

  plan.items
    .filter(item => ['wiring', 'mounting', 'other'].includes(item.type) && item.specs?.autoInclude && !item.discontinued)
    .forEach(item => {
      const quantity = wholeNumber(
        numberValue(item.specs.fixedQuantityPerSystem)
        + numberValue(item.specs.perPanelQuantity) * panelCount
      );
      if (quantity > 0) billOfMaterials.push(bomLine(item, quantity, operations, project.status));
    });

  const materialCost = billOfMaterials.reduce((sum, line) => sum + line.unitCost * line.requiredQuantity, 0);
  const laborCost = Math.max(0, numberValue(payload.laborCost, operations.laborCost));
  const totalShortfall = billOfMaterials.reduce((sum, line) => sum + line.shortfall, 0);
  const inventoryAssessment = {
    status: totalShortfall > 0 ? 'shortfall' : 'ready',
    totalShortfall,
    shortItemCount: billOfMaterials.filter(line => line.shortfall > 0).length,
    requiredItemCount: billOfMaterials.length,
    assessedAt: new Date().toISOString()
  };

  const fullBattery = battery ? { selectedBattery: battery, quantity: batteryQuantity } : { selectedBattery: null, quantity: 0 };
  return {
    publicUpdates: {
      panelCount,
      panel: publicEquipment(panel, 'panel'),
      inverter: publicEquipment(inverter, 'inverter'),
      battery: publicBattery(fullBattery)
    },
    operationalUpdates: {
      panel,
      inverter,
      battery: fullBattery,
      billOfMaterials,
      inventoryAssessment,
      materialCost,
      laborCost,
      totalCostWithoutMarkup: materialCost + laborCost
    }
  };
}

function customerVisibleChanges(before, after) {
  const changes = [];
  const compare = (label, oldValue, newValue, formatter = value => value) => {
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ label, value: formatter(newValue) });
    }
  };
  compare('Customer name', before.customerName, after.customerName);
  compare('Customer email', before.customerEmail, after.customerEmail);
  compare('Phone', before.customerPhone, after.customerPhone);
  compare('Installation address', before.address, after.address);
  compare('Solar panels', before.panelCount, after.panelCount, value => `${value} panel(s)`);
  compare('Panel model', before.panel?.name, after.panel?.name);
  compare('Inverter', before.inverter?.name, after.inverter?.name);
  compare('Battery', before.battery?.selectedBattery?.name, after.battery?.selectedBattery?.name || 'Not required');
  compare('Battery quantity', before.battery?.quantity, after.battery?.quantity, value => `${value || 0}`);
  compare('Quoted price', before.quotedPrice, after.quotedPrice, value => `Rs. ${numberValue(value).toFixed(2)}`);
  compare('Advance', before.advanceAmount, after.advanceAmount, value => `Rs. ${numberValue(value).toFixed(2)}`);
  compare('Scheduled date', timestampMillis(before.installationScheduledDate), timestampMillis(after.installationScheduledDate), value => value ? new Date(value).toLocaleDateString('en-IN') : 'To be confirmed');
  return changes;
}

function notificationRecord({ projectId, type, recipient, payload, actor }) {
  return {
    notificationId: `NTF-${crypto.randomUUID()}`,
    projectId,
    type,
    to: recipient,
    payload,
    status: 'pending',
    attempts: 0,
    createdByUid: actor.uid,
    createdByEmail: actor.email || '',
    createdAt: new Date(),
    lastAttemptAt: null,
    sentAt: null,
    messageId: '',
    error: ''
  };
}

function statusDateUpdates(newStatus, now, scheduledDate) {
  const updates = {};
  if (newStatus === 'quote_sent') updates.quoteSentDate = now;
  if (newStatus === 'approved') updates.approvalDate = now;
  if (newStatus === 'installation_scheduled') {
    if (!scheduledDate) throw workflowError(400, 'INSTALLATION_DATE_REQUIRED', 'Choose an installation date before scheduling.');
    updates.installationScheduledDate = scheduledDate;
  }
  if (newStatus === 'in_progress') updates.installationStartDate = now;
  if (newStatus === 'completed') updates.completionDate = now;
  return updates;
}

module.exports = {
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  buildEditedSystem,
  calculateTerms,
  customerVisibleChanges,
  equipmentOptions,
  loadInventoryContext,
  loadProjectBundle,
  notificationRecord,
  numberValue,
  paymentStatusFor,
  paymentTotal,
  projectStockPlan,
  statusDateUpdates,
  text,
  timestampMillis,
  wholeNumber,
  workflowError
};
