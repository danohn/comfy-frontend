import { useCallback, useState } from 'react'
import { normalizeBaseUrl } from '../lib/apiUrl'

export default function useServerAdmin({ apiUrl, refreshQueue, loadTemplatesForBaseUrl }) {
  const [serverFeatures, setServerFeatures] = useState(null)
  const [serverSystemStats, setServerSystemStats] = useState(null)
  const [serverExtensions, setServerExtensions] = useState([])
  const [showExtensions, setShowExtensions] = useState(false)
  const [serverHistoryCount, setServerHistoryCount] = useState(null)
  const [isLoadingServerData, setIsLoadingServerData] = useState(false)
  const [serverDataError, setServerDataError] = useState(null)
  const [opsActionStatus, setOpsActionStatus] = useState(null)

  const fetchServerData = useCallback(async () => {
    if (!apiUrl) return

    setIsLoadingServerData(true)
    setServerDataError(null)
    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const [featuresRes, statsRes, extensionsRes, historyRes, jobsRes] = await Promise.all([
        fetch(`${baseUrl}/features`),
        fetch(`${baseUrl}/system_stats`),
        fetch(`${baseUrl}/extensions`),
        fetch(`${baseUrl}/history`),
        fetch(`${baseUrl}/api/jobs?limit=1&offset=0`),
      ])

      if (featuresRes.ok) {
        setServerFeatures(await featuresRes.json())
      }
      if (statsRes.ok) {
        setServerSystemStats(await statsRes.json())
      }
      if (extensionsRes.ok) {
        const extensions = await extensionsRes.json()
        setServerExtensions(Array.isArray(extensions) ? extensions : [])
      }
      if (historyRes.ok) {
        const history = await historyRes.json()
        setServerHistoryCount(history && typeof history === 'object' ? Object.keys(history).length : 0)
      }
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        const total = jobsData?.pagination?.total
        if (typeof total === 'number') {
          setServerHistoryCount(total)
        }
      }

      await loadTemplatesForBaseUrl(baseUrl)
    } catch (err) {
      setServerDataError(String(err))
    } finally {
      setIsLoadingServerData(false)
    }
  }, [apiUrl, loadTemplatesForBaseUrl])

  const runOpsAction = useCallback(async (actionName, body) => {
    if (!apiUrl) {
      setOpsActionStatus({ ok: false, message: 'Configure API URL first' })
      return
    }

    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const res = await fetch(`${baseUrl}/${actionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(`${actionName} failed: ${res.status}`)
      }
      setOpsActionStatus({ ok: true, message: `${actionName} action completed` })
      await refreshQueue(apiUrl)
      await fetchServerData()
    } catch (err) {
      setOpsActionStatus({ ok: false, message: String(err) })
    }
  }, [apiUrl, fetchServerData, refreshQueue])

  const handleClearPendingQueue = useCallback(async () => {
    await runOpsAction('queue', { clear: true })
  }, [runOpsAction])

  const handleInterruptExecution = useCallback(async () => {
    await runOpsAction('interrupt', {})
  }, [runOpsAction])

  const handleClearServerHistory = useCallback(async () => {
    await runOpsAction('history', { clear: true })
  }, [runOpsAction])

  const handleFreeMemory = useCallback(async () => {
    await runOpsAction('free', { unload_models: true, free_memory: true })
  }, [runOpsAction])

  return {
    serverFeatures,
    serverSystemStats,
    serverExtensions,
    showExtensions,
    setShowExtensions,
    serverHistoryCount,
    isLoadingServerData,
    serverDataError,
    opsActionStatus,
    fetchServerData,
    handleClearPendingQueue,
    handleInterruptExecution,
    handleClearServerHistory,
    handleFreeMemory,
  }
}
