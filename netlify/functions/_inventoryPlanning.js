const COMMITTED_STATUSES = new Set(['approved', 'installation_scheduled', 'in_progress']);
const QUOTATION_STATUSES = new Set(['quote_pending', 'quote_sent']);
const EXCLUDED_STATUSES = new Set(['quote_rejected', 'completed', 'cancelled']);

const STATUS_URGENCY = Object.freeze({
  in_progress: 40,
  installation_scheduled: 32,
  approved: 24,
  quote_sent: 14,
  quote_pending: 8
});

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wholeNumber(value, fallback = 0) {
  return Math.max(0, Math.ceil(numberValue(value, fallback)));
}

function text(value, maxLength = 200) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizedInventoryItem(raw, id = '') {
  const type = text(raw.type, 40).toLowerCase() || 'other';
  const quantity = wholeNumber(raw.quantity);
  const reorderPoint = wholeNumber(raw.reorderPoint, 5);
  const targetStock = Math.max(reorderPoint, wholeNumber(raw.targetStock, Math.max(10, reorderPoint)));
  const specs = raw.specs && typeof raw.specs === 'object' ? raw.specs : {};
  const discontinued = Boolean(raw.discontinued || raw.status === 'discontinued');

  return {
    id: id || raw.itemId,
    itemId: raw.itemId || id,
    sku: text(raw.sku, 80),
    type,
    name: text(raw.name, 150) || 'Unnamed item',
    description: text(raw.description, 500),
    supplier: text(raw.supplier, 150),
    unit: text(raw.unit, 40) || 'piece',
    quantity,
    reorderPoint,
    targetStock,
    leadTimeDays: Math.max(1, wholeNumber(raw.leadTimeDays, 7)),
    costPrice: Math.max(0, numberValue(raw.costPrice)),
    sellingPrice: Math.max(0, numberValue(raw.sellingPrice)),
    activeForCalculator: Boolean(raw.activeForCalculator),
    discontinued,
    legacySource: Boolean(raw.legacySource),
    legacySourceId: text(raw.legacySourceId, 200),
    specs
  };
}

function inventoryDocuments(snapshot) {
  return snapshot.docs.map(itemDoc => normalizedInventoryItem(itemDoc.data(), itemDoc.id));
}

function legacyEquipmentItems(inverterSnapshot, batterySnapshot, existingInventory = []) {
  const existingLegacyKeys = new Set(
    existingInventory
      .filter(item => item.legacySourceId)
      .map(item => `${item.type}:${item.legacySourceId}`)
  );
  const virtualItems = [];

  inverterSnapshot.docs.forEach(itemDoc => {
    if (existingLegacyKeys.has(`inverter:${itemDoc.id}`)) return;
    const data = itemDoc.data();
    virtualItems.push(normalizedInventoryItem({
      itemId: `LEGACY-INVERTER-${itemDoc.id}`,
      sku: `LEG-INV-${itemDoc.id.slice(0, 8).toUpperCase()}`,
      type: 'inverter',
      name: data.name,
      quantity: 0,
      reorderPoint: 1,
      targetStock: 2,
      leadTimeDays: 7,
      costPrice: data.cost,
      sellingPrice: data.cost,
      activeForCalculator: true,
      legacySource: true,
      legacySourceId: itemDoc.id,
      specs: {
        peakLoad: numberValue(data.peakLoad),
        maxPanels: wholeNumber(data.maxPanels),
        batterySupported: numberValue(data.batterySupported)
      }
    }, `LEGACY-INVERTER-${itemDoc.id}`));
  });

  batterySnapshot.docs.forEach(itemDoc => {
    if (existingLegacyKeys.has(`battery:${itemDoc.id}`)) return;
    const data = itemDoc.data();
    virtualItems.push(normalizedInventoryItem({
      itemId: `LEGACY-BATTERY-${itemDoc.id}`,
      sku: `LEG-BAT-${itemDoc.id.slice(0, 8).toUpperCase()}`,
      type: 'battery',
      name: data.name,
      quantity: 0,
      reorderPoint: 1,
      targetStock: 4,
      leadTimeDays: 7,
      costPrice: data.price,
      sellingPrice: data.price,
      activeForCalculator: true,
      legacySource: true,
      legacySourceId: itemDoc.id,
      specs: {
        capacity: numberValue(data.capacity),
        energy: numberValue(data.energy),
        voltage: 12
      }
    }, `LEGACY-BATTERY-${itemDoc.id}`));
  });

  return virtualItems;
}

function normalizeBomLine(line) {
  if (!line || typeof line !== 'object') return null;
  const itemId = text(line.itemId || line.inventoryId || line.id, 200);
  const requiredQuantity = wholeNumber(line.requiredQuantity ?? line.quantity);
  if (!itemId || requiredQuantity <= 0) return null;
  return {
    itemId,
    sku: text(line.sku, 80),
    type: text(line.type, 40).toLowerCase() || 'other',
    name: text(line.name, 150) || 'Inventory item',
    unit: text(line.unit, 40) || 'piece',
    requiredQuantity,
    unitCost: Math.max(0, numberValue(line.unitCost ?? line.costPrice)),
    sellingPrice: Math.max(0, numberValue(line.sellingPrice)),
    legacySourceId: text(line.legacySourceId, 200)
  };
}

