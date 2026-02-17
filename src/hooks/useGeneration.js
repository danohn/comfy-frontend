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

function getPromptTargets(runGraph) {
  const positiveSamplerTargets = new Set()
  const negativeSamplerTargets = new Set()
  const genericPromptTargets = []
  const genericNegativeTargets = []

  const isTextNode = (node) => !!(node && typeof node === 'object' && node.inputs && typeof node.inputs.text === 'string')

  for (const node of Object.values(runGraph || {})) {
    const classType = String(node?.class_type || '').toLowerCase()
    if (!classType.includes('ksampler')) continue
    const positiveRef = node?.inputs?.positive
    const negativeRef = node?.inputs?.negative
    if (Array.isArray(positiveRef) && positiveRef.length > 0) positiveSamplerTargets.add(String(positiveRef[0]))
    if (Array.isArray(negativeRef) && negativeRef.length > 0) negativeSamplerTargets.add(String(negativeRef[0]))
  }

  for (const [nodeId, node] of Object.entries(runGraph || {})) {
    if (!isTextNode(node)) continue
    const id = String(nodeId)
    const classType = String(node.class_type || '').toLowerCase()
    const title = String(node._meta?.title || '').toLowerCase()
    const looksPromptLike = classType.includes('cliptextencode') || title.includes('prompt')
    if (!looksPromptLike) continue

    const looksNegative = title.includes('negative') || title.includes('neg')
    if (positiveSamplerTargets.has(id)) {
      genericPromptTargets.push(id)
      continue
    }
    if (negativeSamplerTargets.has(id)) {
      genericNegativeTargets.push(id)
      continue
    }
    if (looksNegative) {
      genericNegativeTargets.push(id)
    } else {
      genericPromptTargets.push(id)
    }
  }

  const promptTargets = genericPromptTargets.length > 0
    ? genericPromptTargets
    : Array.from(positiveSamplerTargets).filter((id) => isTextNode(runGraph[id]))
  const negativeTargets = genericNegativeTargets.length > 0
    ? genericNegativeTargets
    : Array.from(negativeSamplerTargets).filter((id) => isTextNode(runGraph[id]))

  return {
    promptTargets,
    negativeTargets,
  }
}

function injectPromptValuesIntoWorkflow(runGraph, prompt, negativePrompt) {
  const { promptTargets, negativeTargets } = getPromptTargets(runGraph)
  let updatedCount = 0

  if (prompt) {
    for (const nodeId of promptTargets) {
      if (runGraph[nodeId]?.inputs && typeof runGraph[nodeId].inputs.text === 'string') {
        runGraph[nodeId].inputs.text = prompt
        updatedCount++
      }
    }
  }

  if (negativePrompt) {
    for (const nodeId of negativeTargets) {
      if (runGraph[nodeId]?.inputs && typeof runGraph[nodeId].inputs.text === 'string') {
        runGraph[nodeId].inputs.text = negativePrompt
        updatedCount++
      }
    }
  }

  return updatedCount
}

function injectImageIntoWorkflow(runGraph, imageName) {
  if (!imageName) return 0

  let updatedCount = 0
  for (const nodeId of Object.keys(runGraph)) {
    const node = runGraph[nodeId]
    if (!node || typeof node !== 'object' || !node.inputs || typeof node.inputs !== 'object') {
      continue
    }

    const classType = String(node.class_type || '').toLowerCase()
    if (classType === 'loadimage' && typeof node.inputs.image === 'string') {
      node.inputs.image = imageName
      updatedCount++
    }
  }

  return updatedCount
}

function extractPromptValidationIssue(payload) {
  const nodeErrors = payload?.node_errors
  if (!nodeErrors || typeof nodeErrors !== 'object') return null

  for (const [nodeId, nodeError] of Object.entries(nodeErrors)) {
    const errors = Array.isArray(nodeError?.errors) ? nodeError.errors : []
    for (const err of errors) {
      if (err?.type !== 'value_not_in_list') continue
      const inputName = err?.extra_info?.input_name
      const receivedValue = err?.extra_info?.received_value
      const configuredValues = err?.extra_info?.input_config?.[0]
      const availableValues = Array.isArray(configuredValues) ? configuredValues : []
      return {
        nodeId,
        classType: nodeError?.class_type || null,
        inputName: typeof inputName === 'string' ? inputName : null,
        receivedValue: typeof receivedValue === 'string' ? receivedValue : null,
        availableValues,
      }
    }
  }

  return null
}

