export function extractRequiredModelsFromWorkflow(workflowData) {
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

export function inferModelDirectory(inputName, classType) {
  const key = String(inputName || '').toLowerCase()
  const type = String(classType || '').toLowerCase()
  if (key === 'ckpt_name') return 'checkpoints'
  if (key === 'unet_name') return 'diffusion_models'
  if (key === 'vae_name') return 'vae'
  if (key === 'lora_name') return 'loras'
  if (key === 'control_net_name') return 'controlnet'
  if (key === 'style_model_name') return 'style_models'
  if (key === 'clip_name') return type.includes('dualclip') || type.includes('cliploader') ? 'text_encoders' : null
  if (key.endsWith('_name')) return null
  return null
}

export function extractNamedLoaderModelsFromWorkflow(workflowData) {
  if (!workflowData || typeof workflowData !== 'object' || Array.isArray(workflowData)) return []
  const requirements = []
  const dedupe = new Set()

  for (const node of Object.values(workflowData)) {
    if (!node || typeof node !== 'object') continue
    const inputs = node.inputs
    if (!inputs || typeof inputs !== 'object') continue
    const classType = String(node.class_type || '')

    for (const [inputName, inputValue] of Object.entries(inputs)) {
      if (typeof inputValue !== 'string') continue
      const directory = inferModelDirectory(inputName, classType)
      if (!directory) continue
      const key = `${directory}::${inputValue}`
      if (dedupe.has(key)) continue
      dedupe.add(key)
      requirements.push({
        name: inputValue,
        directory,
        url: '',
      })
    }
  }

  return requirements
}

export function collectWorkflowModelRequirements(workflowData) {
  const metadataModels = extractRequiredModelsFromWorkflow(workflowData)
  const namedModels = extractNamedLoaderModelsFromWorkflow(workflowData)
  const merged = new Map()

  for (const model of [...metadataModels, ...namedModels]) {
    const directory = String(model?.directory || '').toLowerCase()
    const name = String(model?.name || '')
    if (!name || !directory) continue
    const key = `${directory}::${name.toLowerCase()}`
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, { ...model, directory, name })
    } else if (!existing.url && model.url) {
      merged.set(key, { ...existing, url: model.url })
    }
  }

  return Array.from(merged.values())
}
