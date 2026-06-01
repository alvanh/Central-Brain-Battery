// Netlify Function — energy.js
// POST : reçoit les données du HomeyScript toutes les 10s → stocke dans Netlify Blobs
// GET  : renvoie les dernières données stockées

const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  const store = getStore({
    name: 'energy-data',
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token:  process.env.NETLIFY_TOKEN   || process.env.NETLIFY_AUTH_TOKEN
  });

  // ── POST : stocker les données live de Homey ──
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body || '{}');
      await store.set('latest', JSON.stringify(data));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  // ── GET : lire les dernières données ──
  try {
    const raw = await store.get('latest');
    if (!raw) {
      // Fallback : lire depuis GitHub raw si pas encore de données live
      const res = await fetch('https://raw.githubusercontent.com/alvanh/Central-Brain-Battery/main/data/energy.json?t=' + Date.now());
      const data = await res.json();
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data, source: 'github' }) };
    }
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data: JSON.parse(raw), source: 'live' }) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
