import React, { useMemo, useState } from 'react'

export default function RecentJobsPanel({
  fetchRecentHistory,
  loadMoreRecentJobs,
  isLoadingRecentJobs,
  isLoadingMoreRecentJobs,
  hasMoreRecentJobs,
  recentJobsError,
  serverRecentJobs,
  selectedJobId,
  setSelectedJobId,
  setJobDetail,
  setJobDetailError,
  fetchJobDetail,
  showHistoryImage,
  isLoadingJobDetail,
  jobDetailError,
  jobDetail,
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matchesFilter = (status) => {
      const normalized = String(status || '').toLowerCase()
      if (statusFilter === 'all') return true
      if (statusFilter === 'success') return normalized === 'success' || normalized === 'completed'
      if (statusFilter === 'failed') return normalized === 'failed' || normalized === 'error'
      if (statusFilter === 'running') return normalized === 'running' || normalized === 'in_progress'
      return normalized === statusFilter
    }

    return serverRecentJobs.filter((job) => {
      if (!matchesFilter(job.status)) return false
      if (!query) return true
      const haystack = `${job.title || ''} ${job.prompt || ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [searchQuery, serverRecentJobs, statusFilter])

  return (
    <div className="w-full">
      <div className="flex items-center justify-end mb-3">
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
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs..."
              className="flex-1 min-w-52 px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="text-[11px] text-slate-500">{filteredJobs.length} shown</span>
          </div>
          {filteredJobs.length === 0 && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-sm text-slate-500">
              No jobs match the current filters.
            </div>
          )}
          {filteredJobs.map((job) => (
            <div key={job.id} className="border border-slate-200 rounded-lg p-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900 break-words">{job.title || `Job ${String(job.id).slice(0, 8)}`}</p>
                  <p className="text-xs text-slate-500 mt-0.5 break-words">
                    {job.prompt ? (job.prompt.length > 160 ? `${job.prompt.slice(0, 160)}...` : job.prompt) : 'Prompt unavailable'}
                  </p>
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
              {selectedJobId === job.id && (
                <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-slate-900">Job Detail</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">{selectedJobId}</span>
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
          ))}
          {hasMoreRecentJobs && (
            <div className="pt-1">
              <button
                type="button"
                onClick={loadMoreRecentJobs}
                disabled={isLoadingMoreRecentJobs}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingMoreRecentJobs ? 'Loading more...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
