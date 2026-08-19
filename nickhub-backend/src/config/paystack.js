const API_URL = 'https://api.paystack.co';

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    const error = new Error('Paystack is not configured');
    error.status = 503;
    throw error;
  }
  return key;
}

async function paystackRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status) {
    const error = new Error(payload?.message || 'Paystack request failed');
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }
  return payload.data;
}

module.exports = { getSecretKey, paystackRequest };
