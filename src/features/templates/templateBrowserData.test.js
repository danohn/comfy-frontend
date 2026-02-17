import { describe, expect, it } from 'vitest'
import { getTemplateBrowserData } from './templateBrowserData'

describe('getTemplateBrowserData', () => {
  const templates = [
    {
      id: '1',
      title: 'A',
      label: 'A',
      description: 'First',
      categoryGroup: 'Use Cases',
      category: 'Image',
      tags: ['Tag1'],
      models: ['ModelA'],
      mediaType: 'image',
      usage: 10,
      date: '2025-01-01',
    },
    {
      id: '2',
      title: 'B',
      label: 'B',
      description: 'Second',
      categoryGroup: 'Use Cases',
      category: 'Video',
      tags: ['Tag2'],
      models: ['ModelB'],
      mediaType: 'video',
      usage: 20,
      date: '2025-02-01',
    },
  ]

  it('builds sidebar categories and filters by category', () => {
    const result = getTemplateBrowserData({
      serverTemplates: templates,
      templateSearch: '',
      selectedTemplateCategory: 'Image',
      templateModelFilter: '',
      templateTagFilter: '',
      templateSort: 'default',
    })

    expect(result.sidebarCategories[0].groupName).toBe('Use Cases')
    expect(result.filteredTemplates).toHaveLength(1)
    expect(result.filteredTemplates[0].id).toBe('1')
  })

  it('supports search + popular sorting', () => {
    const result = getTemplateBrowserData({
      serverTemplates: templates,
      templateSearch: 'second',
      selectedTemplateCategory: 'popular',
      templateModelFilter: '',
      templateTagFilter: '',
      templateSort: 'default',
    })

    expect(result.filteredTemplates).toHaveLength(1)
    expect(result.filteredTemplates[0].id).toBe('2')
  })
})
