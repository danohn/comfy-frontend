import { useState } from 'react'
import { normalizeBaseUrl } from '../lib/apiUrl'
import { collectWorkflowModelRequirements } from '../lib/modelRequirements'
import { extractIndexedTemplates, extractWorkflowTemplates } from '../lib/templateIndex'

const REMOTE_TEMPLATES_BASE_URL = 'https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/templates'
const REMOTE_TEMPLATES_INDEX_URL = `${REMOTE_TEMPLATES_BASE_URL}/index.json`

export default function useTemplates({ apiUrl, uploadWorkflowFile, onSetError, onTemplateApplied }) {
  const [serverTemplates, setServerTemplates] = useState([])
  const [templateSource, setTemplateSource] = useState('none')
  const [templateSearch, setTemplateSearch] = useState('')
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('all')
  const [templateModelFilter, setTemplateModelFilter] = useState('')
  const [templateTagFilter, setTemplateTagFilter] = useState('')
  const [templateSort, setTemplateSort] = useState('default')
  const [selectedTemplateDetails, setSelectedTemplateDetails] = useState(null)
  const [applyingTemplateId, setApplyingTemplateId] = useState(null)
  const [modelCheckByTemplate, setModelCheckByTemplate] = useState({})
  const [selectedPrereqTemplateId, setSelectedPrereqTemplateId] = useState(null)
  const [modelInventory, setModelInventory] = useState(null)
  const [isLoadingModelInventory, setIsLoadingModelInventory] = useState(false)

  async function fetchTemplateIndex(indexUrl, templatesBaseUrl, source) {
    const res = await fetch(indexUrl)
    if (!res.ok) {
      throw new Error(`Template index failed: ${res.status}`)
    }
    const indexRaw = await res.json()
    return extractIndexedTemplates(indexRaw, templatesBaseUrl, source)
  }

  async function loadTemplatesForBaseUrl(baseUrl) {
    try {
      const localTemplatesIndexUrl = `${baseUrl}/templates/index.json`
      try {
        const indexedTemplates = await fetchTemplateIndex(localTemplatesIndexUrl, `${baseUrl}/templates`, 'local-index')
        if (indexedTemplates.length > 0) {
          setServerTemplates(indexedTemplates)
          setTemplateSource('local-index')
          return
        }
      } catch (_) {
        // Continue to /workflow_templates and remote fallback.
      }

      const templatesRes = await fetch(`${baseUrl}/workflow_templates`)
      if (templatesRes.ok) {
        const templatesRaw = await templatesRes.json()
        const templates = extractWorkflowTemplates(templatesRaw)
        if (templates.length > 0) {
          setServerTemplates(templates)
          setTemplateSource('server')
          return
        }
      }

      const remoteTemplates = await fetchTemplateIndex(REMOTE_TEMPLATES_INDEX_URL, REMOTE_TEMPLATES_BASE_URL, 'remote')
      setServerTemplates(remoteTemplates)
      setTemplateSource(remoteTemplates.length > 0 ? 'remote' : 'none')
    } catch (err) {
      setTemplateSource('none')
      throw err
    }
  }

  async function fetchModelInventory(baseUrl) {
    if (modelInventory) return modelInventory
    if (isLoadingModelInventory) return null

    setIsLoadingModelInventory(true)
    try {
      const foldersRes = await fetch(`${baseUrl}/models`)
      if (!foldersRes.ok) {
        throw new Error(`Model folders lookup failed: ${foldersRes.status}`)
      }
      const folders = await foldersRes.json()
      const folderList = Array.isArray(folders) ? folders : []

      const folderEntries = await Promise.all(
        folderList.map(async (folder) => {
          const folderKey = String(folder).toLowerCase()
          try {
            const res = await fetch(`${baseUrl}/models/${encodeURIComponent(folder)}`)
            if (!res.ok) return [folderKey, new Set()]
            const files = await res.json()
            const names = Array.isArray(files) ? files.map((name) => String(name).toLowerCase()) : []
            return [folderKey, new Set(names)]
          } catch (_) {
            return [folderKey, new Set()]
          }
        })
      )

      const inventory = Object.fromEntries(folderEntries)
      setModelInventory(inventory)
      return inventory
    } finally {
      setIsLoadingModelInventory(false)
    }
  }

  async function evaluateWorkflowPrerequisites(workflowData) {
    const baseUrl = normalizeBaseUrl(apiUrl)
    const inventory = await fetchModelInventory(baseUrl)
    if (!inventory) {
      throw new Error('Model inventory is still loading, please retry')
    }

    const requiredModels = collectWorkflowModelRequirements(workflowData)
    const missing = []
    let available = 0
    for (const model of requiredModels) {
      const folderKey = String(model.directory || '').toLowerCase()
      const nameKey = String(model.name || '').toLowerCase()
      const folderEntries = inventory[folderKey]
      const exists = folderEntries instanceof Set ? folderEntries.has(nameKey) : false
      if (exists) {
        available += 1
      } else {
        missing.push(model)
      }
    }

    return {
      missing,
      available,
      total: requiredModels.length,
      checkedAt: new Date().toISOString(),
    }
  }

  async function loadTemplateWorkflowData(template) {
    let workflowData = template.workflow
    if (!workflowData && template.workflowUrl) {
      const res = await fetch(template.workflowUrl)
      if (!res.ok) {
        throw new Error(`Template workflow download failed: ${res.status}`)
      }
      workflowData = await res.json()
    }
    if (!workflowData || typeof workflowData !== 'object') {
      throw new Error('Template workflow payload is invalid')
    }
    return workflowData
  }

  async function checkTemplateModels(templateId, options = {}) {
    if (!apiUrl) return
    const template = serverTemplates.find((entry) => entry.id === templateId)
    if (!template) return

    setModelCheckByTemplate((current) => ({
      ...current,
      [templateId]: { loading: true, error: null, missing: [], available: 0, total: 0 },
    }))

    try {
      const workflowData = options.workflowData || await loadTemplateWorkflowData(template)
      const result = await evaluateWorkflowPrerequisites(workflowData)
      const { missing, available, total, checkedAt } = result

      setModelCheckByTemplate((current) => ({
        ...current,
        [templateId]: {
          loading: false,
          error: null,
          missing,
          available,
          total,
          checkedAt,
        },
      }))
      return { loading: false, error: null, ...result }
    } catch (err) {
      const errorValue = String(err)
      setModelCheckByTemplate((current) => ({
        ...current,
        [templateId]: { loading: false, error: errorValue, missing: [], available: 0, total: 0 },
      }))
      return { loading: false, error: errorValue, missing: [], available: 0, total: 0 }
    }
  }

  async function applyTemplate(templateId) {
    const template = serverTemplates.find((entry) => entry.id === templateId)
    if (!template) {
      onSetError?.('Selected template not found')
      return
    }

    try {
      setApplyingTemplateId(templateId)
      const workflowData = await loadTemplateWorkflowData(template)
      const check = await checkTemplateModels(templateId, { workflowData })
      if (check?.error) {
        throw new Error(check.error)
      }

      const hasMissingPrereqs = Array.isArray(check?.missing) && check.missing.length > 0
      if (hasMissingPrereqs) {
        onSetError?.(`Missing prerequisites: ${check.missing.length} models not installed. Install missing models before applying this template.`)
        return
      }

      const safeName = String(template.label || template.id).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) || 'template'
      const blob = new Blob([JSON.stringify(workflowData)], { type: 'application/json' })
      const file = new File([blob], `${safeName}.json`, { type: 'application/json' })
      await uploadWorkflowFile(file)
      onTemplateApplied?.()
      onSetError?.(null)
    } catch (err) {
      onSetError?.(`Failed to apply template: ${err.message}`)
    } finally {
      setApplyingTemplateId(null)
    }
  }

  return {
    serverTemplates,
    templateSource,
    templateSearch,
    setTemplateSearch,
    selectedTemplateCategory,
    setSelectedTemplateCategory,
    templateModelFilter,
    setTemplateModelFilter,
    templateTagFilter,
    setTemplateTagFilter,
    templateSort,
    setTemplateSort,
    selectedTemplateDetails,
    setSelectedTemplateDetails,
    applyingTemplateId,
    modelCheckByTemplate,
    selectedPrereqTemplateId,
    setSelectedPrereqTemplateId,
    isLoadingModelInventory,
    loadTemplatesForBaseUrl,
    evaluateWorkflowPrerequisites,
    checkTemplateModels,
    applyTemplate,
  }
}
