import React from 'react'

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
          <div className="w-full mb-4 p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full font-medium ${hasConfiguredApiUrl ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                API: {hasConfiguredApiUrl ? 'Configured' : 'Missing'}
              </span>
              <span className={`px-2 py-1 rounded-full font-medium ${hasConfiguredWorkflow ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                Workflow: {hasConfiguredWorkflow ? workflowName : 'Missing'}
              </span>
              {typeof queueState.running === 'number' && typeof queueState.pending === 'number' && (
                <span className="px-2 py-1 rounded-full font-medium bg-slate-200 text-slate-700">
                  Queue: {queueState.running} running, {queueState.pending} pending
                </span>
              )}
            </div>
            {!canCloseSettings && (
              <button
                type="button"
                onClick={openOnboardingPage}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
              >
                Complete Setup
              </button>
            )}
          </div>

          {promptInputMode === 'dual' && (
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Prompt</label>
          )}
          <div className="relative">
            <div className="absolute left-4 top-4 z-10">
              <label className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 text-xs rounded-md font-medium cursor-pointer hover:bg-slate-200 transition-colors">
                Add input image
                <input type="file" accept="image/*" onChange={handleInputImageChange} className="hidden" />
              </label>
            </div>
            {inputImageName && (
              <div className="absolute left-4 top-12 z-10 flex items-center gap-2 text-xs">
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
              </div>
            )}
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleGenerate(e)
                }
              }}
              placeholder={promptInputMode === 'dual' ? 'Positive prompt' : 'What would you like to generate?'}
              className={`w-full px-6 py-4 pt-20 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10 resize-none ${promptInputMode === 'dual' ? 'text-sm' : 'text-lg'}`}
              rows="3"
              disabled={isLoading}
            />
            <div className="absolute right-4 bottom-4 flex gap-2">
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
          </div>
          {promptInputMode === 'dual' && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Negative Prompt</label>
              <textarea
                value={negativePromptText}
                onChange={(e) => setNegativePromptText(e.target.value)}
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
          <p className="text-center text-sm text-slate-500 mt-3">
            Press <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">Enter</kbd> to send, <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">Shift+Enter</kbd> for new line
          </p>
        </form>
      </div>

      <div className="mt-12 text-center text-sm text-slate-500">
        <p>Connected to: <span className="font-mono text-slate-700">{apiUrl || 'Not configured'}</span></p>
      </div>
    </>
  )
}
