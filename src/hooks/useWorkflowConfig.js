import { useState } from 'react'

function loadStoredWorkflow() {
  const saved = localStorage.getItem('comfy_workflow')
  if (!saved) return null

  try {
    const parsed = JSON.parse(saved)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (_) {
    // Fall back to null if local storage data is malformed.
  }

  localStorage.removeItem('comfy_workflow')
  localStorage.removeItem('comfy_workflow_name')
  return null
}

function loadStoredWorkflowName() {
  const savedName = localStorage.getItem('comfy_workflow_name') || ''
  if (savedName === 'Default (Lumina2 Text-to-Image)' || savedName === 'Sample (Lumina2 Text-to-Image)') {
    const migratedName = 'Sample (Z-Image-Turbo)'
    localStorage.setItem('comfy_workflow_name', migratedName)
    return migratedName
  }
  return savedName
}

export default function useWorkflowConfig(sampleWorkflow) {
  const [workflow, setWorkflow] = useState(() => loadStoredWorkflow())
  const [workflowName, setWorkflowName] = useState(() => loadStoredWorkflowName())
  const hasConfiguredWorkflow = workflow !== null

  function saveWorkflow(nextWorkflow, name) {
    setWorkflow(nextWorkflow)
    setWorkflowName(name)
    localStorage.setItem('comfy_workflow', JSON.stringify(nextWorkflow))
    localStorage.setItem('comfy_workflow_name', name)
  }

  async function uploadWorkflowFile(file) {
    const text = await file.text()
    const parsed = JSON.parse(text)
    saveWorkflow(parsed, file.name)
  }

  function useSampleWorkflow() {
    saveWorkflow(sampleWorkflow, 'Sample (Z-Image-Turbo)')
  }

  return {
    workflow,
    workflowName,
    hasConfiguredWorkflow,
    uploadWorkflowFile,
    useSampleWorkflow,
  }
}