function applyValidationFallback(runGraph, payload) {
  const issue = extractPromptValidationIssue(payload)
  if (!issue || !issue.inputName) return { applied: false, issue }
  if (!Array.isArray(issue.availableValues) || issue.availableValues.length === 0) {
    return { applied: false, issue }
  }
  if (!runGraph?.[issue.nodeId]?.inputs || typeof runGraph[issue.nodeId].inputs !== 'object') {
    return { applied: false, issue }
  }
  if (typeof runGraph[issue.nodeId].inputs[issue.inputName] !== 'string') {
    return { applied: false, issue }
  }

  runGraph[issue.nodeId].inputs[issue.inputName] = issue.availableValues[0]
  return { applied: true, issue, replacementValue: issue.availableValues[0] }
}

function buildQueueErrorMessage(status, payload) {
  if (!payload || typeof payload !== 'object') {
    return `Queue request failed: ${status}`
  }

  const issue = extractPromptValidationIssue(payload)
  if (issue) {
    const settingName = issue.inputName || 'model value'
    const wanted = issue.receivedValue || 'workflow default'
    const availableCount = Array.isArray(issue.availableValues) ? issue.availableValues.length : 0
    if (availableCount === 0) {
      return `Template model validation failed: ${settingName} '${wanted}' is not installed, and no compatible server models are available.`
    }
    return `Template model validation failed: ${settingName} '${wanted}' is unavailable. ${availableCount} compatible models were found on the server.`
  }

  const apiMessage = payload?.error?.message
  if (typeof apiMessage === 'string' && apiMessage) {
    return `Queue request failed: ${apiMessage}`
  }

  return `Queue request failed: ${status}`
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

  const generate = useCallback(async ({
    promptText,
    negativePromptText,
    apiUrl,
    workflow,
    openSettings,
    inputImageFile,
    onSuccess,
  }) => {
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
    const normalizedPrompt = promptText.trim()
    const normalizedNegativePrompt = (negativePromptText || '').trim()

    const historyItemId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    addHistoryItem({
      id: historyItemId,
      prompt: normalizedPrompt
        ? (normalizedNegativePrompt ? `${normalizedPrompt} | Negative: ${normalizedNegativePrompt}` : normalizedPrompt)
        : (normalizedNegativePrompt ? `(negative) ${normalizedNegativePrompt}` : '(workflow defaults)'),
      status: 'running',
      createdAt: new Date().toISOString(),
      imageSrc: null,
      error: null,
    })

    let ws = null

    try {
      const runGraph = JSON.parse(JSON.stringify(workflow))
      if (normalizedPrompt || normalizedNegativePrompt) {
        injectPromptValuesIntoWorkflow(runGraph, normalizedPrompt, normalizedNegativePrompt)
      }

      const baseUrl = apiUrl.replace(/\/prompt\/?$/, '')

      if (inputImageFile) {
        const body = new FormData()
        body.append('image', inputImageFile)
        const uploadRes = await fetch(`${baseUrl}/upload/image`, {
          method: 'POST',
          body,
        })
        if (!uploadRes.ok) {
          throw new Error(`Image upload failed: ${uploadRes.status}`)
        }
        const uploadData = await uploadRes.json()
        const uploadedName = uploadData.name || uploadData.filename
        if (!uploadedName) {
          throw new Error('Image upload failed: missing filename in response')
        }

        const updatedImageNodes = injectImageIntoWorkflow(runGraph, uploadedName)
        if (updatedImageNodes === 0) {
          throw new Error('Uploaded an image, but workflow has no compatible LoadImage nodes')
        }
      }

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
      let finalQueueRes = queueRes
      if (!finalQueueRes.ok && finalQueueRes.status === 400) {
        let queueErrorPayload = null
        try {
          queueErrorPayload = await finalQueueRes.json()
        } catch (_) {
          queueErrorPayload = null
        }

        const fallback = applyValidationFallback(runGraph, queueErrorPayload)
        if (fallback.applied) {
          setStatusMessage(`Retrying with available server model: ${fallback.replacementValue}`)
          finalQueueRes = await fetch(`${baseUrl}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: runGraph, client_id: clientId }),
          })
        } else {
          throw new Error(buildQueueErrorMessage(finalQueueRes.status, queueErrorPayload))
        }
      }
      if (!finalQueueRes.ok) {
        let queueErrorPayload = null
        try {
          queueErrorPayload = await finalQueueRes.json()
        } catch (_) {
          queueErrorPayload = null
        }
        throw new Error(buildQueueErrorMessage(finalQueueRes.status, queueErrorPayload))
      }

      const queueData = await finalQueueRes.json()
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
