const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message = typeof data === 'string'
      ? data
      : data?.detail || data?.message || 'Request failed'
    throw new Error(message)
  }

  return data
}

export function getConfig() {
  return request('/config')
}

export function analyzeProduct(payload) {
  return request('/analyze-product', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function enrichCompetitor(payload) {
  return request('/enrich-competitor', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
