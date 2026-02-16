import React, { useEffect, useState } from 'react'
import defaultWorkflow from '../01_get_started_text_to_image.json'
import useApiConfig from './hooks/useApiConfig'
import useWorkflowConfig from './hooks/useWorkflowConfig'
import useGeneration from './hooks/useGeneration'

export default function App() {
  const [promptText, setPromptText] = useState('')
  const {
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
  } = useApiConfig()
  const {
    workflow,
    workflowName,
    hasConfiguredWorkflow,
    uploadWorkflowFile,
    useSampleWorkflow,
  } = useWorkflowConfig(defaultWorkflow)
  const {
    isLoading,
    imageSrc,
    error,
    statusMessage,
    setError,
    generate,
  } = useGeneration()

  const canCloseSettings = hasConfiguredApiUrl && hasConfiguredWorkflow

  useEffect(() => {
    if (!hasConfiguredApiUrl || !hasConfiguredWorkflow) {
      setShowSettings(true)
    }
  }, [hasConfiguredApiUrl, hasConfiguredWorkflow, setShowSettings])

  async function handleWorkflowUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await uploadWorkflowFile(file)
      setError(null)
    } catch (err) {
      setError(`Failed to parse JSON: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  function handleUseSampleWorkflow() {
    useSampleWorkflow()
    setError(null)
  }

  function handleSaveSettings() {
    const saveResult = saveApiUrl(settingsUrl)
    if (!saveResult.ok) {
      setError(saveResult.error)
      return
    }
    if (!hasConfiguredWorkflow) {
      setError('Please upload a workflow JSON or use the sample workflow before continuing')
      return
    }
    closeSettings()
    setError(null)
  }

  async function handleTestConnection() {
    const result = await testConnection(settingsUrl)
    if (result.ok) {
      setError(null)
    }
  }

  async function handleGenerate(e) {
    e?.preventDefault()
    await generate({
      promptText,
      apiUrl,
      workflow,
      openSettings,
      onSuccess: () => setPromptText(''),
    })
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-5xl font-bold mb-4">ComfyUI</h1>
          <p className="text-xl text-slate-600 mb-8">Generate images from text</p>

          <div className="flex flex-col gap-3 items-center text-sm text-slate-600">
            <span className="px-3 py-1 bg-slate-100 rounded-full font-medium">
              {hasConfiguredWorkflow ? workflowName : 'No workflow configured'}
            </span>
            <div className="flex gap-2">
              <label className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium cursor-pointer hover:bg-blue-200 transition-colors">
                Upload Workflow JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleWorkflowUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleUseSampleWorkflow}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full font-medium hover:bg-slate-300 transition-colors"
              >
                Use Sample Workflow
              </button>
            </div>
          </div>
        </div>

        <div className={`w-full max-w-2xl flex flex-col ${imageSrc ? 'items-start' : 'items-center justify-center'}`}>
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

          {isLoading && !imageSrc && (
            <div className="w-full flex flex-col items-center justify-center py-12 mb-12">
              <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium">{statusMessage}</p>
            </div>
          )}

          {error && !imageSrc && (
            <div className="w-full flex items-center justify-center bg-red-50 rounded-lg border border-red-200 p-8 mb-12">
              <div className="text-center">
                <p className="text-red-800 font-semibold mb-2">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

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

        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Connected to: <span className="font-mono text-slate-700">{apiUrl || 'Not configured'}</span></p>
        </div>
      </div>

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
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
                  >
                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                  {connectionStatus && (
                    <p className={`text-xs mt-2 ${connectionStatus.type === 'success' ? 'text-green-700' : connectionStatus.type === 'error' ? 'text-red-700' : 'text-slate-500'}`}>
                      {connectionStatus.message}
                    </p>
                  )}
                </div>
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
                    type="button"
                    onClick={handleUseSampleWorkflow}
                    className="flex-1 px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 transition-colors"
                  >
                    Use Sample
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-1 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                {canCloseSettings ? 'Save' : 'Save and Continue'}
              </button>
              {canCloseSettings && (
                <button
                  type="button"
                  onClick={closeSettings}
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
