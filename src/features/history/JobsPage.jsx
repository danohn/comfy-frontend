import React from 'react'
import RecentJobsPanel from './RecentJobsPanel'

export default function JobsPage({
  onBackHome,
  onOpenSettings,
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
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Recent Jobs</h1>
            <p className="text-sm text-slate-600 mt-1">Browse, filter, and inspect server-side job history.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackHome}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Back to App
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Settings
            </button>
          </div>
        </div>

        <RecentJobsPanel
          fetchRecentHistory={fetchRecentHistory}
          loadMoreRecentJobs={loadMoreRecentJobs}
          isLoadingRecentJobs={isLoadingRecentJobs}
          isLoadingMoreRecentJobs={isLoadingMoreRecentJobs}
          hasMoreRecentJobs={hasMoreRecentJobs}
          recentJobsError={recentJobsError}
          serverRecentJobs={serverRecentJobs}
          selectedJobId={selectedJobId}
          setSelectedJobId={setSelectedJobId}
          setJobDetail={setJobDetail}
          setJobDetailError={setJobDetailError}
          fetchJobDetail={fetchJobDetail}
          showHistoryImage={showHistoryImage}
          isLoadingJobDetail={isLoadingJobDetail}
          jobDetailError={jobDetailError}
          jobDetail={jobDetail}
        />
      </div>
    </div>
  )
}
