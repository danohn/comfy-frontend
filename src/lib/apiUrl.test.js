import { describe, expect, it } from 'vitest'
import { buildApiUrlFromParts, normalizeBaseUrl, parseApiUrlParts } from './apiUrl'

describe('apiUrl helpers', () => {
  it('normalizes /prompt suffix', () => {
    expect(normalizeBaseUrl('http://host:8188/prompt')).toBe('http://host:8188')
    expect(normalizeBaseUrl('http://host:8188/prompt/')).toBe('http://host:8188')
  })

  it('parses url parts with defaults', () => {
    expect(parseApiUrlParts('https://example.com:9000')).toEqual({
      protocol: 'https',
      host: 'example.com',
      port: '9000',
    })
    expect(parseApiUrlParts('example.local')).toEqual({
      protocol: 'http',
      host: 'example.local',
      port: '8188',
    })
  })

  it('builds url from parts', () => {
    expect(buildApiUrlFromParts({ protocol: 'https', host: 'foo', port: '443' })).toBe('https://foo:443')
    expect(buildApiUrlFromParts({ protocol: 'http', host: 'bar', port: '' })).toBe('http://bar')
    expect(buildApiUrlFromParts({ protocol: 'http', host: '', port: '8188' })).toBe('')
  })
})
