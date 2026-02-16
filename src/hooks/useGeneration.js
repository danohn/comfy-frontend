import { useCallback, useRef, useState } from 'react'

const HISTORY_STORAGE_KEY = 'comfy_job_history'
const MAX_HISTORY_ITEMS = 20

function loadStoredHistory() {
  const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch (_) {
    // Fall through to clearing malformed data.
  }

  localStorage.removeItem(HISTORY_STORAGE_KEY)
  return []
}

function persistHistory(entries) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
}

function buildWebSocketUrl(baseUrl, clientId) {
  const url = new URL(baseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws'
  url.searchParams.set('clientId', clientId)
  return url.toString()
}

function injectPromptIntoWorkflow(runGraph, prompt) {
  let updatedCount = 0

  for (const nodeId of Object.keys(runGraph)) {
    const node = runGraph[nodeId]
    if (!node || typeof node !== 'object' || !node.inputs || typeof node.inputs !== 'object') {
      continue
    }

    const classType = String(node.class_type || '').toLowerCase()
    const title = String(node._meta?.title || '').toLowerCase()
    const hasTextInput = typeof node.inputs.text === 'string'
    const looksLikePromptNode = classType.includes('cliptextencode') || title.includes('prompt')

    if (hasTextInput && looksLikePromptNode) {
      node.inputs.text = prompt
      updatedCount++
    }
  }

  return updatedCount
}

export default function useGeneration() {
  const [isLoading, setIsLoading] = useState(false)
  const [imageSrc, setImageSrc] = useState(null)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [jobHistory, setJobHistory] = useState(() => loadStoredHistory())
  const [currentPromptId, setCurrentPromptId] = useState(null)
  const cancelRequestedRef = useRef(false)
  const [queueState, setQueueState] = useState({
    pending: null,
    running: null,
    updatedAt: null,
    error: null,
  })

  function updateHistory(mutator) {
    setJobHistory((current) => {
      const next = mutator(current).slice(0, MAX_HISTORY_ITEMS)
      persistHistory(next)
      return next
    })
  }

  function addHistoryItem(item) {
    updateHistory((current) => [item, ...current])
  }

  function patchHistoryItem(id, patch) {
    updateHistory((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function clearHistory() {
    setJobHistory([])
    localStorage.removeItem(HISTORY_STORAGE_KEY)
  }

  function showHistoryImage(url) {
    setImageSrc(url)
    setError(null)
    setStatusMessage('')
  }

  const refreshQueue = useCallback(async (apiUrl) => {
    if (!apiUrl) return

    const baseUrl = apiUrl.replace(/\/prompt\/?$/, '')
    try {
      const res = await fetch(`${baseUrl}/queue`)
      if (!res.ok) {
        setQueueState((current) => ({ ...current, error: `Queue check failed (${res.status})` }))
        return
      }
      const data = await res.json()
      const running = Array.isArray(data.queue_running) ? data.queue_running.length : 0
      const pending = Array.isArray(data.queue_pending) ? data.queue_pending.length : 0
      setQueueState({
        running,
        pending,
        updatedAt: new Date().toISOString(),
        error: null,
      })
    } catch (_) {
      setQueueState((current) => ({ ...current, error: 'Queue unavailable' }))
    }
  }, [])

  const cancelCurrentRun = useCallback(async (apiUrl) => {
    if (!apiUrl || !isLoading) return false

    const baseUrl = apiUrl.replace(/\/prompt\/?$/, '')
    try {
      const res = await fetch(`${baseUrl}/interrupt`, { method: 'POST' })
      if (!res.ok) {
        setError(`Cancel request failed: ${res.status}`)
        return false
      }
      cancelRequestedRef.current = true
      setStatusMessage('Cancelling...')
      return true
    } catch (_) {
      setError('Cancel request failed (network/CORS error)')
      return false
    }
  }, [isLoading])

  const generate = useCallback(async ({ promptText, apiUrl, workflow, openSettings, onSuccess }) => {
    if (!promptText.trim()) return
    if (!apiUrl) {
      setError('Configure your ComfyUI API URL in Settings to generate images')
      openSettings()
      return
    }
    if (!workflow) {
      setError('Configure a workflow JSON in Settings to generate images')
      openSettings()
      return
    }

    setIsLoading(true)
    setError(null)
    setImageSrc(null)
    setStatusMessage('Queued')
    cancelRequestedRef.current = false

    const historyItemId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    addHistoryItem({
      id: historyItemId,
      prompt: promptText.trim(),
      status: 'running',
      createdAt: new Date().toISOString(),
      imageSrc: null,
      error: null,
    })

    let ws = null

    try {
      const runGraph = JSON.parse(JSON.stringify(workflow))
      const updatedPromptNodes = injectPromptIntoWorkflow(runGraph, promptText)
      if (updatedPromptNodes === 0) {
        throw new Error('No prompt text node found in workflow (expected a CLIPTextEncode-style node with an inputs.text field)')
      }

      const baseUrl = apiUrl.replace(/\/prompt\/?$/, '')
      const clientId = `web-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

      try {
        ws = new WebSocket(buildWebSocketUrl(baseUrl, clientId))
      } catch (_) {
        ws = null
      }

      if (ws) {
        let activePromptId = null

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'status') {
              const pendingRaw = message.data?.status?.exec_info?.queue_remaining
              const pending = typeof pendingRaw === 'number' ? pendingRaw : undefined

              setQueueState((current) => ({
                running: current.running,
                pending: typeof pending === 'number' ? pending : current.pending,
                updatedAt: new Date().toISOString(),
                error: null,
              }))
            } else if (message.type === 'execution_start') {
              if (message.data?.prompt_id) {
                activePromptId = message.data.prompt_id
              }
            } else if (message.type === 'executing') {
              if (activePromptId && message.data?.prompt_id && message.data.prompt_id !== activePromptId) {
                return
              }
            } else if (message.type === 'progress') {
              if (activePromptId && message.data?.prompt_id && message.data.prompt_id !== activePromptId) {
                return
              }
              const value = message.data?.value
              const max = message.data?.max
              if (typeof value === 'number' && typeof max === 'number' && max > 0) {
                const pct = Math.round((value / max) * 100)
                setStatusMessage(`Generating... ${pct}%`)
              }
            } else if (message.type === 'progress_state') {
              if (activePromptId && message.data?.prompt_id && message.data.prompt_id !== activePromptId) {
                return
              }
            } else if (message.type === 'execution_success') {
              if (activePromptId && message.data?.prompt_id && message.data.prompt_id !== activePromptId) {
                return
              }
            } else if (message.type === 'execution_error') {
              if (activePromptId && message.data?.prompt_id && message.data.prompt_id !== activePromptId) {
                return
              }
              const err = message.data?.exception_message || 'Execution error'
              setStatusMessage(`Error: ${err}`)
            }
          } catch (_) {
            // Ignore malformed websocket messages.
          }
        }
      }

      const queueRes = await fetch(`${baseUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: runGraph, client_id: clientId }),
      })

      if (!queueRes.ok) {
        throw new Error(`Queue request failed: ${queueRes.status}`)
      }

      const queueData = await queueRes.json()
      const promptId = queueData.prompt_id

      if (!promptId) {
        throw new Error('No prompt_id in response')
      }
      setCurrentPromptId(promptId)
      patchHistoryItem(historyItemId, { promptId })
      await refreshQueue(apiUrl)

      let result = null
      let attempts = 0
      const maxAttempts = 120

      while (!result && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++

        try {
          const historyRes = await fetch(`${baseUrl}/history/${promptId}`)
          if (!historyRes.ok) {
            continue
          }

          const history = await historyRes.json()
          if (history[promptId]) {
            const entry = history[promptId]
            if (entry.status && entry.status.completed) {
              result = entry
              break
            }
          }
          if (attempts % 3 === 0) {
            await refreshQueue(apiUrl)
          }
        } catch (_) {
          continue
        }
      }

      if (!result) {
        throw new Error('Timeout waiting for image generation')
      }

      let imageUrl = null
      if (result.outputs) {
        for (const nodeId in result.outputs) {
          const output = result.outputs[nodeId]
          if (output.images && output.images.length > 0) {
            const imageInfo = output.images[0]
            const filename = imageInfo.filename
            const subfolder = imageInfo.subfolder || ''
            const type = imageInfo.type || 'output'
            imageUrl = `${baseUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`
            break
          }
        }
      }

      if (!imageUrl) {
        const message = 'Image generation completed but no output found'
        setError(message)
        patchHistoryItem(historyItemId, {
          status: 'failed',
          error: message,
          finishedAt: new Date().toISOString(),
        })
      } else {
        setImageSrc(imageUrl)
        setStatusMessage('Done')
        patchHistoryItem(historyItemId, {
          status: 'success',
          imageSrc: imageUrl,
          error: null,
          finishedAt: new Date().toISOString(),
        })
        onSuccess?.()
      }
    } catch (err) {
      const message = String(err)
      setError(message)
      setStatusMessage('')
      patchHistoryItem(historyItemId, {
        status: cancelRequestedRef.current || message.toLowerCase().includes('interrupt') || message.toLowerCase().includes('cancel')
          ? 'cancelled'
          : 'failed',
        error: message,
        finishedAt: new Date().toISOString(),
      })
    } finally {
      cancelRequestedRef.current = false
      setCurrentPromptId(null)
      await refreshQueue(apiUrl)
      setIsLoading(false)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [isLoading, refreshQueue])

  return {
    isLoading,
    imageSrc,
    error,
    statusMessage,
    currentPromptId,
    queueState,
    jobHistory,
    setError,
    clearHistory,
    showHistoryImage,
    refreshQueue,
    cancelCurrentRun,
    generate,
  }
}