function resolveItemId(candidateId, type, inventory) {
  if (!candidateId) return '';
  const direct = inventory.find(item => item.id === candidateId || item.itemId === candidateId);
  if (direct) return direct.id;
  const legacy = inventory.find(item => item.type === type && item.legacySourceId === candidateId);
  return legacy?.id || candidateId;
}

function deriveProjectBom(project, inventory) {
  const explicit = Array.isArray(project.billOfMaterials)
    ? project.billOfMaterials.map(normalizeBomLine).filter(Boolean)
    : [];
  if (explicit.length) return explicit;

  const derived = [];
  const panelId = project.panel?.inventoryId || project.panel?.itemId || project.panel?.id;
  if (panelId && wholeNumber(project.panelCount) > 0) {
    derived.push(normalizeBomLine({
      itemId: resolveItemId(panelId, 'panel', inventory),
      type: 'panel',
      name: project.panel?.name || 'Solar panel',
      requiredQuantity: project.panelCount,
      unitCost: project.panel?.costPrice || project.panel?.cost,
      sellingPrice: project.panel?.sellingPrice
    }));
  }

  const inverterId = project.inverter?.inventoryId || project.inverter?.itemId || project.inverter?.id;
  if (inverterId) {
    derived.push(normalizeBomLine({
      itemId: resolveItemId(inverterId, 'inverter', inventory),
      legacySourceId: project.inverter?.legacySourceId || project.inverter?.id,
      type: 'inverter',
      name: project.inverter?.name || 'Inverter',
      requiredQuantity: 1,
      unitCost: project.inverter?.costPrice || project.inverter?.cost,
      sellingPrice: project.inverter?.sellingPrice
    }));
  }

  const battery = project.battery?.selectedBattery;
  const batteryId = battery?.inventoryId || battery?.itemId || battery?.id;
  if (batteryId && wholeNumber(project.battery?.quantity) > 0) {
    derived.push(normalizeBomLine({
      itemId: resolveItemId(batteryId, 'battery', inventory),
      legacySourceId: battery?.legacySourceId || battery?.id,
      type: 'battery',
      name: battery?.name || 'Battery',
      requiredQuantity: project.battery.quantity,
      unitCost: battery?.costPrice || battery?.price,
      sellingPrice: battery?.sellingPrice
    }));
  }

  return derived.filter(Boolean);
}

function priorityFor(item, demand) {
  const availableAfterCommitted = Math.max(0, item.quantity - demand.committedDemand);
  const committedShortfall = Math.max(0, demand.committedDemand - item.quantity);
  const quotationShortfall = Math.max(0, demand.quotationDemand - availableAfterCommitted);
  const projectedShortfall = Math.max(0, demand.committedDemand + demand.quotationDemand - item.quantity);
  const projectedBalance = item.quantity - demand.committedDemand - demand.quotationDemand;
  const safetyTarget = Math.max(item.reorderPoint, item.targetStock);
  const recommendedOrder = Math.max(
    0,
    wholeNumber(demand.committedDemand + demand.quotationDemand + safetyTarget - item.quantity)
  );

  let score = demand.urgency;
  if (committedShortfall > 0) score += 120 + Math.min(60, committedShortfall * 5);
  else if (projectedShortfall > 0) score += 85 + Math.min(35, projectedShortfall * 4);
  else if (availableAfterCommitted <= item.reorderPoint) score += 58;
  else if (projectedBalance <= item.targetStock) score += 35;
  else score += 8;

  score += Math.min(20, Math.ceil(item.leadTimeDays / 2));
  if (item.quantity === 0 && demand.committedDemand + demand.quotationDemand > 0) score += 20;
  if (item.discontinued) score = 0;

  let priority = 'low';
  if (score >= 120) priority = 'critical';
  else if (score >= 85) priority = 'high';
  else if (score >= 50) priority = 'medium';

  let stockStatus = 'in_stock';
  if (item.discontinued) stockStatus = 'discontinued';
  else if (availableAfterCommitted <= 0) stockStatus = 'out_of_stock';
  else if (availableAfterCommitted <= item.reorderPoint) stockStatus = 'low_stock';

  return {
    availableAfterCommitted,
    committedShortfall,
    quotationShortfall,
    projectedShortfall,
    projectedBalance,
    recommendedOrder,
    priorityScore: Math.round(score),
    priority,
    stockStatus
  };
}

