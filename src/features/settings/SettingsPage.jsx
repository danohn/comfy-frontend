import React from 'react'
import { normalizeBaseUrl } from '../../lib/apiUrl'
import {
  flattenFeatureEntries,
  formatBytes,
  formatDeviceName,
  formatExtensionLabel,
  prettyFeatureLabel,
  prettyFeatureValue,
} from '../../lib/serverFormatting'

export default function SettingsPage({
  apiUrl,
  settingsUrl,
  canCloseSettings,
  apiHost,
  updateApiSettings,
  showAdvancedApi,
  setShowAdvancedApi,
  apiProtocol,
  apiPort,
  handleTestConnection,
  isTestingConnection,
  handleSaveSettings,
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
  fetchServerData,
  isLoadingServerData,
  serverDataError,
  serverSystemStats,
  serverExtensions,
  showExtensions,
  setShowExtensions,
  serverHistoryCount,
  serverFeatures,
  handleClearPendingQueue,
  handleInterruptExecution,
  handleClearServerHistory,
  handleFreeMemory,
  opsActionStatus,
  onBackToApp,
}) {
  const isApiDirty = normalizeBaseUrl(settingsUrl) !== normalizeBaseUrl(apiUrl)
  const canSaveSettings = isApiDirty

  const featureEntries = flattenFeatureEntries(serverFeatures)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-sm text-slate-600 mt-1">Configure your server, workflow, models, and operations.</p>
          </div>
          <button
            type="button"
            onClick={onBackToApp}
            className="px-4 py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200"
          >
            Back to App
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {!canCloseSettings && (
            <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Complete setup to continue: add your API URL and workflow JSON.
            </p>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">ComfyUI API</h2>
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
                onClick={handleSaveSettings}
                disabled={!canSaveSettings}
                className="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save API
              </button>
            </div>
            {connectionStatus && (
              <p className={`text-xs ${connectionStatus.type === 'success' ? 'text-green-700' : connectionStatus.type === 'error' ? 'text-red-700' : 'text-slate-500'}`}>
                {connectionStatus.message}
              </p>
            )}
            {canCloseSettings && isApiDirty && (
              <p className="text-xs text-slate-500">
                You have unsaved API changes.
              </p>
            )}
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-xl font-semibold">Workflow</h2>
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
                <p className="text-xs font-semibold text-slate-700">Workflow Health</p>
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
                      <div key={`health:${model.directory}:${model.name}:${model.url}`} className="rounded border border-slate-200 bg-white p-2">
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
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Server Dashboard</h2>
              <button
                type="button"
                onClick={fetchServerData}
                className="px-3 py-1.5 bg-slate-100 text-slate-800 text-xs rounded-md font-medium hover:bg-slate-200"
              >
                Refresh
              </button>
            </div>
            {isLoadingServerData ? (
              <p className="text-xs text-slate-500">Loading server data...</p>
            ) : serverDataError ? (
              <p className="text-xs text-red-700">{serverDataError}</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-600">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-medium text-slate-500">ComfyUI Version</p>
                    <p className="text-sm font-semibold text-slate-800 break-all">{serverSystemStats?.system?.comfyui_version || 'unknown'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-medium text-slate-500">GPU Devices</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {Array.isArray(serverSystemStats?.devices) ? serverSystemStats.devices.length : 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Extensions</p>
                        <p className="text-sm font-semibold text-slate-800">{serverExtensions.length}</p>
                      </div>
                      {serverExtensions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowExtensions((current) => !current)}
                          className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          {showExtensions ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-medium text-slate-500">Server History Items</p>
                    <p className="text-sm font-semibold text-slate-800">{serverHistoryCount ?? 'unknown'}</p>
                  </div>
                </div>
                {showExtensions && serverExtensions.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <ul className="space-y-1">
                      {serverExtensions.map((ext, idx) => (
                        <li key={`${formatExtensionLabel(ext, idx)}-${idx}`} className="text-xs text-slate-700 break-all">
                          {formatExtensionLabel(ext, idx)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(serverSystemStats?.devices) && serverSystemStats.devices.length > 0 && (
                  <div className="pt-1">
                    <p className="font-medium text-slate-700">Compute Devices</p>
                    <div className="mt-2 space-y-2">
                      {serverSystemStats.devices.map((device, idx) => (
                        <div key={`${device?.name || 'device'}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-sm font-semibold text-slate-800 break-all">{formatDeviceName(device?.name, idx)}</p>
                          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                            <p>Type: <span className="font-medium text-slate-700">{device?.type || 'unknown'}</span></p>
                            <p>Index: <span className="font-medium text-slate-700">{typeof device?.index === 'number' ? device.index : idx}</span></p>
                            <p>VRAM total: <span className="font-medium text-slate-700">{formatBytes(device?.vram_total)}</span></p>
                            <p>VRAM free: <span className="font-medium text-slate-700">{formatBytes(device?.vram_free)}</span></p>
                            <p>Torch VRAM total: <span className="font-medium text-slate-700">{formatBytes(device?.torch_vram_total)}</span></p>
                            <p>Torch VRAM free: <span className="font-medium text-slate-700">{formatBytes(device?.torch_vram_free)}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {featureEntries.length > 0 ? (
                  <div className="pt-1">
                    <p className="font-medium text-slate-700">Features</p>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {featureEntries.map(([key, rawValue]) => (
                        <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-medium text-slate-500">{prettyFeatureLabel(key)}</p>
                          <p className="text-sm font-semibold text-slate-800 break-all">
                            {prettyFeatureValue(rawValue, key)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>Features: none reported</p>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-3xl font-semibold text-slate-900">Danger Zone</h2>
            <div className="rounded-xl border border-red-200 overflow-hidden bg-white">
              <div className="p-5 flex items-start justify-between gap-6 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Clear Pending Queue</h3>
                  <p className="text-sm text-slate-700 mt-1">Remove all queued pending jobs that have not started yet.</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearPendingQueue}
                  className="shrink-0 px-5 py-2.5 border border-slate-300 rounded-xl text-red-700 text-sm font-semibold hover:bg-red-50"
                >
                  Clear pending
                </button>
              </div>

              <div className="p-5 flex items-start justify-between gap-6 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Interrupt Running Execution</h3>
                  <p className="text-sm text-slate-700 mt-1">Stop currently running generation jobs on the server.</p>
                </div>
                <button
                  type="button"
                  onClick={handleInterruptExecution}
                  className="shrink-0 px-5 py-2.5 border border-slate-300 rounded-xl text-red-700 text-sm font-semibold hover:bg-red-50"
                >
                  Interrupt execution
                </button>
              </div>

              <div className="p-5 flex items-start justify-between gap-6 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Clear Server History</h3>
                  <p className="text-sm text-slate-700 mt-1">Delete historical job records from the ComfyUI server.</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearServerHistory}
                  className="shrink-0 px-5 py-2.5 border border-slate-300 rounded-xl text-red-700 text-sm font-semibold hover:bg-red-50"
                >
                  Clear history
                </button>
              </div>

              <div className="p-5 flex items-start justify-between gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Free VRAM / Unload Models</h3>
                  <p className="text-sm text-slate-700 mt-1">Release runtime memory and unload models to recover from memory pressure.</p>
                </div>
                <button
                  type="button"
                  onClick={handleFreeMemory}
                  className="shrink-0 px-5 py-2.5 border border-slate-300 rounded-xl text-red-700 text-sm font-semibold hover:bg-red-50"
                >
                  Free memory
                </button>
              </div>
            </div>
            {opsActionStatus && (
              <p className={`text-xs ${opsActionStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
                {opsActionStatus.message}
              </p>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
