import React, { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import defaultWorkflow from '../01_get_started_text_to_image.json'
import useApiConfig from './hooks/useApiConfig'
import useApiSettingsForm from './hooks/useApiSettingsForm'
import useOnboardingFlow from './hooks/useOnboardingFlow'
import useRecentJobs from './hooks/useRecentJobs'
import useServerAdmin from './hooks/useServerAdmin'
import useTemplates from './hooks/useTemplates'
import useWorkflowConfig from './hooks/useWorkflowConfig'
import useGeneration from './hooks/useGeneration'
import TemplateBrowser from './features/templates/TemplateBrowser'
import TemplateModals from './features/templates/TemplateModals'
import OnboardingPage from './features/onboarding/OnboardingPage'
import SettingsPage from './features/settings/SettingsPage'
import HomePage from './features/home/HomePage'
import JobsPage from './features/history/JobsPage'
import { getTemplateBrowserData } from './features/templates/templateBrowserData'
import { normalizeBaseUrl } from './lib/apiUrl'
import { analyzeWorkflowPromptInputs, workflowSupportsInputImage } from './lib/workflowPrompt'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSettingsRoute = location.pathname === '/settings'
  const isOnboardingRoute = location.pathname === '/onboarding'

  const [promptText, setPromptText] = useState('')
  const [negativePromptText, setNegativePromptText] = useState('')
  const [promptInputMode, setPromptInputMode] = useState('single')
  const [supportsInputImage, setSupportsInputImage] = useState(false)
  const skipWorkflowPromptDefaultsRef = useRef(false)
  const [workflowHealth, setWorkflowHealth] = useState(null)
  const [isCheckingWorkflowHealth, setIsCheckingWorkflowHealth] = useState(false)
  const [inputImageFile, setInputImageFile] = useState(null)
  const [inputImageName, setInputImageName] = useState('')
  const [toast, setToast] = useState(null)

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
    apiHost,
    apiProtocol,
    apiPort,
    showAdvancedApi,
    setShowAdvancedApi,
    syncApiFieldsFromUrl,
    updateApiSettings,
    prepSettingsFromApi,
  } = useApiSettingsForm({
    apiUrl,
    settingsUrl,
    setSettingsUrl,
    isSettingsRoute,
    isOnboardingRoute,
  })

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
  const {
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
  } = useTemplates({
    apiUrl,
    uploadWorkflowFile,
    onSetError: setError,
    onTemplateApplied: () => {
      skipWorkflowPromptDefaultsRef.current = true
      setPromptText('')
      setNegativePromptText('')
    },
  })
  const {
    serverRecentJobs,
    isLoadingRecentJobs,
    isLoadingMoreRecentJobs,
    hasMoreRecentJobs,
    recentJobsError,
    selectedJobId,
    setSelectedJobId,
    jobDetail,
    setJobDetail,
    isLoadingJobDetail,
    jobDetailError,
    setJobDetailError,
    fetchRecentHistory,
    loadMoreRecentJobs,
    fetchJobDetail,
  } = useRecentJobs(apiUrl)
  const {
    serverFeatures,
    serverSystemStats,
    serverExtensions,
    showExtensions,
    setShowExtensions,
    serverHistoryCount,
    isLoadingServerData,
    serverDataError,
    opsActionStatus,
    fetchServerData,
    handleClearPendingQueue,
    handleInterruptExecution,
    handleClearServerHistory,
    handleFreeMemory,
  } = useServerAdmin({
    apiUrl,
    refreshQueue,
    loadTemplatesForBaseUrl,
  })

  const canCloseSettings = hasConfiguredApiUrl && hasConfiguredWorkflow
  const {
    showWelcome,
    onboardingStep,
    setOnboardingStep,
    handleStartOnboarding,
  } = useOnboardingFlow({
    canCloseSettings,
    isOnboardingRoute,
    isSettingsRoute,
    navigate,
    apiUrl,
    syncApiFieldsFromUrl,
  })

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
    setPromptText('')
    setNegativePromptText('')
    skipWorkflowPromptDefaultsRef.current = false
    const supportsImage = workflowSupportsInputImage(workflow)
    setSupportsInputImage(supportsImage)
    if (!supportsImage) {
      setInputImageFile(null)
      setInputImageName('')
    }
  }, [workflow])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(id)
  }, [toast])

  function openSettingsPage() {
    prepSettingsFromApi()
    navigate('/settings')
  }

  function openOnboardingPage() {
    prepSettingsFromApi()
    navigate('/onboarding')
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
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
    skipWorkflowPromptDefaultsRef.current = true
    useSampleWorkflow()
    setError(null)
    setWorkflowHealth(null)
    setPromptText('')
    setNegativePromptText('')
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
        <HomePage
        openSettingsPage={openSettingsPage}
        openJobsPage={() => navigate('/jobs')}
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
        showWelcome={showWelcome}
        handleStartOnboarding={handleStartOnboarding}
      />
    )
  }

  function renderJobsPage() {
    return (
      <JobsPage
        onBackHome={() => navigate('/')}
        onOpenSettings={openSettingsPage}
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
        showHistoryImage={(url) => {
          showHistoryImage(url)
          navigate('/')
        }}
        isLoadingJobDetail={isLoadingJobDetail}
        jobDetailError={jobDetailError}
        jobDetail={jobDetail}
      />
    )
  }

  function renderTemplateBrowser() {
    const {
      sidebarCategories,
      availableTemplateModels,
      availableTemplateTags,
      filteredTemplates,
    } = getTemplateBrowserData({
      serverTemplates,
      templateSearch,
      selectedTemplateCategory,
      templateModelFilter,
      templateTagFilter,
      templateSort,
    })
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
        onOpenJobs={() => navigate('/jobs')}
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
        <Route path="/jobs" element={renderJobsPage()} />
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
