import { useState } from 'react'

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

  async function generate({ promptText, apiUrl, workflow, openSettings, onSuccess }) {
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
    setStatusMessage('Queuing job...')

    const historyItemId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    addHistoryItem({
      id: historyItemId,
      prompt: promptText.trim(),
      status: 'running',
      createdAt: new Date().toISOString(),
      imageSrc: null,
      error: null,
    })

    try {
      const runGraph = JSON.parse(JSON.stringify(workflow))
      const updatedPromptNodes = injectPromptIntoWorkflow(runGraph, promptText)
      if (updatedPromptNodes === 0) {
        throw new Error('No prompt text node found in workflow (expected a CLIPTextEncode-style node with an inputs.text field)')
      }

      const baseUrl = apiUrl.replace(/\/prompt\/?$/, '')

      const queueRes = await fetch(`${baseUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: runGraph }),
      })

      if (!queueRes.ok) {
        throw new Error(`Queue request failed: ${queueRes.status}`)
      }

      const queueData = await queueRes.json()
      const promptId = queueData.prompt_id

      if (!promptId) {
        throw new Error('No prompt_id in response')
      }
      patchHistoryItem(historyItemId, { promptId })

      setStatusMessage('Generating...')

      let result = null
      let attempts = 0
      const maxAttempts = 120

      while (!result && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++

        try {
          const historyRes = await fetch(`${baseUrl}/history/${promptId}`)
          if (!historyRes.ok) {
            setStatusMessage(`Generating... ${attempts}s (retrying after ${historyRes.status})`)
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
        } catch (_) {
          setStatusMessage(`Generating... ${attempts}s (network retry)`)
          continue
        }

        setStatusMessage(`Generating... ${attempts}s`)
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
        setStatusMessage('')
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
        status: 'failed',
        error: message,
        finishedAt: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    imageSrc,
    error,
    statusMessage,
    jobHistory,
    setError,
    clearHistory,
    showHistoryImage,
    generate,
  }
}
