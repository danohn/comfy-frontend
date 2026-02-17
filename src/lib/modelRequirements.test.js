import { describe, expect, it } from 'vitest'
import {
  collectWorkflowModelRequirements,
  extractNamedLoaderModelsFromWorkflow,
  extractRequiredModelsFromWorkflow,
  inferModelDirectory,
} from './modelRequirements'

describe('modelRequirements helpers', () => {
  it('infers directories from loader inputs', () => {
    expect(inferModelDirectory('ckpt_name', 'CheckpointLoaderSimple')).toBe('checkpoints')
    expect(inferModelDirectory('vae_name', 'VAELoader')).toBe('vae')
    expect(inferModelDirectory('clip_name', 'DualCLIPLoader')).toBe('text_encoders')
    expect(inferModelDirectory('unknown_name', 'CustomNode')).toBeNull()
  })

  it('extracts metadata model declarations recursively', () => {
    const workflow = {
      a: {
        models: [
          { name: 'a.safetensors', directory: 'checkpoints', url: 'https://x/a' },
          { name: 'a.safetensors', directory: 'checkpoints', url: 'https://x/a' },
        ],
      },
    }
    const result = extractRequiredModelsFromWorkflow(workflow)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ name: 'a.safetensors', directory: 'checkpoints', url: 'https://x/a' })
  })

  it('collects and deduplicates metadata + named loader requirements', () => {
    const workflow = {
      '4': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: 'v1.safetensors' },
      },
      meta: {
        models: [
          { name: 'v1.safetensors', directory: 'checkpoints', url: 'https://example/v1' },
          { name: 'vae.safetensors', directory: 'vae', url: '' },
        ],
      },
    }

    const named = extractNamedLoaderModelsFromWorkflow(workflow)
    expect(named).toContainEqual({ name: 'v1.safetensors', directory: 'checkpoints', url: '' })

    const merged = collectWorkflowModelRequirements(workflow)
    expect(merged).toHaveLength(2)
    expect(merged).toContainEqual({ name: 'v1.safetensors', directory: 'checkpoints', url: 'https://example/v1' })
    expect(merged).toContainEqual({ name: 'vae.safetensors', directory: 'vae', url: '' })
  })
})
