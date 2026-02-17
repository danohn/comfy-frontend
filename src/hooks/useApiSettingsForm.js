import { useEffect, useState } from 'react'
import { buildApiUrlFromParts, parseApiUrlParts } from '../lib/apiUrl'

export default function useApiSettingsForm({ apiUrl, settingsUrl, setSettingsUrl, isSettingsRoute, isOnboardingRoute }) {
  const [apiHost, setApiHost] = useState('')
  const [apiProtocol, setApiProtocol] = useState('http')
  const [apiPort, setApiPort] = useState('8188')
  const [showAdvancedApi, setShowAdvancedApi] = useState(false)

  function syncApiFieldsFromUrl(url) {
    const parsed = parseApiUrlParts(url)
    setApiProtocol(parsed.protocol)
    setApiHost(parsed.host)
    setApiPort(parsed.port)
  }

  useEffect(() => {
    if (!isOnboardingRoute && !isSettingsRoute) return
    // Sync when entering an editable route, not on every keystroke-driven
    // settingsUrl update, to avoid URL hostname normalization altering input.
    syncApiFieldsFromUrl(settingsUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnboardingRoute, isSettingsRoute])

  function updateApiSettings(next) {
    const nextProtocol = next.protocol ?? apiProtocol
    const nextHost = next.host ?? apiHost
    const nextPort = next.port ?? apiPort

    setApiProtocol(nextProtocol)
    setApiHost(nextHost)
    setApiPort(nextPort)
    setSettingsUrl(buildApiUrlFromParts({
      protocol: nextProtocol,
      host: nextHost,
      port: nextPort,
    }))
  }

  function prepSettingsFromApi() {
    setSettingsUrl(apiUrl)
    syncApiFieldsFromUrl(apiUrl)
  }

  return {
    apiHost,
    apiProtocol,
    apiPort,
    showAdvancedApi,
    setShowAdvancedApi,
    syncApiFieldsFromUrl,
    updateApiSettings,
    prepSettingsFromApi,
  }
}
