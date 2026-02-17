import React from 'react'

export default function TemplateBrowser({
  serverTemplates,
  templateSource,
  selectedTemplateCategory,
  templateSort,
  templateSearch,
  templateModelFilter,
  templateTagFilter,
  sidebarCategories,
  availableTemplateModels,
  availableTemplateTags,
  filteredTemplates,
  modelCheckByTemplate,
  isLoadingModelInventory,
  applyingTemplateId,
  onSelectCategory,
  onSearchChange,
  onClearFilters,
  onModelFilterChange,
  onTagFilterChange,
  onSortChange,
  onOpenDetails,
  onCheckPrerequisites,
  onApplyTemplate,
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">Server Templates</label>
      <p className="text-xs text-slate-500 mt-1">
        {serverTemplates.length > 0
          ? templateSource === 'local-index'
            ? `${serverTemplates.length} templates available from /templates/index.json`
            : templateSource === 'remote'
            ? `${serverTemplates.length} templates available from remote index`
            : `${serverTemplates.length} templates available from server`
          : 'No templates available from server or remote index'}
      </p>
      <div className="mt-3 border border-slate-200 rounded-xl bg-white overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] min-h-[520px]">
          <aside className="border-r border-slate-200 p-3 bg-slate-50">
            <p className="text-sm font-semibold text-slate-900 mb-2">Templates</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedTemplateCategory === 'all'
                    ? 'bg-slate-200 text-slate-900 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Templates
              </button>
              <button
                type="button"
                onClick={() => onSelectCategory('popular')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedTemplateCategory === 'popular'
                    ? 'bg-slate-200 text-slate-900 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Popular
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {sidebarCategories.map((group) => (
                <div key={group.groupName}>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    {group.groupName}
                  </p>
                  <div className="space-y-1">
                    {group.categories.map((categoryName) => (
                      <button
                        key={`${group.groupName}:${categoryName}`}
                        type="button"
                        onClick={() => onSelectCategory(categoryName)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                          selectedTemplateCategory === categoryName
                            ? 'bg-slate-200 text-slate-900 font-medium'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {categoryName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search templates"
                className="min-w-[240px] flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-900"
              />
              <button
                type="button"
                onClick={onClearFilters}
                className="px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200"
              >
                Clear Filters
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select
                value={templateModelFilter}
                onChange={(e) => onModelFilterChange(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-900"
              >
                <option value="">Model Filter</option>
                {availableTemplateModels.map((model) => (
                  <option key={`model:${model}`} value={model}>{model}</option>
                ))}
              </select>
              <select
                value={templateTagFilter}
                onChange={(e) => onTagFilterChange(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-900"
              >
                <option value="">Tasks</option>
                {availableTemplateTags.map((tag) => (
                  <option key={`tag:${tag}`} value={tag}>{tag}</option>
                ))}
              </select>
              <div className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-slate-50">
                Runs On: ComfyUI
              </div>
              <select
                value={selectedTemplateCategory === 'popular' ? 'popular' : templateSort}
                onChange={(e) => onSortChange(e.target.value)}
                disabled={selectedTemplateCategory === 'popular'}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-900 disabled:opacity-50"
              >
                <option value="default">Default</option>
                <option value="popular">Popular</option>
                <option value="newest">Newest</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Showing {filteredTemplates.length} of {serverTemplates.length} templates
            </p>
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[32rem] overflow-y-auto pr-1">
                {filteredTemplates.map((template) => (
                  <article key={template.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col">
                    {template.thumbnailUrl ? (
                      <img
                        src={template.thumbnailUrl}
                        alt={template.title || template.label}
                        className="w-full h-32 object-cover bg-slate-100"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-32 bg-slate-100 border-b border-slate-200" />
                    )}
                    <div className="p-3 flex flex-col flex-1">
                      <button
                        type="button"
                        onClick={() => onOpenDetails(template)}
                        className="w-full text-left text-sm font-semibold text-slate-900 line-clamp-2 hover:underline"
                      >
                        {template.title || template.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDetails(template)}
                        className="w-full text-left text-xs text-slate-500 mt-1 line-clamp-1 hover:text-slate-700 hover:underline"
                      >
                        {template.description || 'No description provided'}
                      </button>
                      <p className="mt-2 text-[11px] text-slate-600">
                        {(template.category || template.mediaType || 'unknown')} · In:{' '}
                        {Array.isArray(template?.io?.inputs) && template.io.inputs.length > 0
                          ? Array.from(new Set(template.io.inputs.map((entry) => entry?.mediaType).filter(Boolean))).join(', ')
                          : (template.mediaType || 'unknown')}
                        {' '}· Out:{' '}
                        {Array.isArray(template?.io?.outputs) && template.io.outputs.length > 0
                          ? Array.from(new Set(template.io.outputs.map((entry) => entry?.mediaType).filter(Boolean))).join(', ')
                          : 'unknown'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                        {Array.isArray(template.tags) && template.tags.length > 0 ? (
                          <>
                            {template.tags.slice(0, 2).map((tag) => (
                              <span key={`${template.id}:tag:${tag}`} className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                                {tag}
                              </span>
                            ))}
                            {template.tags.length > 2 && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                                +{template.tags.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500">No tags</span>
                        )}
                      </div>
                      <div className="mt-auto pt-3">
                        <button
                          type="button"
                          onClick={() => onOpenDetails(template)}
                          className="w-full text-center text-[11px] text-slate-600 hover:text-slate-900 underline decoration-dotted"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onCheckPrerequisites(template.id)}
                          disabled={modelCheckByTemplate[template.id]?.loading || isLoadingModelInventory}
                          className="mt-2 w-full px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 disabled:opacity-60"
                        >
                          {modelCheckByTemplate[template.id]?.loading
                            ? 'Checking prerequisites...'
                            : isLoadingModelInventory
                              ? 'Loading model inventory...'
                              : 'Check Prerequisites'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onApplyTemplate(template.id)}
                          disabled={applyingTemplateId === template.id}
                          className="mt-2 w-full px-3 py-2 bg-slate-900 text-white text-sm rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60"
                        >
                          {applyingTemplateId === template.id ? 'Applying...' : 'Apply Template'}
                        </button>
                        {modelCheckByTemplate[template.id]?.error && (
                          <p className="mt-2 text-xs text-red-700 break-words">{modelCheckByTemplate[template.id].error}</p>
                        )}
                        {modelCheckByTemplate[template.id] && !modelCheckByTemplate[template.id]?.loading && !modelCheckByTemplate[template.id]?.error && (
                          <p className={`mt-2 text-xs ${modelCheckByTemplate[template.id].missing.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                            {modelCheckByTemplate[template.id].missing.length === 0
                              ? 'All required models available'
                              : `${modelCheckByTemplate[template.id].missing.length} missing of ${modelCheckByTemplate[template.id].total} required`}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {serverTemplates.length > 0 ? 'No templates match your filters.' : 'No templates loaded yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
