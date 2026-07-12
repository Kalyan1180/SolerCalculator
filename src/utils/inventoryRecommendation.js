import { COST_CONFIG, VALIDATION_CONFIG } from '@/constants/calculationConstants';

export function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function wholeNumber(value) {
  return Math.max(0, Math.ceil(finiteNumber(value)));
}

function availableQuantity(item) {
  return Math.max(0, wholeNumber(item?.availableQuantity ?? item?.quantity));
}

function itemCost(item, fallback = 0) {
  return Math.max(0, finiteNumber(
    item?.costPrice ?? item?.cost ?? item?.price ?? fallback
  ));
}

function candidateScore(item, requiredQuantity, totalCost) {
  const shortfall = Math.max(0, requiredQuantity - availableQuantity(item));
  const legacyPenalty = item?.legacySource ? 1000 : 0;
  return shortfall * 1_000_000_000 + legacyPenalty + totalCost;
}

function chooseBest(candidates, quantityForItem) {
  return candidates.reduce((best, item) => {
    const requiredQuantity = wholeNumber(quantityForItem(item));
    if (requiredQuantity <= 0) return best;
    const totalCost = itemCost(item) * requiredQuantity;
    const score = candidateScore(item, requiredQuantity, totalCost);
    if (!best || score < best.score) return { item, requiredQuantity, totalCost, score };
    return best;
  }, null);
}

function bomLine(item, requiredQuantity, overrides = {}) {
  const available = availableQuantity(item);
  const required = wholeNumber(requiredQuantity);
  return {
    itemId: String(item?.inventoryId || item?.itemId || item?.id || overrides.itemId || ''),
    sku: String(item?.sku || overrides.sku || ''),
    type: String(item?.type || overrides.type || 'other'),
    name: String(item?.name || overrides.name || 'Inventory item'),
    unit: String(item?.unit || overrides.unit || 'piece'),
    requiredQuantity: required,
    availableQuantity: available,
    shortfall: Math.max(0, required - available),
    stockStatus: String(item?.stockStatus || item?.status || ''),
    unitCost: itemCost(item, overrides.unitCost),
    sellingPrice: Math.max(0, finiteNumber(item?.sellingPrice)),
    legacySourceId: String(item?.legacySourceId || '')
  };
}

function defaultPanel(panelCount) {
  return {
    id: 'SYSTEM-DEFAULT-PANEL',
    inventoryId: 'SYSTEM-DEFAULT-PANEL',
    itemId: 'SYSTEM-DEFAULT-PANEL',
    sku: 'PANEL-NOT-CONFIGURED',
    type: 'panel',
    name: 'Standard solar panel — add actual panel to inventory',
    unit: 'piece',
    costPrice: COST_CONFIG.PANEL_COST_PER_PIECE,
    cost: COST_CONFIG.PANEL_COST_PER_PIECE,
    quantity: 0,
    availableQuantity: 0,
    stockStatus: 'out_of_stock',
    specs: { wattage: 550 },
    configurationRequired: true,
    requiredQuantity: panelCount
  };
}

