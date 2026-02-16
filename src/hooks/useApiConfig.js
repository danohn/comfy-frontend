import { useState } from 'react'

function normalizeApiUrl(url) {
  return url.trim().replace(/\/prompt\/?$/, '')
}

function loadStoredApiUrl() {
  const saved = localStorage.getItem('comfy_api_url')
  if (!saved) return ''
  return normalizeApiUrl(saved)
}

export default function useApiConfig() {
  const [apiUrl, setApiUrl] = useState(() => loadStoredApiUrl())
  const [settingsUrl, setSettingsUrl] = useState(() => loadStoredApiUrl())
  const [showSettings, setShowSettings] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)

  const hasConfiguredApiUrl = apiUrl.length > 0

  function openSettings() {
    setSettingsUrl(apiUrl)
    setConnectionStatus(null)
    setShowSettings(true)
  }

  function closeSettings() {
    setShowSettings(false)
  }

  function saveApiUrl(url) {
    const cleanUrl = normalizeApiUrl(url)
    if (!cleanUrl) {
      return { ok: false, error: 'Please enter your ComfyUI API URL before continuing' }
    }

    setApiUrl(cleanUrl)
    setSettingsUrl(cleanUrl)
    localStorage.setItem('comfy_api_url', cleanUrl)
    return { ok: true }
  }

  async function testConnection(url) {
    const cleanUrl = normalizeApiUrl(url)
    if (!cleanUrl) {
      const next = { type: 'error', message: 'Enter an API URL first' }
      setConnectionStatus(next)
      return { ok: false, ...next }
    }

    setIsTestingConnection(true)
    setConnectionStatus({ type: 'info', message: 'Testing connection...' })

    try {
      const systemStatsRes = await fetch(`${cleanUrl}/system_stats`)
      if (systemStatsRes.ok) {
        const next = { type: 'success', message: 'Connection successful' }
        setConnectionStatus(next)
        return { ok: true, ...next }
      }

      const queueRes = await fetch(`${cleanUrl}/queue`)
      if (queueRes.ok) {
        const next = { type: 'success', message: 'Connection successful' }
        setConnectionStatus(next)
        return { ok: true, ...next }
      }

      const next = { type: 'error', message: `Connection failed (${systemStatsRes.status})` }
      setConnectionStatus(next)
      return { ok: false, ...next }
    } catch (_) {
      const next = { type: 'error', message: 'Connection failed (network/CORS error)' }
      setConnectionStatus(next)
      return { ok: false, ...next }
    } finally {
      setIsTestingConnection(false)
    }
  }

  return {
    apiUrl,
    settingsUrl,
    showSettings,
    isTestingConnection,
    connectionStatus,
    hasConfiguredApiUrl,
    setSettingsUrl,
    setShowSettings,
    openSettings,
    closeSettings,
    saveApiUrl,
    testConnection,
  }
}