function buildInventoryPlan(inventory, projects) {
  const demandByItem = new Map();
  inventory.forEach(item => {
    demandByItem.set(item.id, {
      committedDemand: 0,
      quotationDemand: 0,
      urgency: 0,
      committedProjectIds: new Set(),
      quotationProjectIds: new Set()
    });
  });

  projects.forEach(project => {
    const status = text(project.status, 50);
    if (EXCLUDED_STATUSES.has(status)) return;
    const demandKind = COMMITTED_STATUSES.has(status)
      ? 'committed'
      : QUOTATION_STATUSES.has(status) ? 'quotation' : null;
    if (!demandKind) return;

    const projectId = text(project.projectId || project.id, 200);
    deriveProjectBom(project, inventory).forEach(line => {
      const resolvedId = resolveItemId(line.itemId, line.type, inventory);
      if (!demandByItem.has(resolvedId)) return;
      const demand = demandByItem.get(resolvedId);
      if (demandKind === 'committed') {
        demand.committedDemand += line.requiredQuantity;
        demand.committedProjectIds.add(projectId);
      } else {
        demand.quotationDemand += line.requiredQuantity;
        demand.quotationProjectIds.add(projectId);
      }
      demand.urgency = Math.max(demand.urgency, STATUS_URGENCY[status] || 0);
    });
  });

  const items = inventory.map(item => {
    const demand = demandByItem.get(item.id) || {
      committedDemand: 0,
      quotationDemand: 0,
      urgency: 0,
      committedProjectIds: new Set(),
      quotationProjectIds: new Set()
    };
    const planning = priorityFor(item, demand);
    return {
      ...item,
      committedDemand: demand.committedDemand,
      quotationDemand: demand.quotationDemand,
      committedProjectCount: demand.committedProjectIds.size,
      quotationProjectCount: demand.quotationProjectIds.size,
      projectsAffected: new Set([
        ...demand.committedProjectIds,
        ...demand.quotationProjectIds
      ]).size,
      ...planning
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore || b.projectedShortfall - a.projectedShortfall || a.name.localeCompare(b.name));

  const summary = items.reduce((result, item) => {
    result.totalItems += 1;
    result.totalUnits += item.quantity;
    result.committedDemand += item.committedDemand;
    result.quotationDemand += item.quotationDemand;
    result.projectedShortfall += item.projectedShortfall;
    result.recommendedOrder += item.recommendedOrder;
    if (item.priority === 'critical') result.criticalItems += 1;
    if (item.priority === 'high') result.highPriorityItems += 1;
    if (item.stockStatus === 'out_of_stock') result.outOfStockItems += 1;
    return result;
  }, {
    totalItems: 0,
    totalUnits: 0,
    committedDemand: 0,
    quotationDemand: 0,
    projectedShortfall: 0,
    recommendedOrder: 0,
    criticalItems: 0,
    highPriorityItems: 0,
    outOfStockItems: 0
  });

  return { items, summary };
}

function calculatorCatalog(planItems) {
  return planItems
    .filter(item => item.activeForCalculator && !item.discontinued)
    .map(item => ({
      id: item.id,
      inventoryId: item.id,
      itemId: item.itemId,
      sku: item.sku,
      type: item.type,
      name: item.name,
      unit: item.unit,
      specs: item.specs,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      quantity: item.quantity,
      availableQuantity: item.availableAfterCommitted,
      committedDemand: item.committedDemand,
      quotationDemand: item.quotationDemand,
      stockStatus: item.stockStatus,
      priority: item.priority,
      legacySource: item.legacySource,
      legacySourceId: item.legacySourceId
    }));
}

function projectStockPlan(project, inventoryPlan) {
  const planById = new Map(inventoryPlan.items.map(item => [item.id, item]));
  const inventory = inventoryPlan.items;
  const status = text(project.status, 50);
  const projectIsCommitted = COMMITTED_STATUSES.has(status);
  const lines = deriveProjectBom(project, inventory).map(line => {
    const itemId = resolveItemId(line.itemId, line.type, inventory);
    const item = planById.get(itemId);
    if (!item) {
      return {
        ...line,
        itemId,
        availableQuantity: 0,
        shortfall: line.requiredQuantity,
        status: 'unmapped',
        restockPriority: 'critical'
      };
    }

    const demandWithoutProject = projectIsCommitted
      ? Math.max(0, item.committedDemand - line.requiredQuantity)
      : item.committedDemand;
    const availableBeforeProject = Math.max(0, item.quantity - demandWithoutProject);
    const shortfall = Math.max(0, line.requiredQuantity - availableBeforeProject);
    return {
      ...line,
      itemId,
      sku: item.sku || line.sku,
      name: item.name || line.name,
      unit: item.unit || line.unit,
      quantityOnHand: item.quantity,
      availableQuantity: availableBeforeProject,
      shortfall,
      status: shortfall > 0 ? 'shortfall' : 'ready',
      restockPriority: item.priority,
      leadTimeDays: item.leadTimeDays,
      supplier: item.supplier
    };
  });

  const totalShortfall = lines.reduce((sum, line) => sum + line.shortfall, 0);
  return {
    projectId: text(project.projectId || project.id, 200),
    status: totalShortfall > 0 ? 'shortfall' : lines.length ? 'ready' : 'unmapped',
    totalShortfall,
    requiredItemCount: lines.length,
    shortItemCount: lines.filter(line => line.shortfall > 0).length,
    lines
  };
}

module.exports = {
  COMMITTED_STATUSES,
  QUOTATION_STATUSES,
  buildInventoryPlan,
  calculatorCatalog,
  deriveProjectBom,
  inventoryDocuments,
  legacyEquipmentItems,
  normalizedInventoryItem,
  projectStockPlan
};
