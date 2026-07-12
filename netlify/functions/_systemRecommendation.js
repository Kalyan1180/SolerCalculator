const COST_CONFIG = Object.freeze({
  PANEL_COST_PER_PIECE: Number(process.env.VUE_APP_PANEL_COST_PER_PIECE) || 15000,
  LABOR_COST_PER_PANEL: Number(process.env.VUE_APP_LABOR_COST_PER_PANEL) || 500,
  LABOR_DAYS_LOW: Number(process.env.VUE_APP_LABOR_DAYS_LOW) || 8,
  LABOR_DAYS_HIGH: Number(process.env.VUE_APP_LABOR_DAYS_HIGH) || 12,
  MARKUP_RATE_LOW: Number(process.env.VUE_APP_MARKUP_RATE_LOW) || 1.15,
  MARKUP_RATE_MEDIUM: Number(process.env.VUE_APP_MARKUP_RATE_MEDIUM) || 1.4,
  MARKUP_RATE_HIGH: Number(process.env.VUE_APP_MARKUP_RATE_HIGH) || 1.5,
  COST_THRESHOLD: Number(process.env.VUE_APP_COST_THRESHOLD) || 50000,
  PROFIT_THRESHOLD_FOR_DISCOUNT: Number(process.env.VUE_APP_PROFIT_THRESHOLD_FOR_DISCOUNT) || 30
});

const MAX_BATTERY_COMBINATIONS = Number(process.env.VUE_APP_MAX_BATTERY_COMBINATIONS) || 10;

function finiteNumber(value) {
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
  return Math.max(0, finiteNumber(item?.costPrice ?? item?.cost ?? item?.price ?? fallback));
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
    name: String(item?.name || overrides.name || 'Equipment'),
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
    name: 'Standard solar panel',
    unit: 'piece',
    costPrice: COST_CONFIG.PANEL_COST_PER_PIECE,
    quantity: 0,
    availableQuantity: 0,
    stockStatus: 'out_of_stock',
    specs: { wattage: 550 },
    configurationRequired: true,
    requiredQuantity: panelCount
  };
}

function buildSystemRecommendation({ unitPerDay, peakLoad, panelCount, catalog = [] }) {
  const requiredPanels = wholeNumber(panelCount);
  if (requiredPanels <= 0) return { success: false, error: 'Panel requirement is invalid.' };

  const panels = catalog.filter(item => item.type === 'panel');
  const inverters = catalog.filter(item => item.type === 'inverter');
  const batteries = catalog.filter(item => item.type === 'battery');
  const accessories = catalog.filter(item => ['wiring', 'mounting', 'other'].includes(item.type));

  const panelChoice = chooseBest(
    panels.filter(item => finiteNumber(item.specs?.wattage) > 0),
    () => requiredPanels
  );
  const selectedPanel = panelChoice?.item || defaultPanel(requiredPanels);

  const inverterChoice = chooseBest(
    inverters.filter(inverter => {
      return finiteNumber(inverter.specs?.peakLoad) >= finiteNumber(peakLoad)
        && finiteNumber(inverter.specs?.maxPanels) >= requiredPanels;
    }),
    () => 1
  );
  if (!inverterChoice) {
    return { success: false, error: 'No configured inverter supports the calculated panel count and peak load.' };
  }
  const selectedInverter = inverterChoice.item;

  let batteryInfo = { selectedBattery: null, quantity: 0 };
  const batteryVoltage = finiteNumber(selectedInverter.specs?.batterySupported);
  if (batteryVoltage > 0) {
    const seriesFactor = batteryVoltage / 12;
    if (!Number.isInteger(seriesFactor) || seriesFactor <= 0) {
      return { success: false, error: 'The selected inverter has an unsupported battery-voltage configuration.' };
    }

    const requiredEnergy = (finiteNumber(unitPerDay) * 3) / 5;
    const candidates = [];
    batteries.forEach(battery => {
      const energy = finiteNumber(battery.specs?.energy);
      if (energy <= 0) return;
      for (let parallelStrings = 1; parallelStrings <= MAX_BATTERY_COMBINATIONS; parallelStrings += 1) {
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
      return { success: false, error: 'No configured battery combination meets the calculated backup requirement.' };
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
  const shortItems = billOfMaterials.filter(line => line.shortfall > 0);

  return {
    success: true,
    panelCount: requiredPanels,
    panel: selectedPanel,
    inverter: selectedInverter,
    battery: batteryInfo,
    billOfMaterials,
    inventoryAssessment: {
      status: shortItems.length ? 'shortfall' : 'ready',
      totalShortfall: shortItems.reduce((sum, line) => sum + line.shortfall, 0),
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

function publicEquipment(item, type) {
  if (!item) return null;
  const specs = item.specs && typeof item.specs === 'object' ? item.specs : {};
  if (type === 'panel') {
    return {
      type,
      name: String(item.name || 'Solar panel'),
      wattage: finiteNumber(specs.wattage),
      technology: String(specs.technology || '')
    };
  }
  if (type === 'inverter') {
    return {
      type,
      name: String(item.name || 'Solar inverter'),
      peakLoad: finiteNumber(specs.peakLoad),
      batteryVoltage: finiteNumber(specs.batterySupported)
    };
  }
  if (type === 'battery') {
    return {
      type,
      name: String(item.name || 'Solar battery'),
      capacity: finiteNumber(specs.capacity),
      energy: finiteNumber(specs.energy),
      voltage: finiteNumber(specs.voltage) || 12
    };
  }
  return { type, name: String(item.name || 'System accessory') };
}

function publicRequirement(line) {
  return {
    type: String(line.type || 'other'),
    name: String(line.name || 'Equipment'),
    unit: String(line.unit || 'piece'),
    requiredQuantity: wholeNumber(line.requiredQuantity)
  };
}

function customerRecommendation(fullRecommendation, recommendationId, calculationInput) {
  const battery = fullRecommendation.battery;
  return {
    recommendationId,
    panelCount: fullRecommendation.panelCount,
    panel: publicEquipment(fullRecommendation.panel, 'panel'),
    inverter: publicEquipment(fullRecommendation.inverter, 'inverter'),
    battery: {
      selectedBattery: publicEquipment(battery.selectedBattery, 'battery'),
      quantity: wholeNumber(battery.quantity)
    },
    requirements: fullRecommendation.billOfMaterials.map(publicRequirement),
    estimatedInstalledPrice: Math.ceil(fullRecommendation.totalCostWithMarkup),
    offerPrice: Math.ceil(fullRecommendation.offerPrice),
    calculationInput: {
      unitPerDay: finiteNumber(calculationInput.unitPerDay),
      peakLoad: finiteNumber(calculationInput.peakLoad),
      panelCount: wholeNumber(calculationInput.panelCount)
    }
  };
}

module.exports = {
  buildSystemRecommendation,
  customerRecommendation,
  finiteNumber,
  wholeNumber
};
