// Netlify Function — action.js
// Reçoit les actions déclenchées depuis les boutons du dashboard
// Les stocke dans Blobs pour que le Mac les exécute

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

  // POST : stocker une action en attente
  if (event.httpMethod === 'POST') {
    try {
      const { action, params } = JSON.parse(event.body || '{}');
      const pending = { action, params, requestedAt: new Date().toISOString(), done: false };
      await store.set('pending-action', JSON.stringify(pending));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, action }) };
    } catch (e) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  // GET : lire l'action en attente (appelé par le Mac)
  try {
    const raw = await store.get('pending-action');
    if (!raw) return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, pending: null }) };
    const pending = JSON.parse(raw);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, pending }) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
  }

  // DELETE : effacer après exécution
  if (event.httpMethod === 'DELETE') {
    await store.delete('pending-action');
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
  }
};