export function buildSystemRecommendation({
  unitPerDay,
  peakLoad,
  panelCount,
  panels = [],
  inverters = [],
  batteries = [],
  accessories = []
}) {
  const requiredPanels = wholeNumber(panelCount);
  if (requiredPanels <= 0) return { success: false, error: 'Panel requirement is invalid.' };

  const panelChoice = chooseBest(
    panels.filter(item => finiteNumber(item.wattage ?? item.specs?.wattage) > 0),
    () => requiredPanels
  );
  const selectedPanel = panelChoice?.item || defaultPanel(requiredPanels);

  const inverterChoice = chooseBest(
    inverters.filter(inverter => {
      return finiteNumber(inverter.peakLoad ?? inverter.specs?.peakLoad) >= finiteNumber(peakLoad)
        && finiteNumber(inverter.maxPanels ?? inverter.specs?.maxPanels) >= requiredPanels;
    }),
    () => 1
  );
  if (!inverterChoice) {
    return { success: false, error: 'No inventory inverter supports the calculated panel count and peak load.' };
  }
  const selectedInverter = inverterChoice.item;

  let batteryInfo = { selectedBattery: null, quantity: 0 };
  const batteryVoltage = finiteNumber(
    selectedInverter.batterySupported ?? selectedInverter.specs?.batterySupported
  );
  if (batteryVoltage > 0) {
    const seriesFactor = batteryVoltage / 12;
    if (!Number.isInteger(seriesFactor) || seriesFactor <= 0) {
      return { success: false, error: 'Selected inverter has an unsupported battery voltage configuration.' };
    }

    const requiredEnergy = (finiteNumber(unitPerDay) * 3) / 5;
    const candidates = [];
    batteries.forEach(battery => {
      const energy = finiteNumber(battery.energy ?? battery.specs?.energy);
      if (energy <= 0) return;
      for (let parallelStrings = 1; parallelStrings <= VALIDATION_CONFIG.MAX_BATTERY_COMBINATIONS; parallelStrings += 1) {
        const quantity = seriesFactor * parallelStrings;
        if (energy * quantity >= requiredEnergy) {
          candidates.push({ battery, quantity });
          break;
        }
      }
    });

    const selectedBattery = candidates.reduce((best, candidate) => {
      const totalCost = itemCost(candidate.battery) * candidate.quantity;
      const score = candidateScore(candidate.battery, candidate.quantity, totalCost);
      if (!best || score < best.score) return { ...candidate, totalCost, score };
      return best;
    }, null);

    if (!selectedBattery) {
      return { success: false, error: 'No inventory battery combination can meet the calculated backup requirement.' };
    }
    batteryInfo = {
      selectedBattery: selectedBattery.battery,
      quantity: selectedBattery.quantity
    };
  }

  const billOfMaterials = [
    bomLine(selectedPanel, requiredPanels, { type: 'panel' }),
    bomLine(selectedInverter, 1, { type: 'inverter' })
  ];
  if (batteryInfo.selectedBattery) {
    billOfMaterials.push(bomLine(batteryInfo.selectedBattery, batteryInfo.quantity, { type: 'battery' }));
  }

  accessories
    .filter(item => item?.specs?.autoInclude)
    .forEach(item => {
      const requiredQuantity = Math.ceil(
        finiteNumber(item.specs.fixedQuantityPerSystem)
        + finiteNumber(item.specs.perPanelQuantity) * requiredPanels
      );
      if (requiredQuantity > 0) billOfMaterials.push(bomLine(item, requiredQuantity));
    });

  const materialCost = billOfMaterials.reduce((sum, line) => {
    return sum + line.unitCost * line.requiredQuantity;
  }, 0);
  const highLabourTier = materialCost > COST_CONFIG.COST_THRESHOLD && requiredPanels > 3;
  const labourDays = highLabourTier ? COST_CONFIG.LABOR_DAYS_HIGH : COST_CONFIG.LABOR_DAYS_LOW;
  const laborCost = requiredPanels * COST_CONFIG.LABOR_COST_PER_PANEL * labourDays;
  const totalCostWithoutMarkup = materialCost + laborCost;

  let markupRate = COST_CONFIG.MARKUP_RATE_HIGH;
  if (materialCost <= COST_CONFIG.COST_THRESHOLD) markupRate = COST_CONFIG.MARKUP_RATE_LOW;
  else if (requiredPanels > 3) markupRate = COST_CONFIG.MARKUP_RATE_MEDIUM;
  const totalCostWithMarkup = totalCostWithoutMarkup * markupRate;
  const profitPercentage = totalCostWithoutMarkup > 0
    ? ((totalCostWithMarkup - totalCostWithoutMarkup) / totalCostWithoutMarkup) * 100
    : 0;
  const discountFactor = profitPercentage < COST_CONFIG.PROFIT_THRESHOLD_FOR_DISCOUNT ? 0.9 : 0.8;
  const offerPrice = totalCostWithMarkup * discountFactor;
  const totalShortfall = billOfMaterials.reduce((sum, line) => sum + line.shortfall, 0);
  const shortItems = billOfMaterials.filter(line => line.shortfall > 0);

  return {
    success: true,
    panelCount: requiredPanels,
    panel: selectedPanel,
    inverter: selectedInverter,
    battery: batteryInfo,
    billOfMaterials,
    inventoryAssessment: {
      status: totalShortfall > 0 ? 'shortfall' : 'ready',
      totalShortfall,
      shortItemCount: shortItems.length,
      requiredItemCount: billOfMaterials.length,
      assessedAt: new Date().toISOString()
    },
    materialCost,
    laborCost,
    totalCostWithoutMarkup,
    totalCostWithMarkup,
    profitPercentage,
    offerPrice,
    warnings: shortItems.map(item => `${item.name}: short by ${item.shortfall} ${item.unit}`)
  };
}
