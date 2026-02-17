import React from 'react'

export default function HomePage({
  openSettingsPage,
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
  fetchRecentHistory,
  isLoadingRecentJobs,
  recentJobsError,
  serverRecentJobs,
  selectedJobId,
  setSelectedJobId,
  setJobDetail,
  setJobDetailError,
  fetchJobDetail,
  showHistoryImage,
  isLoadingJobDetail,
  jobDetailError,
  jobDetail,
  showWelcome,
  handleStartOnboarding,
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        <div className="w-full max-w-5xl flex justify-end mb-6">
          <button
            type="button"
            onClick={openSettingsPage}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Open settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.094c.55 0 1.02.398 1.11.94l.11.664c.067.403.353.734.74.868.34.118.67.257.987.418.36.183.79.154 1.11-.08l.525-.383a1.125 1.125 0 011.42.129l.774.774c.39.39.438 1.005.128 1.42l-.383.525a1.125 1.125 0 00-.08 1.11c.162.317.301.646.419.987.134.386.465.673.867.74l.664.11c.543.09.94.56.94 1.11v1.094c0 .55-.397 1.02-.94 1.11l-.664.11a1.125 1.125 0 00-.867.74c-.118.34-.257.67-.418.987-.183.36-.153.79.08 1.11l.382.525c.31.415.263 1.03-.128 1.42l-.774.774a1.125 1.125 0 01-1.42.128l-.525-.382a1.125 1.125 0 00-1.11-.08c-.317.161-.646.3-.987.418a1.125 1.125 0 00-.74.867l-.11.664a1.125 1.125 0 01-1.11.94h-1.094a1.125 1.125 0 01-1.11-.94l-.11-.664a1.125 1.125 0 00-.74-.867 8.049 8.049 0 01-.987-.419 1.125 1.125 0 00-1.11.08l-.525.383a1.125 1.125 0 01-1.42-.129l-.774-.774a1.125 1.125 0 01-.128-1.42l.383-.525a1.125 1.125 0 00.08-1.11 8.028 8.028 0 01-.419-.987 1.125 1.125 0 00-.868-.74l-.663-.11a1.125 1.125 0 01-.94-1.11v-1.094c0-.55.397-1.02.94-1.11l.664-.11c.402-.067.734-.354.867-.74.118-.341.257-.67.419-.987.183-.36.153-.79-.08-1.11l-.383-.525a1.125 1.125 0 01.128-1.42l.774-.774a1.125 1.125 0 011.42-.128l.525.382c.32.234.75.263 1.11.08.317-.161.646-.3.987-.418.386-.134.673-.465.74-.867l.11-.664z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>

        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-5xl font-bold mb-4">ComfyUI</h1>
          <p className="text-xl text-slate-600 mb-8">Generate images from text</p>
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

        <div className="w-full max-w-2xl mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-900">Recent Jobs</h3>
            <button
              type="button"
              onClick={fetchRecentHistory}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Refresh
            </button>
          </div>

          {isLoadingRecentJobs ? (
            <div className="border border-slate-200 rounded-lg p-4 text-sm text-slate-500 bg-slate-50">
              Loading server history...
            </div>
          ) : recentJobsError ? (
            <div className="border border-red-200 rounded-lg p-4 text-sm text-red-700 bg-red-50">
              {recentJobsError}
            </div>
          ) : serverRecentJobs.length === 0 ? (
            <div className="border border-slate-200 rounded-lg p-4 text-sm text-slate-500 bg-slate-50">
              No server history yet.
            </div>
          ) : (
            <div className="space-y-2">
              {serverRecentJobs.map((job) => (
                <div key={job.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 break-words">{job.title || `Job ${String(job.id).slice(0, 8)}`}</p>
                      <p className="text-xs text-slate-500 mt-0.5 break-words">{job.prompt || 'Prompt unavailable'}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(job.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedJobId === job.id) {
                            setSelectedJobId(null)
                            setJobDetail(null)
                            setJobDetailError(null)
                            return
                          }
                          fetchJobDetail(job.id)
                        }}
                        className={`px-2 py-1 text-xs rounded-md border ${selectedJobId === job.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                      >
                        {selectedJobId === job.id ? 'Hide' : 'Details'}
                      </button>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          job.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : job.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : job.status === 'cancelled' || job.status === 'interrupted'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {job.status}
                      </span>
                      {job.imageSrc ? (
                        <button
                          type="button"
                          onClick={() => showHistoryImage(job.imageSrc)}
                          className="shrink-0 rounded-md overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors"
                          title="Open image preview"
                        >
                          <img src={job.imageSrc} alt="Generated thumbnail" className="w-12 h-12 object-cover" />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-slate-100 border border-slate-200" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(selectedJobId || isLoadingJobDetail || jobDetailError || jobDetail) && (
            <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-900">Job Detail</h4>
                <div className="flex items-center gap-2">
                  {selectedJobId && (
                    <span className="text-xs text-slate-500 font-mono">{selectedJobId}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJobId(null)
                      setJobDetail(null)
                      setJobDetailError(null)
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    Close
                  </button>
                </div>
              </div>
              {isLoadingJobDetail ? (
                <p className="text-sm text-slate-500">Loading job details...</p>
              ) : jobDetailError ? (
                <p className="text-sm text-red-700">{jobDetailError}</p>
              ) : jobDetail ? (
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Status: <span className="font-medium">{jobDetail.status}</span></p>
                  {jobDetail.workflowId && <p>Workflow ID: <span className="font-mono">{jobDetail.workflowId}</span></p>}
                  {typeof jobDetail.outputsCount === 'number' && <p>Output count: {jobDetail.outputsCount}</p>}
                  {typeof jobDetail.createTime === 'number' && (
                    <p>Created: {new Date(jobDetail.createTime * 1000).toLocaleString()}</p>
                  )}
                  {typeof jobDetail.updateTime === 'number' && (
                    <p>Updated: {new Date(jobDetail.updateTime * 1000).toLocaleString()}</p>
                  )}
                  {jobDetail.executionError && (
                    <div className="p-2 border border-red-200 bg-red-50 rounded text-red-800">
                      <p className="font-semibold mb-1">Execution Error</p>
                      <p className="text-xs">{jobDetail.executionError.exception_message || 'Unknown execution error'}</p>
                    </div>
                  )}
                  <details>
                    <summary className="cursor-pointer text-xs text-slate-600">Raw payload</summary>
                    <pre className="mt-2 p-2 bg-white border border-slate-200 rounded text-xs overflow-auto max-h-56">
                      {JSON.stringify(jobDetail.raw, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showWelcome && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 border border-slate-200">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome to ComfyUI Frontend</h2>
            <p className="text-slate-600 mb-6">
              This app needs two things before you can generate images: your ComfyUI API URL and a workflow JSON file.
            </p>
            <div className="space-y-2 text-sm text-slate-700 mb-8">
              <p>1. Add your ComfyUI server URL</p>
              <p>2. Upload your workflow JSON or use the sample workflow</p>
            </div>
            <button
              type="button"
              onClick={handleStartOnboarding}
              className="w-full px-4 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
