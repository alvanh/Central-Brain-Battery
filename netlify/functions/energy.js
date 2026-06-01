const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  const store = getStore({
    name: 'energy-data',
    siteID: process.env.NETLIFY_SITE_ID,
    token:  process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN
  });

  // POST : stocker les données live de Homey
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body || '{}');
      await store.set('latest', JSON.stringify(data));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ts: new Date().toISOString() }) };
    } catch (e) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  // GET : lire les dernières données Homey
  try {
    const raw = await store.get('latest');
    if (!raw) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, message: 'Aucune donnée' }) };
    }
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data: JSON.parse(raw) }) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
