import { useCallback, useRef, useState } from 'react'
import { normalizeBaseUrl } from '../lib/apiUrl'
import { extractPromptFromGraph } from '../lib/workflowPrompt'

export default function useRecentJobs(apiUrl) {
  const [serverRecentJobs, setServerRecentJobs] = useState([])
  const [isLoadingRecentJobs, setIsLoadingRecentJobs] = useState(false)
  const [recentJobsError, setRecentJobsError] = useState(null)
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [jobDetail, setJobDetail] = useState(null)
  const [isLoadingJobDetail, setIsLoadingJobDetail] = useState(false)
  const [jobDetailError, setJobDetailError] = useState(null)
  const jobPromptCacheRef = useRef({})

  const extractImageFromOutputObject = useCallback((outputObject) => {
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
  }, [apiUrl])

  const parseHistoryEntries = useCallback((historyObject) => {
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
  }, [extractImageFromOutputObject])

  const parseApiJobsEntries = useCallback((jobsArray) => {
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
  }, [extractImageFromOutputObject])

  const hydrateRecentJobPrompts = useCallback(async (baseUrl, jobs) => {
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
  }, [])

  const fetchRecentHistory = useCallback(async () => {
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
  }, [apiUrl, hydrateRecentJobPrompts, parseApiJobsEntries, parseHistoryEntries])

  const fetchJobDetail = useCallback(async (jobId) => {
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
  }, [apiUrl])

  return {
    serverRecentJobs,
    isLoadingRecentJobs,
    recentJobsError,
    selectedJobId,
    setSelectedJobId,
    jobDetail,
    setJobDetail,
    isLoadingJobDetail,
    jobDetailError,
    setJobDetailError,
    fetchRecentHistory,
    fetchJobDetail,
  }
}
