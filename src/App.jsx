import React, { useState } from 'react'
import defaultWorkflow from '../01_get_started_text_to_image.json'

export default function App() {
  function normalizeApiUrl(url) {
    return url.trim().replace(/\/prompt\/?$/, '')
  }

  function loadStoredApiUrl() {
    const saved = localStorage.getItem('comfy_api_url')
    if (!saved) return ''
    return normalizeApiUrl(saved)
  }

  function loadStoredWorkflow() {
    const saved = localStorage.getItem('comfy_workflow')
    if (!saved) return null

    try {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    } catch (_) {
      // Fall back to default if local storage data is malformed.
    }

    localStorage.removeItem('comfy_workflow')
    localStorage.removeItem('comfy_workflow_name')
    return null
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

  const [promptText, setPromptText] = useState('')
  const [apiUrl, setApiUrl] = useState(() => loadStoredApiUrl())
  const [workflow, setWorkflow] = useState(() => {
    return loadStoredWorkflow()
  })
  const [workflowName, setWorkflowName] = useState(() => {
    return localStorage.getItem('comfy_workflow_name') || ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [imageSrc, setImageSrc] = useState(null)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [showSettings, setShowSettings] = useState(() => !loadStoredApiUrl() || !loadStoredWorkflow())
  const [settingsUrl, setSettingsUrl] = useState(apiUrl)
  const hasConfiguredApiUrl = apiUrl.length > 0
  const hasConfiguredWorkflow = workflow !== null
  const canCloseSettings = hasConfiguredApiUrl && hasConfiguredWorkflow

  function saveWorkflow(nextWorkflow, name) {
    setWorkflow(nextWorkflow)
    setWorkflowName(name)
    localStorage.setItem('comfy_workflow', JSON.stringify(nextWorkflow))
    localStorage.setItem('comfy_workflow_name', name)
    setError(null)
  }

  function handleWorkflowUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result)
        saveWorkflow(json, file.name)
      } catch (err) {
        setError(`Failed to parse JSON: ${err.message}`)
      }
    }
    reader.readAsText(file)

    // Clear input so same file can be selected again
    e.target.value = ''
  }

  function useSampleWorkflow() {
    saveWorkflow(defaultWorkflow, 'Sample (Lumina2 Text-to-Image)')
  }

  function openSettings() {
    setSettingsUrl(apiUrl)
    setShowSettings(true)
  }

  function handleSaveSettings() {
    const cleanUrl = normalizeApiUrl(settingsUrl)
    if (!cleanUrl) {
      setError('Please enter your ComfyUI API URL before continuing')
      return
    }
    if (!hasConfiguredWorkflow) {
      setError('Please upload a workflow JSON or use the sample workflow before continuing')
      return
    }

    setApiUrl(cleanUrl)
    setSettingsUrl(cleanUrl)
    localStorage.setItem('comfy_api_url', cleanUrl)
    setShowSettings(false)
    setError(null)
  }

  async function handleGenerate(e) {
    e?.preventDefault()
    if (!promptText.trim()) return
    if (!hasConfiguredApiUrl) {
      setError('Configure your ComfyUI API URL in Settings to generate images')
      openSettings()
      return
    }
    if (!hasConfiguredWorkflow) {
      setError('Configure a workflow JSON in Settings to generate images')
      openSettings()
      return
    }

    setIsLoading(true)
    setError(null)
    setImageSrc(null)
    setStatusMessage('Queuing job...')

    try {
      const runGraph = JSON.parse(JSON.stringify(workflow))
      const updatedPromptNodes = injectPromptIntoWorkflow(runGraph, promptText)
      if (updatedPromptNodes === 0) {
        throw new Error('No prompt text node found in workflow (expected a CLIPTextEncode-style node with an inputs.text field)')
      }

      const baseUrl = apiUrl.replace(/\/prompt\/?$/, '')

      const payload = { prompt: runGraph }
      const queueRes = await fetch(`${baseUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!queueRes.ok) {
        throw new Error(`Queue request failed: ${queueRes.status}`)
      }

      const queueData = await queueRes.json()
      const promptId = queueData.prompt_id

      if (!promptId) {
        throw new Error('No prompt_id in response')
      }

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
        setError('Image generation completed but no output found')
      } else {
        setImageSrc(imageUrl)
        setStatusMessage('')
        setPromptText('')
      }
    } catch (err) {
      setError(String(err))
      setStatusMessage('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-5xl font-bold mb-4">ComfyUI</h1>
          <p className="text-xl text-slate-600 mb-8">Generate images from text</p>
          
          {/* Workflow Info */}
          <div className="flex flex-col gap-3 items-center text-sm text-slate-600">
            <span className="px-3 py-1 bg-slate-100 rounded-full font-medium">
              {hasConfiguredWorkflow ? workflowName : 'No workflow configured'}
            </span>
            <div className="flex gap-2">
              <label className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium cursor-pointer hover:bg-blue-200 transition-colors">
                📁 Load Workflow
                <input
                  type="file"
                  accept=".json"
                  onChange={handleWorkflowUpload}
                  className="hidden"
                />
              </label>
              {hasConfiguredWorkflow && (
                <button
                  onClick={useSampleWorkflow}
                  className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full font-medium hover:bg-slate-300 transition-colors"
                >
                  Use Sample Workflow
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area - Centers based on image presence */}
        <div className={`w-full max-w-2xl flex flex-col ${imageSrc ? 'items-start' : 'items-center justify-center'}`}>
          {/* Image Preview Area - Only shown when image exists */}
          {imageSrc && (
            <div className="w-full mb-12 flex justify-center">
              {isLoading ? (
                <div className="w-full flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-600 font-medium">{statusMessage}</p>
                </div>
              ) : error ? (
                <div className="w-full flex items-center justify-center bg-red-50 rounded-lg border border-red-200 p-8">
                  <div className="text-center">
                    <p className="text-red-800 font-semibold mb-2">Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              ) : (
                <img 
                  src={imageSrc} 
                  alt="Generated" 
                  className="w-full rounded-lg shadow-lg"
                />
              )}
            </div>
          )}

          {/* Loading Spinner - Shown when loading and no image yet */}
          {isLoading && !imageSrc && (
            <div className="w-full flex flex-col items-center justify-center py-12 mb-12">
              <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium">{statusMessage}</p>
            </div>
          )}

          {/* Error Display - Shown when error and no image */}
          {error && !imageSrc && (
            <div className="w-full flex items-center justify-center bg-red-50 rounded-lg border border-red-200 p-8 mb-12">
              <div className="text-center">
                <p className="text-red-800 font-semibold mb-2">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Input Section */}
          <form onSubmit={handleGenerate} className="w-full">
            <div className="relative">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleGenerate(e)
                  }
                }}
                placeholder="What would you like to generate?"
                className="w-full px-6 py-4 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10 resize-none text-lg"
                rows="3"
                disabled={isLoading}
              />
              <div className="absolute right-4 bottom-4 flex gap-2">
                <button
                  type="button"
                  onClick={openSettings}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Settings"
                >
                  ⚙️
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !promptText.trim() || !hasConfiguredApiUrl || !hasConfiguredWorkflow}
                  className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8H3m18 0h-3" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-center text-sm text-slate-500 mt-3">
              Press <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">Enter</kbd> to send, <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">Shift+Enter</kbd> for new line
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Connected to: <span className="font-mono text-slate-700">{apiUrl}</span></p>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-2xl font-bold mb-2">Settings</h2>
            {!canCloseSettings && (
              <p className="text-sm text-slate-600 mb-6">
                Complete setup to continue: add your API URL and workflow JSON.
              </p>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  ComfyUI API URL
                </label>
                <input
                  type="text"
                  value={settingsUrl}
                  onChange={(e) => setSettingsUrl(e.target.value)}
                  placeholder="http://your-comfyui-host:8188"
                  className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10"
                />
                <p className="text-xs text-slate-500 mt-2">Enter the base URL without /prompt</p>
              </div>

              <div>
                <p className="block text-sm font-semibold text-slate-900 mb-2">Workflow JSON</p>
                <p className="text-xs text-slate-500 mb-3">
                  {hasConfiguredWorkflow ? `Selected: ${workflowName}` : 'No workflow selected yet'}
                </p>
                <div className="flex gap-2">
                  <label className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm text-center rounded-lg font-medium cursor-pointer hover:bg-blue-200 transition-colors">
                    Upload JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleWorkflowUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={useSampleWorkflow}
                    className="flex-1 px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 transition-colors"
                  >
                    Use Sample
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveSettings}
                className="flex-1 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                {canCloseSettings ? 'Save' : 'Save and Continue'}
              </button>
              {canCloseSettings && (
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 font-semibold rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
