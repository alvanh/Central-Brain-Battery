// Netlify Function — energy.js
// GET  : proxy GitHub raw (mis à jour par homey-receiver.js toutes les 5 min)
// POST : accepté mais ignoré (pas de Blobs sans env vars)

const RAW_URL = 'https://raw.githubusercontent.com/alvanh/Central-Brain-Battery/main/data/energy.json';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  try {
    const res = await fetch(RAW_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('GitHub ' + res.status);
    const data = await res.json();
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true, data })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
