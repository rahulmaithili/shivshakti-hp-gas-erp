/**
 * Netlify Serverless Proxy Function for Google Apps Script Web App
 * Hides the Google Apps Script deployment URL and resolves CORS seamlessly.
 */

exports.handler = async function (event, context) {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ ok: true })
    };
  }

  const scriptUrl =
    process.env.APPS_SCRIPT_URL ||
    process.env.GAS_WEBAPP_URL ||
    'https://script.google.com/macros/s/AKfycbxnNUYfRxB_gMNx3Y-2OX5GEBvj2gRJuT1MomxlZZ8U-jWLkH_0e_VZ3NcyZtG8lhIieg/exec';

  try {
    let payload = event.body || '{}';

    // Google Apps Script requires text/plain POST to avoid preflight issues & follow 302 redirects
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: payload,
      redirect: 'follow'
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { ok: false, error: 'Invalid response from Apps Script: ' + responseText };
    }

    return {
      statusCode: response.ok ? 200 : response.status,
      headers: headers,
      body: JSON.stringify(responseData)
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: headers,
      body: JSON.stringify({
        ok: false,
        error: 'Netlify proxy connection error: ' + err.message
      })
    };
  }
};
