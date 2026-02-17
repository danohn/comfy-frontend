import React from 'react'
import GenerationPanel from '../generation/GenerationPanel'
import RecentJobsPanel from '../history/RecentJobsPanel'

export default function HomePage({
  openSettingsPage,
  imageSrc,
  isLoading,
  statusMessage,
  error,
  handleGenerate,
  hasConfiguredApiUrl,
  hasConfiguredWorkflow,
  workflowName,
  queueState,
  canCloseSettings,
  openOnboardingPage,
  promptInputMode,
  handleInputImageChange,
  inputImageName,
  clearInputImage,
  promptText,
  setPromptText,
  handleCancelRun,
  currentPromptId,
  negativePromptText,
  setNegativePromptText,
  apiUrl,
  fetchRecentHistory,
  isLoadingRecentJobs,
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
  showWelcome,
  handleStartOnboarding,
}) {
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

        <GenerationPanel
          imageSrc={imageSrc}
          isLoading={isLoading}
          statusMessage={statusMessage}
          error={error}
          handleGenerate={handleGenerate}
          hasConfiguredApiUrl={hasConfiguredApiUrl}
          hasConfiguredWorkflow={hasConfiguredWorkflow}
          workflowName={workflowName}
          queueState={queueState}
          canCloseSettings={canCloseSettings}
          openOnboardingPage={openOnboardingPage}
          promptInputMode={promptInputMode}
          handleInputImageChange={handleInputImageChange}
          inputImageName={inputImageName}
          clearInputImage={clearInputImage}
          promptText={promptText}
          setPromptText={setPromptText}
          handleCancelRun={handleCancelRun}
          currentPromptId={currentPromptId}
          negativePromptText={negativePromptText}
          setNegativePromptText={setNegativePromptText}
          apiUrl={apiUrl}
        />

        <RecentJobsPanel
          fetchRecentHistory={fetchRecentHistory}
          isLoadingRecentJobs={isLoadingRecentJobs}
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
