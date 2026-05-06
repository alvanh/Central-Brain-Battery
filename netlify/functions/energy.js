let latestData = {
  updatedAt: null
};

exports.handler = async (event) => {

  // SAVE
  if (event.httpMethod === 'POST') {
    try {
      latestData = JSON.parse(event.body);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true
        })
      };

    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: e.message
        })
      };
    }
  }

  // READ
  return {
    statusCode: 200,
    body: JSON.stringify(latestData)
  };
};
