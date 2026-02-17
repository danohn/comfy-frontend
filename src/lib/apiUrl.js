export function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/prompt\/?$/, '')
}

export function parseApiUrlParts(url) {
  const fallback = { protocol: 'http', host: '', port: '8188' }
  const raw = String(url || '').trim()
  if (!raw) return fallback

  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
    const parsed = new URL(normalized)
    return {
      protocol: parsed.protocol.replace(':', '') || 'http',
      host: parsed.hostname || '',
      port: parsed.port || '8188',
    }
  } catch (_) {
    return fallback
  }
}

export function buildApiUrlFromParts({ protocol, host, port }) {
  const cleanHost = String(host || '').trim()
  if (!cleanHost) return ''
  const cleanProtocol = protocol === 'https' ? 'https' : 'http'
  const cleanPort = String(port || '').trim()
  return cleanPort ? `${cleanProtocol}://${cleanHost}:${cleanPort}` : `${cleanProtocol}://${cleanHost}`
}
