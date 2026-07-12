const { getAdminServices, jsonResponse, requirePermission } = require('./_firebaseAdmin');

const STARTER_PANELS = [
  {
    itemId: 'PANEL-BIFACIAL-STARTER',
    sku: 'PNL-BIFACIAL-STARTER',
    name: 'Bifacial Solar Panel',
    description: 'Starter inventory model. Update brand, technology, wattage, price, supplier and stock before enabling calculator recommendations.',
    panelType: 'bifacial'
  },
  {
    itemId: 'PANEL-NON-BIFACIAL-STARTER',
    sku: 'PNL-NON-BIFACIAL-STARTER',
    name: 'Non-bifacial Solar Panel',
    description: 'Starter inventory model. Update brand, technology, wattage, price, supplier and stock before enabling calculator recommendations.',
    panelType: 'non_bifacial'
  }
];

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await requirePermission(event, 'inventory.write');
  if (!authorization.authorized) return authorization.response;

  try {
    const { db, fieldValue } = getAdminServices();
    const batch = db.batch();
    const created = [];
    const skipped = [];

    for (const starter of STARTER_PANELS) {
      const ref = db.collection('inventory').doc(starter.itemId);
      const snapshot = await ref.get();
      if (snapshot.exists) {
        skipped.push(starter.name);
        continue;
      }
      batch.set(ref, {
        itemId: starter.itemId,
        type: 'panel',
        sku: starter.sku,
        name: starter.name,
        description: starter.description,
        specs: {
          wattage: 550,
          technology: '',
          panelType: starter.panelType
        },
        costPrice: 0,
        sellingPrice: 0,
        profit: 0,
        profitMargin: 0,
        quantity: 0,
        reorderPoint: 2,
        targetStock: 5,
        leadTimeDays: 7,
        unit: 'piece',
        supplier: '',
        discontinued: false,
        activeForCalculator: false,
        status: 'out_of_stock',
        starterTemplate: true,
        createdByUid: authorization.user.uid,
        createdAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp()
      });
      created.push(starter.name);
    }

    if (created.length) await batch.commit();
    return jsonResponse(200, {
      success: true,
      created,
      skipped,
      message: created.length
        ? 'Bifacial and non-bifacial starter panel models were added. Update their actual brand, technology, wattage, prices and stock before calculator use.'
        : 'Both starter panel models already exist.'
    });
  } catch (error) {
    console.error('Unable to create starter panel models:', error);
    return jsonResponse(500, { error: 'Unable to create starter panel models' });
  }
};
