const { jsonResponse, requirePermission } = require('./_firebaseAdmin');

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function wholeNumber(value) {
  return Math.max(0, Math.floor(numberValue(value)));
}

function sku(prefix, id) {
  return `${prefix}-${String(id || '').slice(0, 8).toUpperCase()}`;
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await requirePermission(event, 'inventory.write');
  if (!authorization.authorized) return authorization.response;

  try {
    const { db } = authorization;
    const [inventorySnapshot, inverterSnapshot, batterySnapshot] = await Promise.all([
      db.collection('inventory').get(),
      db.collection('inverters').get(),
      db.collection('batteries').get()
    ]);

    const existingKeys = new Set(
      inventorySnapshot.docs
        .map(itemDoc => itemDoc.data())
        .filter(item => item.legacySourceId)
        .map(item => `${item.type}:${item.legacySourceId}`)
    );

    const batch = db.batch();
    let imported = 0;
    let skipped = 0;
    const now = new Date();

    inverterSnapshot.docs.forEach(itemDoc => {
      const key = `inverter:${itemDoc.id}`;
      if (existingKeys.has(key)) {
        skipped += 1;
        return;
      }
      const data = itemDoc.data();
      const itemId = `LEGACY-INVERTER-${itemDoc.id}`;
      const cost = numberValue(data.cost);
      batch.set(db.collection('inventory').doc(itemId), {
        itemId,
        sku: sku('LEG-INV', itemDoc.id),
        type: 'inverter',
        name: String(data.name || 'Imported inverter').trim(),
        description: 'Imported from the previous calculator equipment collection.',
        specs: {
          peakLoad: numberValue(data.peakLoad),
          maxPanels: wholeNumber(data.maxPanels),
          batterySupported: numberValue(data.batterySupported)
        },
        costPrice: cost,
        sellingPrice: cost,
        profit: 0,
        profitMargin: 0,
        quantity: 0,
        reorderPoint: 1,
        targetStock: 2,
        leadTimeDays: 7,
        unit: 'piece',
        supplier: '',
        status: 'out_of_stock',
        discontinued: false,
        activeForCalculator: true,
        legacySource: false,
        legacySourceId: itemDoc.id,
        createdAt: now,
        updatedAt: now
      });
      imported += 1;
    });

    batterySnapshot.docs.forEach(itemDoc => {
      const key = `battery:${itemDoc.id}`;
      if (existingKeys.has(key)) {
        skipped += 1;
        return;
      }
      const data = itemDoc.data();
      const itemId = `LEGACY-BATTERY-${itemDoc.id}`;
      const cost = numberValue(data.price);
      batch.set(db.collection('inventory').doc(itemId), {
        itemId,
        sku: sku('LEG-BAT', itemDoc.id),
        type: 'battery',
        name: String(data.name || 'Imported battery').trim(),
        description: 'Imported from the previous calculator equipment collection.',
        specs: {
          capacity: numberValue(data.capacity),
          energy: numberValue(data.energy),
          voltage: 12
        },
        costPrice: cost,
        sellingPrice: cost,
        profit: 0,
        profitMargin: 0,
        quantity: 0,
        reorderPoint: 1,
        targetStock: 4,
        leadTimeDays: 7,
        unit: 'piece',
        supplier: '',
        status: 'out_of_stock',
        discontinued: false,
        activeForCalculator: true,
        legacySource: false,
        legacySourceId: itemDoc.id,
        createdAt: now,
        updatedAt: now
      });
      imported += 1;
    });

    if (imported > 0) await batch.commit();

    return jsonResponse(200, {
      message: imported > 0
        ? `Imported ${imported} legacy equipment item(s). Set the actual stock quantity and supplier details before relying on availability.`
        : 'No new legacy equipment items were found.',
      imported,
      skipped
    });
  } catch (error) {
    console.error('Legacy equipment migration failed:', error);
    return jsonResponse(500, { error: 'Unable to migrate legacy equipment' });
  }
};
