import React from 'react'

export default function TemplateDetailsModal({ selectedTemplateDetails, onCloseDetails }) {
  if (!selectedTemplateDetails) return null

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              {selectedTemplateDetails.title || selectedTemplateDetails.label}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedTemplateDetails.categoryGroup || 'Templates'} / {selectedTemplateDetails.category || 'General'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseDetails}
            className="px-2 py-1 text-sm rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {selectedTemplateDetails.thumbnailUrl && (
          <img
            src={selectedTemplateDetails.thumbnailUrl}
            alt={selectedTemplateDetails.title || selectedTemplateDetails.label}
            className="mt-4 w-full h-48 object-cover rounded-lg border border-slate-200 bg-slate-100"
          />
        )}

        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
            <p className="mt-1 whitespace-pre-wrap break-words">
              {selectedTemplateDetails.description || 'No description provided'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Generation Type</p>
              <p className="mt-1">{selectedTemplateDetails.category || selectedTemplateDetails.mediaType || 'unknown'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Input Type</p>
              <p className="mt-1">
                {Array.isArray(selectedTemplateDetails?.io?.inputs) && selectedTemplateDetails.io.inputs.length > 0
                  ? Array.from(new Set(selectedTemplateDetails.io.inputs.map((entry) => entry?.mediaType).filter(Boolean))).join(', ')
                  : (selectedTemplateDetails.mediaType || 'unknown')}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Output Type</p>
              <p className="mt-1">
                {Array.isArray(selectedTemplateDetails?.io?.outputs) && selectedTemplateDetails.io.outputs.length > 0
                  ? Array.from(new Set(selectedTemplateDetails.io.outputs.map((entry) => entry?.mediaType).filter(Boolean))).join(', ')
                  : 'unknown'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</p>
              <p className="mt-1">{selectedTemplateDetails.source || 'unknown'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</p>
              <p className="mt-1">{selectedTemplateDetails.date || 'unknown'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usage</p>
              <p className="mt-1">{typeof selectedTemplateDetails.usage === 'number' ? selectedTemplateDetails.usage : 'unknown'}</p>
            </div>
          </div>

          {Array.isArray(selectedTemplateDetails.models) && selectedTemplateDetails.models.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Models</p>
              <p className="mt-1 break-words">{selectedTemplateDetails.models.join(', ')}</p>
            </div>
          )}

          {Array.isArray(selectedTemplateDetails.tags) && selectedTemplateDetails.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tags</p>
              <p className="mt-1 break-words">{selectedTemplateDetails.tags.join(', ')}</p>
            </div>
          )}

          {Array.isArray(selectedTemplateDetails.requiresCustomNodes) && selectedTemplateDetails.requiresCustomNodes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Required Custom Nodes</p>
              <p className="mt-1 break-words">{selectedTemplateDetails.requiresCustomNodes.join(', ')}</p>
            </div>
          )}

          {selectedTemplateDetails.tutorialUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tutorial URL</p>
              <a
                href={selectedTemplateDetails.tutorialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-slate-900 underline break-all"
              >
                {selectedTemplateDetails.tutorialUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
