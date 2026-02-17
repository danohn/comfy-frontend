import React from 'react'
import GenerationPanel from '../generation/GenerationPanel'

export default function HomePage({
  openSettingsPage,
  openJobsPage,
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
  supportsInputImage,
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
  showWelcome,
  handleStartOnboarding,
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <div className="flex flex-col items-center flex-1 px-6 py-8">
        <div className="w-full max-w-2xl flex justify-end gap-2 mb-4">
          <button
            type="button"
            onClick={openJobsPage}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Open recent jobs"
          >
            Jobs
          </button>
          <button
            type="button"
            onClick={openSettingsPage}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Open settings"
          >
            Settings
          </button>
        </div>

        <div className="text-center mb-6 max-w-2xl">
          <h1 className="text-5xl font-bold mb-2">ComfyUI</h1>
          <p className="text-xl text-slate-600">Generate images from text</p>
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
          supportsInputImage={supportsInputImage}
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
