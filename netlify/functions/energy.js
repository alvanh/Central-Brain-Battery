// Netlify Function — energy.js
// Proxy vers data/energy.json sur GitHub (public, pas de token nécessaire)
// Le Mac pousse directement vers GitHub toutes les 5 min via homey-receiver.js

const RAW_URL = 'https://raw.githubusercontent.com/alvanh/Central-Brain-Battery/main/data/energy.json';

exports.handler = async () => {
  try {
    const res = await fetch(RAW_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('GitHub ' + res.status);
    const data = await res.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, data })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
