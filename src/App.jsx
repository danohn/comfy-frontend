import React, { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import defaultWorkflow from '../01_get_started_text_to_image.json'
import useApiConfig from './hooks/useApiConfig'
import useWorkflowConfig from './hooks/useWorkflowConfig'
import useGeneration from './hooks/useGeneration'
import TemplateBrowser from './features/templates/TemplateBrowser'
import TemplateModals from './features/templates/TemplateModals'
import OnboardingPage from './features/onboarding/OnboardingPage'
import SettingsPage from './features/settings/SettingsPage'
import { buildApiUrlFromParts, normalizeBaseUrl, parseApiUrlParts } from './lib/apiUrl'
import { collectWorkflowModelRequirements } from './lib/modelRequirements'
import { extractIndexedTemplates, extractWorkflowTemplates } from './lib/templateIndex'
import { analyzeWorkflowPromptInputs, extractPromptFromGraph } from './lib/workflowPrompt'

const REMOTE_TEMPLATES_BASE_URL = 'https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/templates'
const REMOTE_TEMPLATES_INDEX_URL = `${REMOTE_TEMPLATES_BASE_URL}/index.json`

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSettingsRoute = location.pathname === '/settings'
  const isOnboardingRoute = location.pathname === '/onboarding'

  const [promptText, setPromptText] = useState('')
  const [negativePromptText, setNegativePromptText] = useState('')
  const [promptInputMode, setPromptInputMode] = useState('single')
  const [showWelcome, setShowWelcome] = useState(false)
  const [apiHost, setApiHost] = useState('')
  const [apiProtocol, setApiProtocol] = useState('http')
  const [apiPort, setApiPort] = useState('8188')
  const [showAdvancedApi, setShowAdvancedApi] = useState(false)
  const [workflowHealth, setWorkflowHealth] = useState(null)
  const [isCheckingWorkflowHealth, setIsCheckingWorkflowHealth] = useState(false)
  const [inputImageFile, setInputImageFile] = useState(null)
  const [inputImageName, setInputImageName] = useState('')
  const [serverFeatures, setServerFeatures] = useState(null)
  const [serverSystemStats, setServerSystemStats] = useState(null)
  const [serverExtensions, setServerExtensions] = useState([])
  const [showExtensions, setShowExtensions] = useState(false)
  const [serverHistoryCount, setServerHistoryCount] = useState(null)
  const [serverTemplates, setServerTemplates] = useState([])
  const [templateSource, setTemplateSource] = useState('none')
  const [isLoadingServerData, setIsLoadingServerData] = useState(false)
  const [serverDataError, setServerDataError] = useState(null)
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
  const [opsActionStatus, setOpsActionStatus] = useState(null)
  const [serverRecentJobs, setServerRecentJobs] = useState([])
  const [isLoadingRecentJobs, setIsLoadingRecentJobs] = useState(false)
  const [recentJobsError, setRecentJobsError] = useState(null)
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [jobDetail, setJobDetail] = useState(null)
  const [isLoadingJobDetail, setIsLoadingJobDetail] = useState(false)
  const [jobDetailError, setJobDetailError] = useState(null)
  const [toast, setToast] = useState(null)
  const [onboardingStep, setOnboardingStep] = useState(1)
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
      if (!isOnboardingRoute && !isSettingsRoute) {
        navigate('/onboarding', { replace: true })
      }
    } else {
      setShowWelcome(!isOnboardingRoute && !isSettingsRoute)
    }
  }, [canCloseSettings, isOnboardingRoute, isSettingsRoute, navigate])

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
    if ((!isSettingsRoute && !isOnboardingRoute) || !hasConfiguredApiUrl) return
    fetchServerData()
  }, [isSettingsRoute, isOnboardingRoute, hasConfiguredApiUrl, apiUrl])

  useEffect(() => {
    const promptInfo = analyzeWorkflowPromptInputs(workflow)
    setPromptInputMode(promptInfo.mode)
    setPromptText(promptInfo.defaultPrompt)
    setNegativePromptText(promptInfo.defaultNegativePrompt)
  }, [workflow])

  function syncApiFieldsFromUrl(url) {
    const parsed = parseApiUrlParts(url)
    setApiProtocol(parsed.protocol)
    setApiHost(parsed.host)
    setApiPort(parsed.port)
  }

  useEffect(() => {
    if (!isOnboardingRoute && !isSettingsRoute) return
    syncApiFieldsFromUrl(settingsUrl)
  }, [isOnboardingRoute, isSettingsRoute])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(id)
  }, [toast])

  function openSettingsPage() {
    setSettingsUrl(apiUrl)
    syncApiFieldsFromUrl(apiUrl)
    navigate('/settings')
  }

  function openOnboardingPage() {
    setSettingsUrl(apiUrl)
    syncApiFieldsFromUrl(apiUrl)
    navigate('/onboarding')
  }

  function handleStartOnboarding() {
    localStorage.setItem('comfy_onboarding_seen', '1')
    setShowWelcome(false)
    setOnboardingStep(1)
    syncApiFieldsFromUrl(apiUrl)
    navigate('/onboarding')
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  function updateApiSettings(next) {
    const nextProtocol = next.protocol ?? apiProtocol
    const nextHost = next.host ?? apiHost
    const nextPort = next.port ?? apiPort

    setApiProtocol(nextProtocol)
    setApiHost(nextHost)
    setApiPort(nextPort)
    setSettingsUrl(buildApiUrlFromParts({
      protocol: nextProtocol,
      host: nextHost,
      port: nextPort,
    }))
  }

  function saveApiSettings() {
    const saveResult = saveApiUrl(settingsUrl)
    if (!saveResult.ok) {
      setError(saveResult.error)
      return false
    }
    setError(null)
    showToast('Settings saved')
    return true
  }

  async function handleWorkflowUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw)
      const workflowCandidate = parsed?.prompt && typeof parsed.prompt === 'object' ? parsed.prompt : parsed
      await uploadWorkflowFile(file)
      setError(null)
      await runWorkflowHealthCheck(workflowCandidate)
    } catch (err) {
      setError(`Failed to parse JSON: ${err.message}`)
      setWorkflowHealth(null)
    } finally {
      e.target.value = ''
    }
  }

  function handleUseSampleWorkflow() {
    useSampleWorkflow()
    setError(null)
    setWorkflowHealth(null)
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

  async function runWorkflowHealthCheck(workflowData = workflow) {
    if (!apiUrl) {
      setWorkflowHealth({
        ok: false,
        message: 'Configure API URL first.',
        missingClasses: [],
        missing: [],
        available: 0,
        total: 0,
        checkedAt: new Date().toISOString(),
      })
      return
    }
    if (!workflowData || typeof workflowData !== 'object') {
      setWorkflowHealth({
        ok: false,
        message: 'Upload a workflow first.',
        missingClasses: [],
        missing: [],
        available: 0,
        total: 0,
        checkedAt: new Date().toISOString(),
      })
      return
    }

    setIsCheckingWorkflowHealth(true)
    setWorkflowHealth(null)
    try {
      const prereq = await evaluateWorkflowPrerequisites(workflowData)

      const ok = prereq.missing.length === 0
      let message = 'Workflow prerequisites are satisfied.'
      if (prereq.missing.length > 0) {
        message = `Missing models: ${prereq.missing.length} of ${prereq.total}`
      } else if (prereq.total === 0) {
        message = 'No explicit model prerequisites declared in this workflow.'
      }

      setWorkflowHealth({
        ok,
        message,
        missingClasses: [],
        ...prereq,
      })
    } catch (err) {
      setWorkflowHealth({
        ok: false,
        message: String(err),
        missingClasses: [],
        missing: [],
        available: 0,
        total: 0,
        checkedAt: new Date().toISOString(),
      })
    } finally {
      setIsCheckingWorkflowHealth(false)
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

  async function applyTemplate(templateId) {
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
      if (hasMissingPrereqs) {
        setError(`Missing prerequisites: ${check.missing.length} models not installed. Install missing models before applying this template.`)
        return
      }

      const safeName = String(template.label || template.id).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) || 'template'
      const blob = new Blob([JSON.stringify(workflowData)], { type: 'application/json' })
      const file = new File([blob], `${safeName}.json`, { type: 'application/json' })
      await uploadWorkflowFile(file)
      setError(null)
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

  async function copyModelUrl(url) {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setError('Model URL copied to clipboard')
    } catch (_) {
      setError('Failed to copy model URL')
    }
  }

  function handleSaveSettings() {
    saveApiSettings()
  }

  function handleOnboardingSaveAndContinue() {
    if (!saveApiSettings()) return
    setOnboardingStep(2)
  }

  function handleOnboardingFinish() {
    if (!hasConfiguredWorkflow) {
      setError('Please upload a workflow JSON or use the sample workflow before finishing setup')
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
      negativePromptText,
      apiUrl,
      workflow,
      openSettings: openSettingsPage,
      inputImageFile,
      onSuccess: () => {
        setPromptText('')
        setNegativePromptText('')
      },
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

  function getTemplateBrowserData() {
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

  function renderTemplateBrowser() {
    const {
      sidebarCategories,
      availableTemplateModels,
      availableTemplateTags,
      filteredTemplates,
    } = getTemplateBrowserData()
    return (
      <TemplateBrowser
        serverTemplates={serverTemplates}
        templateSource={templateSource}
        selectedTemplateCategory={selectedTemplateCategory}
        templateSort={templateSort}
        templateSearch={templateSearch}
        templateModelFilter={templateModelFilter}
        templateTagFilter={templateTagFilter}
        sidebarCategories={sidebarCategories}
        availableTemplateModels={availableTemplateModels}
        availableTemplateTags={availableTemplateTags}
        filteredTemplates={filteredTemplates}
        modelCheckByTemplate={modelCheckByTemplate}
        isLoadingModelInventory={isLoadingModelInventory}
        applyingTemplateId={applyingTemplateId}
        onSelectCategory={setSelectedTemplateCategory}
        onSearchChange={setTemplateSearch}
        onClearFilters={() => {
          setTemplateSearch('')
          setTemplateModelFilter('')
          setTemplateTagFilter('')
          setTemplateSort('default')
        }}
        onModelFilterChange={setTemplateModelFilter}
        onTagFilterChange={setTemplateTagFilter}
        onSortChange={setTemplateSort}
        onOpenDetails={setSelectedTemplateDetails}
        onCheckPrerequisites={async (templateId) => {
          setSelectedPrereqTemplateId(templateId)
          await checkTemplateModels(templateId)
        }}
        onApplyTemplate={applyTemplate}
      />
    )
  }

  function renderTemplateModals() {
    const selectedPrereqTemplate = selectedPrereqTemplateId
      ? serverTemplates.find((template) => template.id === selectedPrereqTemplateId) || null
      : null
    const selectedPrereqResult = selectedPrereqTemplateId
      ? modelCheckByTemplate[selectedPrereqTemplateId]
      : null
    return (
      <TemplateModals
        selectedTemplateDetails={selectedTemplateDetails}
        selectedPrereqTemplate={selectedPrereqTemplate}
        selectedPrereqResult={selectedPrereqResult}
        onCloseDetails={() => setSelectedTemplateDetails(null)}
        onClosePrereq={() => setSelectedPrereqTemplateId(null)}
        onCopyModelUrl={copyModelUrl}
      />
    )
  }

  function renderSettingsPage() {
    return (
      <SettingsPage
        apiUrl={apiUrl}
        settingsUrl={settingsUrl}
        canCloseSettings={canCloseSettings}
        apiHost={apiHost}
        updateApiSettings={updateApiSettings}
        showAdvancedApi={showAdvancedApi}
        setShowAdvancedApi={setShowAdvancedApi}
        apiProtocol={apiProtocol}
        apiPort={apiPort}
        handleTestConnection={handleTestConnection}
        isTestingConnection={isTestingConnection}
        handleSaveSettings={handleSaveSettings}
        connectionStatus={connectionStatus}
        hasConfiguredWorkflow={hasConfiguredWorkflow}
        workflowName={workflowName}
        handleWorkflowUpload={handleWorkflowUpload}
        handleUseSampleWorkflow={handleUseSampleWorkflow}
        runWorkflowHealthCheck={runWorkflowHealthCheck}
        isCheckingWorkflowHealth={isCheckingWorkflowHealth}
        workflowHealth={workflowHealth}
        onCopyModelUrl={copyModelUrl}
        renderTemplateBrowser={renderTemplateBrowser}
        fetchServerData={fetchServerData}
        isLoadingServerData={isLoadingServerData}
        serverDataError={serverDataError}
        serverSystemStats={serverSystemStats}
        serverExtensions={serverExtensions}
        showExtensions={showExtensions}
        setShowExtensions={setShowExtensions}
        serverHistoryCount={serverHistoryCount}
        serverFeatures={serverFeatures}
        handleClearPendingQueue={handleClearPendingQueue}
        handleInterruptExecution={handleInterruptExecution}
        handleClearServerHistory={handleClearServerHistory}
        handleFreeMemory={handleFreeMemory}
        opsActionStatus={opsActionStatus}
        onBackToApp={() => navigate('/')}
      />
    )
  }

  function renderOnboardingPage() {
    return (
      <OnboardingPage
        settingsUrl={settingsUrl}
        apiUrl={apiUrl}
        hasConfiguredApiUrl={hasConfiguredApiUrl}
        onboardingStep={onboardingStep}
        setOnboardingStep={setOnboardingStep}
        apiHost={apiHost}
        updateApiSettings={updateApiSettings}
        showAdvancedApi={showAdvancedApi}
        setShowAdvancedApi={setShowAdvancedApi}
        apiProtocol={apiProtocol}
        apiPort={apiPort}
        handleTestConnection={handleTestConnection}
        isTestingConnection={isTestingConnection}
        handleOnboardingSaveAndContinue={handleOnboardingSaveAndContinue}
        connectionStatus={connectionStatus}
        hasConfiguredWorkflow={hasConfiguredWorkflow}
        workflowName={workflowName}
        handleWorkflowUpload={handleWorkflowUpload}
        handleUseSampleWorkflow={handleUseSampleWorkflow}
        runWorkflowHealthCheck={runWorkflowHealthCheck}
        isCheckingWorkflowHealth={isCheckingWorkflowHealth}
        workflowHealth={workflowHealth}
        onCopyModelUrl={copyModelUrl}
        renderTemplateBrowser={renderTemplateBrowser}
        handleOnboardingFinish={handleOnboardingFinish}
      />
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={renderHomePage()} />
        <Route path="/onboarding" element={renderOnboardingPage()} />
        <Route path="/settings" element={renderSettingsPage()} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {renderTemplateModals()}
      {toast && (
        <div className="fixed right-4 bottom-4 z-[80]">
          <div className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-green-100 text-green-800 border border-green-200'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </>
  )
}
