const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  const store = getStore("central-brain-battery");

  if (event.httpMethod === "POST") {
    try {
      const data = JSON.parse(event.body || "{}");

      if (!data.batteries || !Array.isArray(data.batteries)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: "JSON invalide : batteries manquant" })
        };
      }

      await store.setJSON("latest", {
        ...data,
        receivedAt: new Date().toISOString()
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true })
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: err.message })
      };
    }
  }

  if (event.httpMethod === "GET") {
    const latest = await store.get("latest", { type: "json" });

    if (!latest) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          message: "Aucune donnée Homey reçue pour l’instant"
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        ok: true,
        data: latest
      })
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ ok: false, error: "Méthode non autorisée" })
  };
};
