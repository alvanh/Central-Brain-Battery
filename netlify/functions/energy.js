let latestData = null;

exports.handler = async (event) => {
  if (event.httpMethod === 'POST') {
    latestData = JSON.parse(event.body || '{}');

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        success: true
      })
    };
  }

  if (!latestData) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: false,
        message: 'Aucune donnée'
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({
      ok: true,
      data: latestData
    })
  };
};
