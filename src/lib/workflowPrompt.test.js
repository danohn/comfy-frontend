import { describe, expect, it } from 'vitest'
import { analyzeWorkflowPromptInputs, extractPromptFromGraph } from './workflowPrompt'

describe('workflowPrompt helpers', () => {
  it('extracts dual prompt mode from ksampler wiring', () => {
    const graph = {
      '3': { class_type: 'KSampler', inputs: { positive: ['6', 0], negative: ['7', 0] } },
      '6': { class_type: 'CLIPTextEncode', inputs: { text: 'good prompt' } },
      '7': { class_type: 'CLIPTextEncode', inputs: { text: 'bad prompt' } },
    }

    expect(analyzeWorkflowPromptInputs(graph)).toEqual({
      mode: 'dual',
      defaultPrompt: 'good prompt',
      defaultNegativePrompt: 'bad prompt',
    })
  })

  it('falls back to single prompt when only one prompt node exists', () => {
    const graph = {
      '1': { class_type: 'CLIPTextEncode', inputs: { text: 'solo' }, _meta: { title: 'CLIP Text Encode (Prompt)' } },
    }

    expect(analyzeWorkflowPromptInputs(graph)).toEqual({
      mode: 'single',
      defaultPrompt: 'solo',
      defaultNegativePrompt: '',
    })
  })

  it('extracts first cliptextencode prompt', () => {
    const graph = {
      '1': { class_type: 'OtherNode', inputs: { text: 'ignore me' } },
      '2': { class_type: 'CLIPTextEncode', inputs: { text: 'hello world' } },
    }

    expect(extractPromptFromGraph(graph)).toBe('hello world')
  })
})
