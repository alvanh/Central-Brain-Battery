const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const store = getStore('energy-data');

    // Handle POST request - store incoming data
    if (event.httpMethod === 'POST') {
      try {
        const incomingData = JSON.parse(event.body || '{}');

        // Store the data persistently using Netlify Blobs
        await store.set('latestData', JSON.stringify(incomingData), {
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'homey'
          }
        });

        console.log('Data stored successfully at:', new Date().toISOString());

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          },
          body: JSON.stringify({
            ok: true,
            success: true,
            message: 'Data received and stored',
            timestamp: new Date().toISOString()
          })
        };
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ok: false,
            error: 'Invalid JSON in request body'
          })
        };
      }
    }

    // Handle GET request - retrieve latest data
    try {
      const latestDataStr = await store.get('latestData');

      if (!latestDataStr) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          },
          body: JSON.stringify({
            ok: false,
            message: 'Aucune donnée disponible'
          })
        };
      }

      const latestData = JSON.parse(latestDataStr);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          ok: true,
          success: true,
          data: latestData,
          retrievedAt: new Date().toISOString()
        })
      };
    } catch (retrieveError) {
      console.error('Error retrieving data:', retrieveError);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'Error retrieving stored data'
        })
      };
    }
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
