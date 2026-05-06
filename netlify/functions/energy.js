const { getStore } = require("@netlify/blobs");

function getBlobStore() {
  return getStore({
    name: "central-brain-battery",
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN
  });
}

exports.handler = async function(event) {
  try {
    const store = getBlobStore();

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");

      await store.setJSON("latest", {
        ...data,
        receivedAt: new Date().toISOString()
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true })
      };
    }

    if (event.httpMethod === "GET") {
      const latest = await store.get("latest", { type: "json" });

      return {
        statusCode: 200,
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({
          ok: !!latest,
          data: latest || null,
          message: latest ? undefined : "Aucune donnée"
        })
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: "Méthode non autorisée" })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: err.message
      })
    };
  }
};
