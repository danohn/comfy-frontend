export function analyzeWorkflowPromptInputs(graph) {
  if (!graph || typeof graph !== 'object') {
    return { mode: 'single', defaultPrompt: '', defaultNegativePrompt: '' }
  }

  const positiveRefs = new Set()
  const negativeRefs = new Set()
  for (const node of Object.values(graph)) {
    const classType = String(node?.class_type || '').toLowerCase()
    if (!classType.includes('ksampler')) continue
    const positive = node?.inputs?.positive
    const negative = node?.inputs?.negative
    if (Array.isArray(positive) && positive.length > 0) positiveRefs.add(String(positive[0]))
    if (Array.isArray(negative) && negative.length > 0) negativeRefs.add(String(negative[0]))
  }

  const promptLikeNodes = []
  for (const [nodeId, node] of Object.entries(graph)) {
    if (!node || typeof node !== 'object') continue
    const textValue = node?.inputs?.text
    if (typeof textValue !== 'string') continue
    const classType = String(node?.class_type || '').toLowerCase()
    const title = String(node?._meta?.title || '').toLowerCase()
    const looksLikePromptNode = classType.includes('cliptextencode') || title.includes('prompt')
    if (!looksLikePromptNode) continue
    const isNegative = title.includes('negative') || title.includes('neg')
    promptLikeNodes.push({ id: String(nodeId), text: textValue, isNegative })
  }

  const firstTextForRefs = (refs) => {
    for (const ref of refs) {
      const textValue = graph?.[ref]?.inputs?.text
      if (typeof textValue === 'string') return textValue
    }
    return ''
  }

  const mappedPrompt = firstTextForRefs(positiveRefs)
  const mappedNegative = firstTextForRefs(negativeRefs)
  if (positiveRefs.size > 0 || negativeRefs.size > 0) {
    return {
      mode: negativeRefs.size > 0 ? 'dual' : 'single',
      defaultPrompt: mappedPrompt || '',
      defaultNegativePrompt: mappedNegative || '',
    }
  }

  if (promptLikeNodes.length === 0) {
    return { mode: 'single', defaultPrompt: '', defaultNegativePrompt: '' }
  }
  if (promptLikeNodes.length === 1) {
    return { mode: 'single', defaultPrompt: promptLikeNodes[0].text || '', defaultNegativePrompt: '' }
  }

  const negativeNode = promptLikeNodes.find((node) => node.isNegative)
  const positiveNode = promptLikeNodes.find((node) => !node.isNegative) || promptLikeNodes[0]
  if (negativeNode && positiveNode) {
    return {
      mode: 'dual',
      defaultPrompt: positiveNode.text || '',
      defaultNegativePrompt: negativeNode.text || '',
    }
  }

  return { mode: 'single', defaultPrompt: positiveNode.text || '', defaultNegativePrompt: '' }
}

export function workflowSupportsInputImage(graph) {
  if (!graph || typeof graph !== 'object') return false
  for (const node of Object.values(graph)) {
    if (!node || typeof node !== 'object') continue
    const classType = String(node?.class_type || '').toLowerCase()
    if (classType !== 'loadimage') continue
    if (typeof node?.inputs?.image === 'string') return true
  }
  return false
}

export function extractPromptFromGraph(graph) {
  if (!graph || typeof graph !== 'object') return ''
  for (const node of Object.values(graph)) {
    const classType = String(node?.class_type || '').toLowerCase()
    if (classType.includes('cliptextencode') && typeof node?.inputs?.text === 'string') {
      return node.inputs.text
    }
  }
  return ''
}
