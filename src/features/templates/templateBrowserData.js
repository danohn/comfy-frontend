export function getTemplateBrowserData({
  serverTemplates,
  templateSearch,
  selectedTemplateCategory,
  templateModelFilter,
  templateTagFilter,
  templateSort,
}) {
  const normalizedQuery = templateSearch.trim().toLowerCase()
  const sidebarCategories = (() => {
    const groups = new Map()
    for (const template of serverTemplates) {
      const groupName = template.categoryGroup || 'Templates'
      const categoryName = template.category || 'Templates'
      if (!groups.has(groupName)) groups.set(groupName, new Set())
      groups.get(groupName).add(categoryName)
    }
    return Array.from(groups.entries())
      .map(([groupName, set]) => ({
        groupName,
        categories: Array.from(set).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName))
  })()

  const availableTemplateModels = Array.from(
    new Set(
      serverTemplates.flatMap((template) =>
        Array.isArray(template.models) ? template.models : []
      )
    )
  ).sort((a, b) => a.localeCompare(b))

  const availableTemplateTags = Array.from(
    new Set(
      serverTemplates.flatMap((template) =>
        Array.isArray(template.tags) ? template.tags : []
      )
    )
  ).sort((a, b) => a.localeCompare(b))

  const filteredTemplates = (() => {
    let list = [...serverTemplates]

    if (selectedTemplateCategory !== 'all' && selectedTemplateCategory !== 'popular') {
      list = list.filter((template) => (template.category || 'Templates') === selectedTemplateCategory)
    }
    if (templateModelFilter) {
      list = list.filter((template) => (template.models || []).includes(templateModelFilter))
    }
    if (templateTagFilter) {
      list = list.filter((template) => (template.tags || []).includes(templateTagFilter))
    }
    if (normalizedQuery) {
      list = list.filter((template) => {
        const haystack = [
          template.title,
          template.label,
          template.description,
          ...(Array.isArray(template.tags) ? template.tags : []),
          ...(Array.isArray(template.models) ? template.models : []),
          template.mediaType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    }

    const effectiveSort = selectedTemplateCategory === 'popular' ? 'popular' : templateSort
    list.sort((a, b) => {
      if (effectiveSort === 'popular') {
        return (b.usage || 0) - (a.usage || 0)
      }
      if (effectiveSort === 'newest') {
        const aTime = a.date ? new Date(a.date).getTime() : 0
        const bTime = b.date ? new Date(b.date).getTime() : 0
        return bTime - aTime
      }
      if (effectiveSort === 'alphabetical') {
        return String(a.title || a.label || '').localeCompare(String(b.title || b.label || ''))
      }
      const usageDiff = (b.usage || 0) - (a.usage || 0)
      if (usageDiff !== 0) return usageDiff
      return String(a.title || a.label || '').localeCompare(String(b.title || b.label || ''))
    })

    return list
  })()

  return {
    sidebarCategories,
    availableTemplateModels,
    availableTemplateTags,
    filteredTemplates,
  }
}
