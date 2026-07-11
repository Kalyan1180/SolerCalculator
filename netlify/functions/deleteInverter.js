const { jsonResponse, requireAdmin } = require('./_firebaseAdmin');

function validId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null;
}

exports.handler = async event => {
  if (event.httpMethod !== 'DELETE') return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'DELETE' });
  const authorization = await requireAdmin(event);
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const id = validId(payload.id);
    if (!id) return jsonResponse(400, { error: 'A valid inverter ID is required' });

    const inverterRef = authorization.db.collection('inverters').doc(id);
    const snapshot = await inverterRef.get();
    if (!snapshot.exists) return jsonResponse(404, { error: 'Inverter not found' });
    await inverterRef.delete();
    return jsonResponse(200, { message: 'Inverter deleted successfully' });
  } catch (error) {
    console.error('Error deleting inverter:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    return jsonResponse(500, { error: 'Failed to delete inverter' });
  }
};
