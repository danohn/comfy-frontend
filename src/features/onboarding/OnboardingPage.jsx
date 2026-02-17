import React from 'react'
import { normalizeBaseUrl } from '../../lib/apiUrl'

export default function OnboardingPage({
  settingsUrl,
  apiUrl,
  hasConfiguredApiUrl,
  onboardingStep,
  setOnboardingStep,
  apiHost,
  updateApiSettings,
  showAdvancedApi,
  setShowAdvancedApi,
  apiProtocol,
  apiPort,
  handleTestConnection,
  isTestingConnection,
  handleOnboardingSaveAndContinue,
  connectionStatus,
  hasConfiguredWorkflow,
  workflowName,
  handleWorkflowUpload,
  handleUseSampleWorkflow,
  runWorkflowHealthCheck,
  isCheckingWorkflowHealth,
  workflowHealth,
  onCopyModelUrl,
  renderTemplateBrowser,
  handleOnboardingFinish,
}) {
  const isApiDirty = normalizeBaseUrl(settingsUrl) !== normalizeBaseUrl(apiUrl)
  const canGoToWorkflowStep = hasConfiguredApiUrl

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Getting Started</h1>
            <p className="text-sm text-slate-600 mt-1">Step {onboardingStep} of 2</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnboardingStep(1)}
              disabled={onboardingStep === 1}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => setOnboardingStep(2)}
              disabled={!canGoToWorkflowStep || onboardingStep === 2}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {onboardingStep === 1 ? (
          <section className="space-y-4 bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold">Connect to ComfyUI</h2>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Host or IP</label>
                <input
                  type="text"
                  value={apiHost}
                  onChange={(e) => updateApiSettings({ host: e.target.value })}
                  placeholder="192.168.1.100 or comfy.local"
                  className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10"
                />
                <p className="text-xs text-slate-500">
                  Default connection uses <span className="font-mono">http</span> on port <span className="font-mono">8188</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAdvancedApi((current) => !current)}
                  className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  {showAdvancedApi ? 'Hide Advanced URL Options' : 'Show Advanced URL Options'}
                </button>
                {showAdvancedApi && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Protocol</label>
                        <select
                          value={apiProtocol}
                          onChange={(e) => updateApiSettings({ protocol: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-900"
                        >
                          <option value="http">http</option>
                          <option value="https">https</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Port</label>
                        <input
                          type="text"
                          value={apiPort}
                          onChange={(e) => updateApiSettings({ port: e.target.value.replace(/[^0-9]/g, '') })}
                          placeholder="8188"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Resolved URL: <span className="font-mono">{settingsUrl || 'not set'}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={handleOnboardingSaveAndContinue}
                  className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Save and Continue →
                </button>
              </div>
              {connectionStatus && (
                <p className={`text-xs ${connectionStatus.type === 'success' ? 'text-green-700' : connectionStatus.type === 'error' ? 'text-red-700' : 'text-slate-500'}`}>
                  {connectionStatus.message}
                </p>
              )}
              {isApiDirty && (
                <p className="text-xs text-slate-500">You have unsaved API changes.</p>
              )}
          </section>
        ) : (
          <section className="space-y-4 bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold">Choose Workflow</h2>
              <p className="text-sm text-slate-600">{hasConfiguredWorkflow ? `Selected: ${workflowName}` : 'No workflow selected yet'}</p>
              <div className="flex gap-2">
                <label className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm text-center rounded-lg font-medium cursor-pointer hover:bg-blue-200 transition-colors">
                  Upload JSON
                  <input type="file" accept=".json" onChange={handleWorkflowUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleUseSampleWorkflow}
                  className="flex-1 px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Use Sample
                </button>
              </div>
              <button
                type="button"
                onClick={() => runWorkflowHealthCheck()}
                disabled={isCheckingWorkflowHealth || !hasConfiguredWorkflow}
                className="px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50"
              >
                {isCheckingWorkflowHealth ? 'Checking prerequisites...' : 'Check Prerequisites'}
              </button>
              {workflowHealth && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Workflow Prerequisites</p>
                  <p className={`text-xs mt-1 ${workflowHealth.ok ? 'text-green-700' : 'text-amber-700'}`}>
                    {workflowHealth.message}
                  </p>
                  {workflowHealth.total > 0 && (
                    <p className={`text-xs mt-1 ${workflowHealth.missing.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                      {workflowHealth.missing.length === 0
                        ? `All ${workflowHealth.total} required models are available`
                        : `${workflowHealth.missing.length} missing of ${workflowHealth.total} required models`}
                    </p>
                  )}
                  {Array.isArray(workflowHealth.missing) && workflowHealth.missing.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {workflowHealth.missing.map((model) => (
                        <div key={`onboarding-health:${model.directory}:${model.name}:${model.url}`} className="rounded border border-slate-200 bg-white p-2">
                          <p className="text-xs text-slate-700 break-all">
                            {(model.directory || 'unknown')} / {model.name}
                          </p>
                          <div className="mt-1 flex gap-2">
                            {model.url ? (
                              <>
                                <a
                                  href={model.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 text-xs rounded-md bg-slate-900 text-white hover:bg-slate-800"
                                >
                                  Download
                                </a>
                                <button
                                  type="button"
                                  onClick={() => onCopyModelUrl(model.url)}
                                  className="px-2 py-1 text-xs rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300"
                                >
                                  Copy URL
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">No download URL provided</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {renderTemplateBrowser()}
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(1)}
                  className="px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleOnboardingFinish}
                  disabled={!hasConfiguredWorkflow}
                  className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Finish Setup
                </button>
              </div>
          </section>
        )}
      </div>
    </div>
  )
}
