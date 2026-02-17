import React, { useState } from 'react'

export default function GenerationPanel({
  imageSrc,
  isLoading,
  statusMessage,
  error,
  handleGenerate,
  hasConfiguredApiUrl,
  hasConfiguredWorkflow,
  workflowName,
  queueState,
  canCloseSettings,
  openOnboardingPage,
  promptInputMode,
  supportsInputImage,
  handleInputImageChange,
  inputImageName,
  clearInputImage,
  promptText,
  setPromptText,
  handleCancelRun,
  currentPromptId,
  negativePromptText,
  setNegativePromptText,
  apiUrl,
}) {
  const [showStatusDetails, setShowStatusDetails] = useState(false)
  const [isPromptFieldFocused, setIsPromptFieldFocused] = useState(false)
  const hasQueueSnapshot = typeof queueState.running === 'number' && typeof queueState.pending === 'number'
  const isServerReachable = hasConfiguredApiUrl && hasQueueSnapshot && !queueState?.error
  const reachabilityState = !hasConfiguredApiUrl
    ? 'not-configured'
    : isServerReachable
      ? 'online'
      : hasQueueSnapshot || queueState?.error
        ? 'offline'
        : 'unknown'
  const isReady = hasConfiguredWorkflow && isServerReachable
  const statusLabel = isReady ? 'Ready' : 'Action Required'
  const statusDotClass = isReady ? 'bg-green-500' : 'bg-red-500'

  return (
    <>
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
              <img src={imageSrc} alt="Generated" className="w-full rounded-lg shadow-lg" />
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
          <div className="w-full mb-3">
            <button
              type="button"
              onClick={() => setShowStatusDetails((current) => !current)}
              className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusDotClass}`} aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-800">
                    Status: {statusLabel}
                  </p>
                </div>
                <p className="text-xs text-slate-500">{showStatusDetails ? 'Hide details' : 'Show details'}</p>
              </div>
            </button>
            {showStatusDetails && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-1">
                <p>
                  Connection: <span className={`font-medium ${hasConfiguredApiUrl ? 'text-green-700' : 'text-red-700'}`}>{hasConfiguredApiUrl ? 'Saved' : 'Missing'}</span>
                </p>
                <p>
                  Server reachability:{' '}
                  <span className={`font-medium ${
                    reachabilityState === 'online'
                      ? 'text-green-700'
                      : reachabilityState === 'offline'
                        ? 'text-red-700'
                        : 'text-slate-700'
                  }`}>
                    {reachabilityState === 'online'
                      ? 'Online'
                      : reachabilityState === 'offline'
                        ? 'Offline'
                      : reachabilityState === 'not-configured'
                          ? 'Not configured'
                          : 'Unknown'}
                  </span>
                  {hasConfiguredApiUrl && (
                    <>
                      {' '}· <span className="font-mono text-slate-700 break-all">{apiUrl}</span>
                    </>
                  )}
                </p>
                <p>
                  Workflow: <span className={`font-medium ${hasConfiguredWorkflow ? 'text-green-700' : 'text-red-700'}`}>{hasConfiguredWorkflow ? (workflowName || 'Configured') : 'Missing'}</span>
                </p>
                <p>
                  Queue: <span className="font-medium text-slate-700">{typeof queueState.running === 'number' ? queueState.running : '?'} running, {typeof queueState.pending === 'number' ? queueState.pending : '?'} pending</span>
                </p>
                {queueState?.error && (
                  <p>
                    Queue health: <span className="font-medium text-red-700">{queueState.error}</span>
                  </p>
                )}
              </div>
            )}
          </div>
          {!canCloseSettings && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={openOnboardingPage}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
              >
                Complete Setup
              </button>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            {supportsInputImage && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <label className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md font-medium cursor-pointer hover:bg-slate-200 transition-colors">
                  Add input image
                  <input type="file" accept="image/*" onChange={handleInputImageChange} className="hidden" />
                </label>
                {inputImageName && (
                  <>
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 max-w-60 truncate" title={inputImageName}>
                      {inputImageName}
                    </span>
                    <button
                      type="button"
                      onClick={clearInputImage}
                      className="px-2 py-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            )}
            {promptInputMode === 'dual' && (
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Prompt</label>
            )}
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onFocus={() => setIsPromptFieldFocused(true)}
              onBlur={() => setIsPromptFieldFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleGenerate(e)
                }
              }}
              placeholder={promptInputMode === 'dual' ? 'Positive prompt' : 'What would you like to generate?'}
              className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10 resize-none text-sm"
              rows="2"
              disabled={isLoading}
            />
            {promptInputMode === 'dual' && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Negative Prompt</label>
                <textarea
                  value={negativePromptText}
                  onChange={(e) => setNegativePromptText(e.target.value)}
                  onFocus={() => setIsPromptFieldFocused(true)}
                  onBlur={() => setIsPromptFieldFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleGenerate(e)
                    }
                  }}
                  placeholder="Negative prompt"
                  className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10 resize-none text-sm"
                  rows="2"
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              {isLoading && (
                <button
                  type="button"
                  onClick={handleCancelRun}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                  title={currentPromptId ? `Cancel ${currentPromptId}` : 'Cancel current run'}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !hasConfiguredApiUrl || !hasConfiguredWorkflow}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                title={isLoading ? 'Generating...' : 'Generate image'}
                aria-label={isLoading ? 'Generating image' : 'Generate image'}
              >
                <span>{isLoading ? 'Generating' : 'Generate'}</span>
              </button>
            </div>
            {isPromptFieldFocused && (
              <p className="hidden md:block text-right text-xs text-slate-500 mt-2">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-mono">Shift+Enter</kbd> for new line
              </p>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
