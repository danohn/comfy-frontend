import React, { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import defaultWorkflow from '../01_get_started_text_to_image.json'
import useApiConfig from './hooks/useApiConfig'
import useWorkflowConfig from './hooks/useWorkflowConfig'
import useGeneration from './hooks/useGeneration'

const REMOTE_TEMPLATES_BASE_URL = 'https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/templates'
const REMOTE_TEMPLATES_INDEX_URL = `${REMOTE_TEMPLATES_BASE_URL}/index.json`

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSettingsRoute = location.pathname === '/settings'

  const [promptText, setPromptText] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('comfy_selected_model') || '')
  const [availableModels, setAvailableModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [isValidatingWorkflow, setIsValidatingWorkflow] = useState(false)
  const [inputImageFile, setInputImageFile] = useState(null)
  const [inputImageName, setInputImageName] = useState('')
  const [isOpsMode, setIsOpsMode] = useState(false)
  const [serverFeatures, setServerFeatures] = useState(null)
  const [serverSystemStats, setServerSystemStats] = useState(null)
  const [serverExtensions, setServerExtensions] = useState([])
  const [serverHistoryCount, setServerHistoryCount] = useState(null)
  const [serverTemplates, setServerTemplates] = useState([])
  const [templateSource, setTemplateSource] = useState('none')
  const [isLoadingServerData, setIsLoadingServerData] = useState(false)
  const [serverDataError, setServerDataError] = useState(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [applyingTemplateId, setApplyingTemplateId] = useState(null)
  const [forceApplyByTemplate, setForceApplyByTemplate] = useState({})
  const [modelCheckByTemplate, setModelCheckByTemplate] = useState({})
  const [activePrereqTemplateId, setActivePrereqTemplateId] = useState(null)
  const [modelInventory, setModelInventory] = useState(null)
  const [isLoadingModelInventory, setIsLoadingModelInventory] = useState(false)
  const [opsActionStatus, setOpsActionStatus] = useState(null)
  const [serverRecentJobs, setServerRecentJobs] = useState([])
  const [isLoadingRecentJobs, setIsLoadingRecentJobs] = useState(false)
  const [recentJobsError, setRecentJobsError] = useState(null)
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [jobDetail, setJobDetail] = useState(null)
  const [isLoadingJobDetail, setIsLoadingJobDetail] = useState(false)
  const [jobDetailError, setJobDetailError] = useState(null)
  const jobPromptCacheRef = useRef({})

  const {
    apiUrl,
    settingsUrl,
    isTestingConnection,
    connectionStatus,
    hasConfiguredApiUrl,
    setSettingsUrl,
    saveApiUrl,
    testConnection,
  } = useApiConfig()

  const {
    workflow,
    workflowName,
    hasConfiguredWorkflow,
    uploadWorkflowFile,
    useSampleWorkflow,
  } = useWorkflowConfig(defaultWorkflow)

  const {
    isLoading,
    imageSrc,
    error,
    statusMessage,
    currentPromptId,
    queueState,
    setError,
    showHistoryImage,
    refreshQueue,
    cancelCurrentRun,
    generate,
  } = useGeneration()

  const canCloseSettings = hasConfiguredApiUrl && hasConfiguredWorkflow

  useEffect(() => {
    if (canCloseSettings) {
      setShowWelcome(false)
      return
    }

    const hasSeenWelcome = localStorage.getItem('comfy_onboarding_seen') === '1'
    if (hasSeenWelcome) {
      setShowWelcome(false)
      if (!isSettingsRoute) {
        navigate('/settings', { replace: true })
      }
    } else {
      setShowWelcome(!isSettingsRoute)
    }
  }, [canCloseSettings, isSettingsRoute, navigate])

  useEffect(() => {
    if (!hasConfiguredApiUrl) return

    refreshQueue(apiUrl)
    fetchRecentHistory()
    const intervalId = setInterval(() => {
      refreshQueue(apiUrl)
      fetchRecentHistory()
    }, 8000)

    return () => clearInterval(intervalId)
  }, [apiUrl, hasConfiguredApiUrl, refreshQueue])

  useEffect(() => {
    if (!isSettingsRoute || !hasConfiguredApiUrl) return
    fetchAvailableModels()
    fetchServerData()
  }, [isSettingsRoute, hasConfiguredApiUrl, apiUrl])

  function normalizeBaseUrl(url) {
    return url.trim().replace(/\/prompt\/?$/, '')
  }

  function formatModelValue(folder, modelName) {
    return `${folder}::${modelName}`
  }

  function parseModelValue(value) {
    if (!value) return { folder: null, name: '' }
    const [folder, ...rest] = value.split('::')
    return { folder: rest.length > 0 ? folder : null, name: rest.length > 0 ? rest.join('::') : value }
  }

  function openSettingsPage() {
    setSettingsUrl(apiUrl)
    navigate('/settings')
  }

  function handleStartOnboarding() {
    localStorage.setItem('comfy_onboarding_seen', '1')
    setShowWelcome(false)
    navigate('/settings')
  }

  async function handleWorkflowUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await uploadWorkflowFile(file)
      setError(null)
      setValidationResult(null)
    } catch (err) {
      setError(`Failed to parse JSON: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  function handleUseSampleWorkflow() {
    useSampleWorkflow()
    setError(null)
    setValidationResult(null)
  }

  async function fetchAvailableModels() {
    if (!apiUrl) return

    setIsLoadingModels(true)
    setModelsError(null)
    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const folders = ['checkpoints', 'diffusion_models']
      const results = await Promise.all(
        folders.map(async (folder) => {
          const res = await fetch(`${baseUrl}/models/${folder}`)
          if (!res.ok) return []
          const data = await res.json()
          if (!Array.isArray(data)) return []
          return data.map((name) => ({
            folder,
            name,
            value: formatModelValue(folder, name),
          }))
        })
      )

      const models = results.flat()
      setAvailableModels(models)

      if (selectedModel && !models.some((model) => model.value === selectedModel)) {
        setSelectedModel('')
        localStorage.removeItem('comfy_selected_model')
      }
    } catch (err) {
      setModelsError(String(err))
    } finally {
      setIsLoadingModels(false)
    }
  }

  function handleModelChange(value) {
    setSelectedModel(value)
    if (value) {
      localStorage.setItem('comfy_selected_model', value)
    } else {
      localStorage.removeItem('comfy_selected_model')
    }
  }

  async function handleValidateWorkflow() {
    if (!apiUrl) {
      setValidationResult({ ok: false, message: 'Configure API URL first' })
      return
    }
    if (!workflow) {
      setValidationResult({ ok: false, message: 'Upload a workflow first' })
      return
    }

    setIsValidatingWorkflow(true)
    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const res = await fetch(`${baseUrl}/object_info`)
      if (!res.ok) {
        throw new Error(`Validation request failed: ${res.status}`)
      }

      const objectInfo = await res.json()
      const classesInWorkflow = Array.from(
        new Set(
          Object.values(workflow)
            .map((node) => node?.class_type)
            .filter((classType) => typeof classType === 'string')
        )
      )
      const missingClasses = classesInWorkflow.filter((classType) => !(classType in objectInfo))

      if (missingClasses.length > 0) {
        setValidationResult({
          ok: false,
          message: `Missing node classes: ${missingClasses.join(', ')}`,
          missingClasses,
          checkedAt: new Date().toISOString(),
        })
      } else {
        setValidationResult({
          ok: true,
          message: 'Workflow is compatible with this server',
          missingClasses: [],
          checkedAt: new Date().toISOString(),
        })
      }
    } catch (err) {
      setValidationResult({
        ok: false,
        message: String(err),
        missingClasses: [],
        checkedAt: new Date().toISOString(),
      })
    } finally {
      setIsValidatingWorkflow(false)
    }
  }

  function handleInputImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setInputImageFile(file)
    setInputImageName(file.name)
  }

  function clearInputImage() {
    setInputImageFile(null)
    setInputImageName('')
  }

  function extractWorkflowTemplates(raw) {
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
          })
        }
      }
    }

    return templates
  }

  function extractIndexedTemplates(raw, templatesBaseUrl, source) {
    if (!Array.isArray(raw)) return []

    const templates = []
    for (const section of raw) {
      if (!section || typeof section !== 'object') continue
      const sectionTitle = section.title || section.category || section.type || 'Templates'
      const sectionTemplates = Array.isArray(section.templates) ? section.templates : []
      for (const template of sectionTemplates) {
        if (!template || typeof template !== 'object') continue
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
          tags: Array.isArray(template.tags) ? template.tags : [],
          thumbnailUrl: `${templatesBaseUrl}/${encodeURIComponent(name)}-1.${encodeURIComponent(mediaSubtype)}`,
          source,
          workflowUrl: `${templatesBaseUrl}/${encodeURIComponent(name)}.json`,
          workflow: null,
        })
      }
    }

    return templates
  }

  async function fetchTemplateIndex(indexUrl, templatesBaseUrl, source) {
    const res = await fetch(indexUrl)
    if (!res.ok) {
      throw new Error(`Template index failed: ${res.status}`)
    }
    const indexRaw = await res.json()
    return extractIndexedTemplates(indexRaw, templatesBaseUrl, source)
  }

  async function fetchServerData() {
    if (!apiUrl) return

    setIsLoadingServerData(true)
    setServerDataError(null)
    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const [featuresRes, statsRes, extensionsRes, historyRes, templatesRes, jobsRes] = await Promise.all([
        fetch(`${baseUrl}/features`),
        fetch(`${baseUrl}/system_stats`),
        fetch(`${baseUrl}/extensions`),
        fetch(`${baseUrl}/history`),
        fetch(`${baseUrl}/workflow_templates`),
        fetch(`${baseUrl}/api/jobs?limit=1&offset=0`),
      ])

      if (featuresRes.ok) {
        setServerFeatures(await featuresRes.json())
      }
      if (statsRes.ok) {
        setServerSystemStats(await statsRes.json())
      }
      if (extensionsRes.ok) {
        const extensions = await extensionsRes.json()
        setServerExtensions(Array.isArray(extensions) ? extensions : [])
      }
      if (historyRes.ok) {
        const history = await historyRes.json()
        setServerHistoryCount(history && typeof history === 'object' ? Object.keys(history).length : 0)
      }
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        const total = jobsData?.pagination?.total
        if (typeof total === 'number') {
          setServerHistoryCount(total)
        }
      }
      const localTemplatesIndexUrl = `${baseUrl}/templates/index.json`
      try {
        const indexedTemplates = await fetchTemplateIndex(localTemplatesIndexUrl, `${baseUrl}/templates`, 'local-index')
        if (indexedTemplates.length > 0) {
          setServerTemplates(indexedTemplates)
          setTemplateSource('local-index')
          return
        }
      } catch (_) {
        // Continue to workflow_templates and remote fallback.
      }

      if (templatesRes.ok) {
        const templatesRaw = await templatesRes.json()
        const templates = extractWorkflowTemplates(templatesRaw)
        if (templates.length > 0) {
          setServerTemplates(templates)
          setTemplateSource('server')
        } else {
          const remoteTemplates = await fetchTemplateIndex(REMOTE_TEMPLATES_INDEX_URL, REMOTE_TEMPLATES_BASE_URL, 'remote')
          setServerTemplates(remoteTemplates)
          setTemplateSource(remoteTemplates.length > 0 ? 'remote' : 'none')
        }
      } else {
        const remoteTemplates = await fetchTemplateIndex(REMOTE_TEMPLATES_INDEX_URL, REMOTE_TEMPLATES_BASE_URL, 'remote')
        setServerTemplates(remoteTemplates)
        setTemplateSource(remoteTemplates.length > 0 ? 'remote' : 'none')
      }
    } catch (err) {
      setTemplateSource('none')
      setServerDataError(String(err))
    } finally {
      setIsLoadingServerData(false)
    }
  }

  function extractPromptFromGraph(graph) {
    if (!graph || typeof graph !== 'object') return ''
    for (const node of Object.values(graph)) {
      const classType = String(node?.class_type || '').toLowerCase()
      if (classType.includes('cliptextencode') && typeof node?.inputs?.text === 'string') {
        return node.inputs.text
      }
    }
    return ''
  }

  function extractRequiredModelsFromWorkflow(workflowData) {
    const required = []
    const seenNodes = new Set()
    const dedupe = new Set()

    function walk(value) {
      if (!value || typeof value !== 'object') return
      if (seenNodes.has(value)) return
      seenNodes.add(value)

      if (Array.isArray(value.models)) {
        for (const model of value.models) {
          if (!model || typeof model !== 'object') continue
          const name = typeof model.name === 'string' ? model.name : ''
          const directory = typeof model.directory === 'string' ? model.directory : ''
          const url = typeof model.url === 'string' ? model.url : ''
          if (!name) continue
          const key = `${directory}::${name}::${url}`
          if (dedupe.has(key)) continue
          dedupe.add(key)
          required.push({ name, directory, url })
        }
      }

      if (Array.isArray(value)) {
        for (const item of value) walk(item)
        return
      }
      for (const nested of Object.values(value)) walk(nested)
    }

    walk(workflowData)
    return required
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

    setActivePrereqTemplateId(templateId)
    setModelCheckByTemplate((current) => ({
      ...current,
      [templateId]: { loading: true, error: null, missing: [], available: 0, total: 0 },
    }))

    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const inventory = await fetchModelInventory(baseUrl)
      if (!inventory) {
        throw new Error('Model inventory is still loading, please retry')
      }

      const workflowData = options.workflowData || await loadTemplateWorkflowData(template)

      const requiredModels = extractRequiredModelsFromWorkflow(workflowData)
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

      setModelCheckByTemplate((current) => ({
        ...current,
        [templateId]: {
          loading: false,
          error: null,
          missing,
          available,
          total: requiredModels.length,
          checkedAt: new Date().toISOString(),
        },
      }))
      if (missing.length === 0) {
        setForceApplyByTemplate((current) => ({ ...current, [templateId]: false }))
      }
      return {
        loading: false,
        error: null,
        missing,
        available,
        total: requiredModels.length,
        checkedAt: new Date().toISOString(),
      }
    } catch (err) {
      const errorValue = String(err)
      setModelCheckByTemplate((current) => ({
        ...current,
        [templateId]: { loading: false, error: errorValue, missing: [], available: 0, total: 0 },
      }))
      return { loading: false, error: errorValue, missing: [], available: 0, total: 0 }
    }
  }

  function extractImageFromOutputObject(outputObject) {
    if (!outputObject || typeof outputObject !== 'object') return null

    const baseUrl = normalizeBaseUrl(apiUrl)
    const buildViewUrl = (fileObject) => {
      if (!fileObject || typeof fileObject !== 'object') return null
      const filename = fileObject.filename
      if (!filename) return null
      const subfolder = fileObject.subfolder || ''
      const type = fileObject.type || 'output'
      return `${baseUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`
    }

    // /api/jobs preview_output is often a direct file object, not images/video arrays.
    const directUrl = buildViewUrl(outputObject)
    if (directUrl) return directUrl

    const imageLists = []
    if (Array.isArray(outputObject.images)) imageLists.push(outputObject.images)
    if (Array.isArray(outputObject.video)) imageLists.push(outputObject.video)
    if (Array.isArray(outputObject.audio)) imageLists.push(outputObject.audio)

    for (const list of imageLists) {
      if (list.length === 0) continue
      const url = buildViewUrl(list[0])
      if (url) return url
    }

    return null
  }

  function parseHistoryEntries(historyObject) {
    const entries = Object.entries(historyObject || {}).map(([promptId, record]) => {
      const graph = record?.prompt?.[2]
      const prompt = extractPromptFromGraph(graph) || '(prompt unavailable)'
      const status = record?.status?.status_str || (record?.status?.completed ? 'success' : 'unknown')
      const messages = Array.isArray(record?.status?.messages) ? record.status.messages : []
      const startMessage = messages.find((msg) => Array.isArray(msg) && msg[0] === 'execution_start')
      const startTimestamp = startMessage?.[1]?.timestamp
      const createdAt = typeof startTimestamp === 'number'
        ? new Date(startTimestamp).toISOString()
        : new Date().toISOString()

      let imageSrc = null
      if (record?.outputs && typeof record.outputs === 'object') {
        for (const output of Object.values(record.outputs)) {
          imageSrc = extractImageFromOutputObject(output)
          if (imageSrc) break
        }
      }

      return {
        id: promptId,
        prompt,
        status,
        createdAt,
        imageSrc,
      }
    })

    return entries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
  }

  function parseApiJobsEntries(jobsArray) {
    return (Array.isArray(jobsArray) ? jobsArray : [])
      .map((job) => {
        const jobId = job?.id || job?.prompt_id || `${Math.random()}`
        const cachedPrompt = jobPromptCacheRef.current[jobId]
        const prompt = cachedPrompt || job?.prompt || null
        const createdAt = (() => {
          if (typeof job?.create_time !== 'number') return new Date().toISOString()
          const createMs = job.create_time > 1e12 ? job.create_time : job.create_time * 1000
          return new Date(createMs).toISOString()
        })()
        const status = job?.status || 'unknown'
        const previewOutput = job?.preview_output
        const imageSrc = extractImageFromOutputObject(previewOutput)

        return {
          id: jobId,
          title: job?.name || `Job ${String(jobId).slice(0, 8)}`,
          prompt,
          status,
          createdAt,
          imageSrc,
          source: 'api-jobs',
        }
      })
      .slice(0, 20)
  }

  async function hydrateRecentJobPrompts(baseUrl, jobs) {
    const candidates = jobs.filter((job) => !job.prompt && !jobPromptCacheRef.current[job.id]).slice(0, 6)
    if (candidates.length === 0) return

    await Promise.all(
      candidates.map(async (job) => {
        try {
          const res = await fetch(`${baseUrl}/history/${encodeURIComponent(job.id)}`)
          if (!res.ok) return
          const detail = await res.json()
          const record = detail?.[job.id] || Object.values(detail || {})[0]
          const graph = record?.prompt?.[2]
          const extractedPrompt = extractPromptFromGraph(graph)
          if (!extractedPrompt) return
          jobPromptCacheRef.current[job.id] = extractedPrompt
        } catch (_) {
          // Ignore per-job prompt hydration failures.
        }
      })
    )

    setServerRecentJobs((current) =>
      current.map((job) => ({
        ...job,
        prompt: job.prompt || jobPromptCacheRef.current[job.id] || null,
      }))
    )
  }

  async function fetchRecentHistory() {
    if (!apiUrl) return

    setIsLoadingRecentJobs(true)
    setRecentJobsError(null)
    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const jobsRes = await fetch(`${baseUrl}/api/jobs?limit=20&offset=0&sort_by=created_at&sort_order=desc`)
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        const parsedJobs = parseApiJobsEntries(jobsData?.jobs)
        if (parsedJobs.length > 0) {
          setServerRecentJobs(parsedJobs)
          hydrateRecentJobPrompts(baseUrl, parsedJobs)
          return
        }
      }

      const res = await fetch(`${baseUrl}/history`)
      if (!res.ok) {
        throw new Error(`History request failed: ${res.status}`)
      }
      const historyData = await res.json()
      setServerRecentJobs(parseHistoryEntries(historyData))
    } catch (err) {
      setRecentJobsError(String(err))
    } finally {
      setIsLoadingRecentJobs(false)
    }
  }

  async function fetchJobDetail(jobId) {
    if (!apiUrl || !jobId) return

    setSelectedJobId(jobId)
    setIsLoadingJobDetail(true)
    setJobDetailError(null)
    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const jobsDetailRes = await fetch(`${baseUrl}/api/jobs/${encodeURIComponent(jobId)}`)
      if (jobsDetailRes.ok) {
        const detail = await jobsDetailRes.json()
        setJobDetail({
          source: 'api-jobs',
          id: detail?.id || jobId,
          status: detail?.status || 'unknown',
          createTime: detail?.create_time,
          updateTime: detail?.update_time,
          workflowId: detail?.workflow_id || null,
          outputsCount: detail?.outputs_count ?? null,
          executionError: detail?.execution_error || null,
          raw: detail,
        })
        return
      }

      const historyRes = await fetch(`${baseUrl}/history/${encodeURIComponent(jobId)}`)
      if (!historyRes.ok) {
        throw new Error(`Job detail request failed: ${jobsDetailRes.status}`)
      }
      const historyDetail = await historyRes.json()
      const record = historyDetail?.[jobId] || Object.values(historyDetail || {})[0]
      if (!record || typeof record !== 'object') {
        throw new Error('No detail found for selected job')
      }

      setJobDetail({
        source: 'history',
        id: jobId,
        status: record?.status?.status_str || (record?.status?.completed ? 'success' : 'unknown'),
        createTime: null,
        updateTime: null,
        workflowId: null,
        outputsCount: record?.outputs ? Object.keys(record.outputs).length : 0,
        executionError: null,
        raw: record,
      })
    } catch (err) {
      setJobDetail(null)
      setJobDetailError(String(err))
    } finally {
      setIsLoadingJobDetail(false)
    }
  }

  async function applyTemplate(templateId, options = {}) {
    const template = serverTemplates.find((entry) => entry.id === templateId)
    if (!template) {
      setError('Selected template not found')
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
      if (hasMissingPrereqs && !options.force) {
        setForceApplyByTemplate((current) => ({ ...current, [templateId]: true }))
        setError(`Missing prerequisites: ${check.missing.length} models not installed. Review and use "Force Apply Anyway" if needed.`)
        return
      }

      const safeName = String(template.label || template.id).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) || 'template'
      const blob = new Blob([JSON.stringify(workflowData)], { type: 'application/json' })
      const file = new File([blob], `${safeName}.json`, { type: 'application/json' })
      await uploadWorkflowFile(file)
      setForceApplyByTemplate((current) => ({ ...current, [templateId]: false }))
      setError(null)
      setValidationResult(null)
    } catch (err) {
      setError(`Failed to apply template: ${err.message}`)
    } finally {
      setApplyingTemplateId(null)
    }
  }

  async function runOpsAction(actionName, body) {
    if (!apiUrl) {
      setOpsActionStatus({ ok: false, message: 'Configure API URL first' })
      return
    }

    try {
      const baseUrl = normalizeBaseUrl(apiUrl)
      const res = await fetch(`${baseUrl}/${actionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(`${actionName} failed: ${res.status}`)
      }
      setOpsActionStatus({ ok: true, message: `${actionName} action completed` })
      await refreshQueue(apiUrl)
      await fetchServerData()
    } catch (err) {
      setOpsActionStatus({ ok: false, message: String(err) })
    }
  }

  async function handleClearPendingQueue() {
    await runOpsAction('queue', { clear: true })
  }

  async function handleInterruptExecution() {
    await runOpsAction('interrupt', {})
  }

  async function handleClearServerHistory() {
    await runOpsAction('history', { clear: true })
  }

  async function handleFreeMemory() {
    await runOpsAction('free', { unload_models: true, free_memory: true })
  }

  function handleSaveSettings() {
    const saveResult = saveApiUrl(settingsUrl)
    if (!saveResult.ok) {
      setError(saveResult.error)
      return
    }
    if (!hasConfiguredWorkflow) {
      setError('Please upload a workflow JSON or use the sample workflow before continuing')
      return
    }
    setError(null)
    navigate('/')
  }

  async function handleTestConnection() {
    const result = await testConnection(settingsUrl)
    if (result.ok) {
      setError(null)
    }
  }

  async function handleGenerate(e) {
    e?.preventDefault()
    await generate({
      promptText,
      apiUrl,
      workflow,
      openSettings: openSettingsPage,
      selectedModel,
      inputImageFile,
      onSuccess: () => setPromptText(''),
    })
  }

  async function handleCancelRun() {
    await cancelCurrentRun(apiUrl)
  }

  function renderHomePage() {
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
                  {selectedModel && (
                    <span className="px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                      Model: {parseModelValue(selectedModel).name}
                    </span>
                  )}
                  {typeof queueState.running === 'number' && typeof queueState.pending === 'number' && (
                    <span className="px-2 py-1 rounded-full font-medium bg-slate-200 text-slate-700">
                      Queue: {queueState.running} running, {queueState.pending} pending
                    </span>
                  )}
                </div>
                {!canCloseSettings && (
                  <button
                    type="button"
                    onClick={openSettingsPage}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
                  >
                    Complete Setup
                  </button>
                )}
              </div>

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
                  placeholder="What would you like to generate?"
                  className="w-full px-6 py-4 pt-20 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10 resize-none text-lg"
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
                    disabled={isLoading || !promptText.trim() || !hasConfiguredApiUrl || !hasConfiguredWorkflow}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                    title={isLoading ? 'Generating...' : 'Generate image'}
                    aria-label={isLoading ? 'Generating image' : 'Generate image'}
                  >
                    <span>{isLoading ? 'Generating' : 'Generate'}</span>
                  </button>
                </div>
              </div>
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

  function renderSettingsPage() {
    const normalizedQuery = templateSearch.trim().toLowerCase()
    const filteredTemplates = normalizedQuery
      ? serverTemplates.filter((template) => {
        const haystack = [
          template.title,
          template.label,
          template.description,
          ...(Array.isArray(template.tags) ? template.tags : []),
          template.mediaType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedQuery)
      })
      : serverTemplates

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
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-100"
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
              <input
                type="text"
                value={settingsUrl}
                onChange={(e) => setSettingsUrl(e.target.value)}
                placeholder="http://your-comfyui-host:8188"
                className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-opacity-10"
              />
              <p className="text-xs text-slate-500">Enter the base URL without /prompt</p>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </button>
              {connectionStatus && (
                <p className={`text-xs ${connectionStatus.type === 'success' ? 'text-green-700' : connectionStatus.type === 'error' ? 'text-red-700' : 'text-slate-500'}`}>
                  {connectionStatus.message}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Server Templates</label>
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search templates by name, tag, or description"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {serverTemplates.length > 0
                    ? templateSource === 'local-index'
                      ? `${serverTemplates.length} templates available from /templates/index.json`
                      : templateSource === 'remote'
                      ? `${serverTemplates.length} templates available from remote index`
                      : `${serverTemplates.length} templates available from server`
                    : 'No templates available from server or remote index'}
                </p>
                {filteredTemplates.length > 0 ? (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[34rem] overflow-y-auto pr-1">
                    {filteredTemplates.map((template) => (
                      <article key={template.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
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
                        <div className="p-3">
                          <p className="text-sm font-semibold text-slate-900 line-clamp-2">{template.title || template.label}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {template.description || 'No description provided'}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                              {template.mediaType || 'unknown'}
                            </span>
                            {Array.isArray(template.tags) && template.tags.length > 0 && (
                              <span className="truncate">{template.tags.slice(0, 2).join(', ')}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => applyTemplate(template.id)}
                            disabled={applyingTemplateId === template.id}
                            className="mt-3 w-full px-3 py-2 bg-slate-900 text-white text-sm rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60"
                          >
                            {applyingTemplateId === template.id ? 'Applying...' : 'Apply Template'}
                          </button>
                          {forceApplyByTemplate[template.id] && (
                            <button
                              type="button"
                              onClick={() => applyTemplate(template.id, { force: true })}
                              disabled={applyingTemplateId === template.id}
                              className="mt-2 w-full px-3 py-2 bg-amber-100 text-amber-900 text-sm rounded-lg font-medium hover:bg-amber-200 disabled:opacity-60"
                            >
                              {applyingTemplateId === template.id ? 'Applying...' : 'Force Apply Anyway'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (activePrereqTemplateId === template.id) {
                                setActivePrereqTemplateId(null)
                              } else {
                                checkTemplateModels(template.id)
                              }
                            }}
                            disabled={modelCheckByTemplate[template.id]?.loading || isLoadingModelInventory}
                            className="mt-2 w-full px-3 py-2 bg-slate-100 text-slate-800 text-sm rounded-lg font-medium hover:bg-slate-200 disabled:opacity-60"
                          >
                            {modelCheckByTemplate[template.id]?.loading
                              ? 'Checking prerequisites...'
                              : isLoadingModelInventory
                                ? 'Loading model inventory...'
                                : activePrereqTemplateId === template.id
                                  ? 'Hide Prerequisites'
                                  : 'Check Prerequisites'}
                          </button>
                          {activePrereqTemplateId === template.id && modelCheckByTemplate[template.id]?.error && (
                            <p className="mt-2 text-xs text-red-700 break-words">{modelCheckByTemplate[template.id].error}</p>
                          )}
                          {activePrereqTemplateId === template.id && modelCheckByTemplate[template.id] && !modelCheckByTemplate[template.id]?.loading && !modelCheckByTemplate[template.id]?.error && (
                            <div className="mt-2">
                              <p className={`text-xs ${modelCheckByTemplate[template.id].missing.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                                {modelCheckByTemplate[template.id].missing.length === 0
                                  ? `All ${modelCheckByTemplate[template.id].total} required models are available`
                                  : `${modelCheckByTemplate[template.id].missing.length} missing of ${modelCheckByTemplate[template.id].total} required models`}
                              </p>
                              {modelCheckByTemplate[template.id].missing.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {modelCheckByTemplate[template.id].missing.map((model) => (
                                    <div key={`${model.directory}:${model.name}:${model.url}`} className="rounded border border-slate-200 bg-slate-50 p-2">
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
                                              onClick={async () => {
                                                if (!model.url) return
                                                try {
                                                  await navigator.clipboard.writeText(model.url)
                                                  setError('Model URL copied to clipboard')
                                                } catch (_) {
                                                  setError('Failed to copy model URL')
                                                }
                                              }}
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
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    {serverTemplates.length > 0 ? 'No templates match your search.' : 'No templates loaded yet.'}
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-200 pt-6">
              <h2 className="text-xl font-semibold">Model Override</h2>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-900"
              >
                <option value="">Use workflow default model</option>
                {availableModels.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.name} ({model.folder})
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500">
                {isLoadingModels
                  ? 'Loading models...'
                  : modelsError
                    ? `Model lookup error: ${modelsError}`
                    : `${availableModels.length} models available`}
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">Workflow Compatibility</h2>
                <button
                  type="button"
                  onClick={handleValidateWorkflow}
                  disabled={isValidatingWorkflow || !hasConfiguredWorkflow}
                  className="px-3 py-1.5 bg-slate-100 text-slate-800 text-xs rounded-md font-medium hover:bg-slate-200 disabled:opacity-50"
                >
                  {isValidatingWorkflow ? 'Validating...' : 'Validate with /object_info'}
                </button>
              </div>
              {validationResult && (
                <p className={`text-xs ${validationResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                  {validationResult.message}
                </p>
              )}
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
                <div className="space-y-1 text-sm text-slate-600">
                  <p>ComfyUI version: {serverSystemStats?.system?.comfyui_version || 'unknown'}</p>
                  <p>GPU devices: {Array.isArray(serverSystemStats?.devices) ? serverSystemStats.devices.length : 0}</p>
                  <p>Extensions: {serverExtensions.length}</p>
                  <p>Server history items: {serverHistoryCount ?? 'unknown'}</p>
                  <p>Features: {serverFeatures ? Object.keys(serverFeatures).length : 0} keys</p>
                </div>
              )}
            </section>

            <section className="space-y-3 border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">Ops Mode</h2>
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={isOpsMode}
                    onChange={(e) => setIsOpsMode(e.target.checked)}
                  />
                  Enable admin actions
                </label>
              </div>
              {isOpsMode ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleClearPendingQueue}
                    className="w-full px-3 py-2 bg-amber-100 text-amber-900 text-sm rounded-lg font-medium hover:bg-amber-200"
                  >
                    Clear Pending Queue
                  </button>
                  <button
                    type="button"
                    onClick={handleInterruptExecution}
                    className="w-full px-3 py-2 bg-amber-100 text-amber-900 text-sm rounded-lg font-medium hover:bg-amber-200"
                  >
                    Interrupt Running Execution
                  </button>
                  <button
                    type="button"
                    onClick={handleClearServerHistory}
                    className="w-full px-3 py-2 bg-amber-100 text-amber-900 text-sm rounded-lg font-medium hover:bg-amber-200"
                  >
                    Clear Server History
                  </button>
                  <button
                    type="button"
                    onClick={handleFreeMemory}
                    className="w-full px-3 py-2 bg-amber-100 text-amber-900 text-sm rounded-lg font-medium hover:bg-amber-200"
                  >
                    Free VRAM / Unload Models
                  </button>
                  {opsActionStatus && (
                    <p className={`text-xs ${opsActionStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
                      {opsActionStatus.message}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Enable Ops Mode to access queue, history, and memory controls.
                </p>
              )}
            </section>

            <div className="border-t border-slate-200 pt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-1 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                {canCloseSettings ? 'Save' : 'Save and Continue'}
              </button>
              {canCloseSettings && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 font-semibold rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={renderHomePage()} />
      <Route path="/settings" element={renderSettingsPage()} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
