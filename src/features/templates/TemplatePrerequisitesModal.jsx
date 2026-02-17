import React from 'react'

export default function TemplatePrerequisitesModal({
  selectedPrereqTemplate,
  selectedPrereqResult,
  onClosePrereq,
  onCopyModelUrl,
}) {
  if (!selectedPrereqTemplate) return null

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Prerequisites</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedPrereqTemplate.title || selectedPrereqTemplate.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClosePrereq}
            className="px-2 py-1 text-sm rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {!selectedPrereqResult || selectedPrereqResult.loading ? (
          <p className="mt-4 text-sm text-slate-600">Checking prerequisites...</p>
        ) : selectedPrereqResult.error ? (
          <p className="mt-4 text-sm text-red-700 break-words">{selectedPrereqResult.error}</p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className={`text-sm ${selectedPrereqResult.missing.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>
              {selectedPrereqResult.missing.length === 0
                ? `All ${selectedPrereqResult.total} required models are available`
                : `${selectedPrereqResult.missing.length} missing of ${selectedPrereqResult.total} required models`}
            </p>
            {selectedPrereqResult.missing.length > 0 && (
              <div className="space-y-2">
                {selectedPrereqResult.missing.map((model) => (
                  <div key={`modal:${model.directory}:${model.name}:${model.url}`} className="rounded border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-700 break-all">
                      {(model.directory || 'unknown')} / {model.name}
                    </p>
                    <div className="mt-2 flex gap-2">
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
      </div>
    </div>
  )
}
