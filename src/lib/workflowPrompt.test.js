import { describe, expect, it } from 'vitest'
import { analyzeWorkflowPromptInputs, extractPromptFromGraph, workflowSupportsInputImage } from './workflowPrompt'

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

  it('detects workflow support for image input via LoadImage', () => {
    const graph = {
      '1': { class_type: 'LoadImage', inputs: { image: 'foo.png' } },
      '2': { class_type: 'KSampler', inputs: {} },
    }
    expect(workflowSupportsInputImage(graph)).toBe(true)
  })

  it('returns false when workflow has no LoadImage input node', () => {
    const graph = {
      '1': { class_type: 'CLIPTextEncode', inputs: { text: 'prompt' } },
    }
    expect(workflowSupportsInputImage(graph)).toBe(false)
  })
})
