const { getAdminServices, jsonResponse } = require('./_firebaseAdmin');

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  try {
    const { db } = getAdminServices();
    const [inverterSnapshot, batterySnapshot] = await Promise.all([
      db.collection('inverters').get(),
      db.collection('batteries').get()
    ]);

    const inverters = inverterSnapshot.docs
      .map(itemDoc => {
        const data = itemDoc.data();
        return {
          id: itemDoc.id,
          name: String(data.name || '').trim(),
          peakLoad: numberValue(data.peakLoad),
          maxPanels: numberValue(data.maxPanels),
          batterySupported: numberValue(data.batterySupported),
          cost: numberValue(data.cost)
        };
      })
      .filter(item => item.name && item.peakLoad > 0 && item.maxPanels > 0)
      .sort((a, b) => a.cost - b.cost || a.peakLoad - b.peakLoad);

    const batteries = batterySnapshot.docs
      .map(itemDoc => {
        const data = itemDoc.data();
        return {
          id: itemDoc.id,
          name: String(data.name || '').trim(),
          energy: numberValue(data.energy),
          capacity: numberValue(data.capacity),
          price: numberValue(data.price)
        };
      })
      .filter(item => item.name && item.energy > 0 && item.capacity > 0)
      .sort((a, b) => a.price - b.price || a.capacity - b.capacity);

    return jsonResponse(
      200,
      { inverters, batteries },
      { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    );
  } catch (error) {
    console.error('Error fetching calculator data:', error);
    return jsonResponse(500, { error: 'Unable to load calculator equipment data' });
  }
};
