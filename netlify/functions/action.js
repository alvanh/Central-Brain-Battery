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

  // POST : stocker une action
  if (event.httpMethod === 'POST') {
    try {
      const { action } = JSON.parse(event.body || '{}');
      if (action === 'clear') {
        await store.delete('pending-action');
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
      }
      await store.set('pending-action', JSON.stringify({ action, requestedAt: new Date().toISOString(), done: false }));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, action }) };
    } catch (e) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  // GET : lire l'action en attente
  if (event.httpMethod === 'GET') {
    try {
      const raw = await store.get('pending-action');
      if (!raw) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, pending: null }) };
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, pending: JSON.parse(raw) }) };
    } catch (e) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
};
