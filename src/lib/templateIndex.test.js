import { describe, expect, it } from 'vitest'
import { extractIndexedTemplates, extractWorkflowTemplates } from './templateIndex'

describe('templateIndex helpers', () => {
  it('extracts workflow templates from grouped object', () => {
    const raw = {
      UseCases: {
        t1: {
          title: 'Template One',
          workflow: { a: 1 },
          tags: ['Image'],
        },
      },
    }

    const result = extractWorkflowTemplates(raw)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Template One')
    expect(result[0].workflow).toEqual({ a: 1 })
  })

  it('filters API templates from index and builds urls', () => {
    const raw = [
      {
        title: 'Image',
        type: 'Image',
        templates: [
          { name: 'open-source', title: 'Open Source', tags: ['Image'], openSource: true },
          { name: 'api-only', title: 'API Only', tags: ['API'], openSource: true },
          { name: 'closed', title: 'Closed', tags: ['Image'], openSource: false },
        ],
      },
    ]

    const result = extractIndexedTemplates(raw, 'https://templates.example', 'remote')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBeUndefined()
    expect(result[0].title).toBe('Open Source')
    expect(result[0].workflowUrl).toBe('https://templates.example/open-source.json')
  })
})
