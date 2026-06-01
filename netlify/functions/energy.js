// Netlify Function — energy.js
// POST : reçoit les données de Homey → push vers GitHub via API (pas de cache)
// GET  : lit depuis GitHub API (pas de cache, données fraîches)

const REPO = 'alvanh/Central-Brain-Battery';
const FILE = 'data/energy.json';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
};

async function githubGet(token) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error('GitHub GET ' + res.status);
  const meta = await res.json();
  return {
    sha: meta.sha,
    data: JSON.parse(Buffer.from(meta.content, 'base64').toString())
  };
}

async function githubPut(token, sha, content, msg) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE}`,
    {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
      body: JSON.stringify({
        message: msg,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        ...(sha ? { sha } : {})
      })
    }
  );
  return res.ok;
}

exports.handler = async (event) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'GITHUB_TOKEN manquant' }) };

  // POST : stocker les nouvelles données
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body || '{}');
      let sha = '';
      try { const cur = await githubGet(token); sha = cur.sha; } catch (e) {}
      const ok = await githubPut(token, sha, data, `live ${new Date().toLocaleTimeString('fr-FR')}`);
      return { statusCode: ok ? 200 : 500, headers: HEADERS, body: JSON.stringify({ ok }) };
    } catch (e) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  // GET : lire depuis GitHub API (pas de cache contrairement à raw.githubusercontent.com)
  try {
    const { data } = await githubGet(token);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
