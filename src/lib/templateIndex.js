const DEFAULT_EXCLUDED_TEMPLATE_TAGS = new Set(['api'])

export function extractWorkflowTemplates(raw) {
  if (!raw || typeof raw !== 'object') return []

  const templates = []
  const pushTemplate = (id, label, workflowData, extra = {}) => {
    if (workflowData && typeof workflowData === 'object') {
      templates.push({
        id,
        label,
        title: extra.title || label,
        description: extra.description || '',
        mediaType: extra.mediaType || 'unknown',
        tags: Array.isArray(extra.tags) ? extra.tags : [],
        models: Array.isArray(extra.models) ? extra.models : [],
        openSource: extra.openSource,
        usage: typeof extra.usage === 'number' ? extra.usage : 0,
        date: typeof extra.date === 'string' ? extra.date : '',
        io: extra.io && typeof extra.io === 'object' ? extra.io : null,
        tutorialUrl: typeof extra.tutorialUrl === 'string' ? extra.tutorialUrl : '',
        requiresCustomNodes: Array.isArray(extra.requiresCustomNodes) ? extra.requiresCustomNodes : [],
        includeOnDistributions: Array.isArray(extra.includeOnDistributions) ? extra.includeOnDistributions : [],
        searchRank: typeof extra.searchRank === 'number' ? extra.searchRank : undefined,
        size: typeof extra.size === 'number' ? extra.size : undefined,
        vram: typeof extra.vram === 'number' ? extra.vram : undefined,
        status: typeof extra.status === 'string' ? extra.status : '',
        category: extra.category || 'Templates',
        categoryGroup: extra.categoryGroup || 'Templates',
        isEssential: Boolean(extra.isEssential),
        thumbnailUrl: extra.thumbnailUrl || null,
        workflowUrl: null,
        workflow: workflowData,
        source: 'server',
      })
    }
  }

  for (const [groupKey, groupValue] of Object.entries(raw)) {
    if (Array.isArray(groupValue)) {
      for (let i = 0; i < groupValue.length; i++) {
        const item = groupValue[i]
        if (!item || typeof item !== 'object') continue
        const workflowData = item.workflow || item.prompt || item.data?.workflow || item.data?.prompt
        const label = item.name || item.title || `${groupKey} template ${i + 1}`
        pushTemplate(`${groupKey}:${label}:${i}`, `${groupKey}: ${label}`, workflowData, {
          title: item.title || label,
          description: item.description || '',
          mediaType: item.mediaType || item.type || 'unknown',
          tags: item.tags,
          models: item.models,
          openSource: item.openSource,
          usage: item.usage,
          date: item.date,
          io: item.io,
          tutorialUrl: item.tutorialUrl,
          requiresCustomNodes: item.requiresCustomNodes,
          includeOnDistributions: item.includeOnDistributions,
          searchRank: item.searchRank,
          size: item.size,
          vram: item.vram,
          status: item.status,
          category: groupKey,
          categoryGroup: 'Custom',
        })
      }
    } else if (groupValue && typeof groupValue === 'object') {
      for (const [templateKey, templateValue] of Object.entries(groupValue)) {
        if (!templateValue || typeof templateValue !== 'object') continue
        const workflowData = templateValue.workflow || templateValue.prompt || templateValue.data?.workflow || templateValue.data?.prompt
        const label = templateValue.name || templateValue.title || templateKey
        pushTemplate(`${groupKey}:${templateKey}`, `${groupKey}: ${label}`, workflowData, {
          title: templateValue.title || label,
          description: templateValue.description || '',
          mediaType: templateValue.mediaType || templateValue.type || 'unknown',
          tags: templateValue.tags,
          models: templateValue.models,
          openSource: templateValue.openSource,
          usage: templateValue.usage,
          date: templateValue.date,
          io: templateValue.io,
          tutorialUrl: templateValue.tutorialUrl,
          requiresCustomNodes: templateValue.requiresCustomNodes,
          includeOnDistributions: templateValue.includeOnDistributions,
          searchRank: templateValue.searchRank,
          size: templateValue.size,
          vram: templateValue.vram,
          status: templateValue.status,
          category: groupKey,
          categoryGroup: 'Custom',
        })
      }
    }
  }

  return templates
}

export function extractIndexedTemplates(raw, templatesBaseUrl, source, excludedTags = DEFAULT_EXCLUDED_TEMPLATE_TAGS) {
  if (!Array.isArray(raw)) return []

  const templates = []
  for (const section of raw) {
    if (!section || typeof section !== 'object') continue
    const sectionTitle = section.title || section.category || section.type || 'Templates'
    const sectionTemplates = Array.isArray(section.templates) ? section.templates : []
    for (const template of sectionTemplates) {
      if (!template || typeof template !== 'object') continue
      const tags = Array.isArray(template.tags) ? template.tags : []
      const hasExcludedTag = tags.some((tag) => excludedTags.has(String(tag || '').trim().toLowerCase()))
      const isApiBased = hasExcludedTag || template.openSource === false
      if (isApiBased) continue
      const name = template.name
      if (!name || typeof name !== 'string') continue
      const displayName = template.title || template.name
      const mediaSubtype = template.mediaSubtype || 'webp'
      templates.push({
        id: `${source}:${sectionTitle}:${name}`,
        label: `${sectionTitle}: ${displayName}`,
        title: displayName,
        description: template.description || '',
        mediaType: template.mediaType || section.type || 'unknown',
        tags,
        models: Array.isArray(template.models) ? template.models : [],
        openSource: template.openSource,
        usage: typeof template.usage === 'number' ? template.usage : 0,
        date: typeof template.date === 'string' ? template.date : '',
        io: template.io && typeof template.io === 'object' ? template.io : null,
        tutorialUrl: typeof template.tutorialUrl === 'string' ? template.tutorialUrl : '',
        requiresCustomNodes: Array.isArray(template.requiresCustomNodes) ? template.requiresCustomNodes : [],
        includeOnDistributions: Array.isArray(template.includeOnDistributions) ? template.includeOnDistributions : [],
        searchRank: typeof template.searchRank === 'number' ? template.searchRank : undefined,
        size: typeof template.size === 'number' ? template.size : undefined,
        vram: typeof template.vram === 'number' ? template.vram : undefined,
        status: typeof template.status === 'string' ? template.status : '',
        category: sectionTitle,
        categoryGroup: section.category || 'Templates',
        isEssential: Boolean(section.isEssential),
        thumbnailUrl: `${templatesBaseUrl}/${encodeURIComponent(name)}-1.${encodeURIComponent(mediaSubtype)}`,
        source,
        workflowUrl: `${templatesBaseUrl}/${encodeURIComponent(name)}.json`,
        workflow: null,
      })
    }
  }

  return templates
}

export { DEFAULT_EXCLUDED_TEMPLATE_TAGS }
