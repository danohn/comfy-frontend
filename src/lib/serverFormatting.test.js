import { describe, expect, it } from 'vitest'
import {
  flattenFeatureEntries,
  formatBytes,
  formatDeviceName,
  formatExtensionLabel,
  prettyFeatureLabel,
  prettyFeatureValue,
} from './serverFormatting'

describe('serverFormatting helpers', () => {
  it('flattens nested feature objects', () => {
    const rows = flattenFeatureEntries({
      supports_preview_metadata: true,
      extension: { manager: { supports_v4: true } },
    })
    expect(rows).toEqual([
      ['supports_preview_metadata', true],
      ['extension.manager.supports_v4', true],
    ])
  })

  it('formats bytes to MB/GB', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(5 * 1024 * 1024 * 1024)).toBe('5 GB')
    expect(formatBytes(undefined)).toBe('N/A')
  })

  it('formats device names by removing prefixes', () => {
    expect(formatDeviceName('cuda:0 NVIDIA GeForce RTX 5080 : cudaMallocAsync', 0)).toBe('NVIDIA GeForce RTX 5080')
    expect(formatDeviceName('', 1)).toBe('Device 1')
  })

  it('formats extension labels', () => {
    expect(formatExtensionLabel('manager', 0)).toBe('manager')
    expect(formatExtensionLabel({ name: 'foo' }, 1)).toBe('foo')
    expect(formatExtensionLabel({}, 2)).toBe('Extension 3')
  })

  it('formats feature labels and values', () => {
    expect(prettyFeatureLabel('extension.manager.supports_v4')).toBe('Extension / Manager / Supports V4')
    expect(prettyFeatureValue(true, 'supports_preview_metadata')).toBe('Enabled')
    expect(prettyFeatureValue(104857600, 'max_upload_size')).toBe('100 MB')
    expect(prettyFeatureValue(null, 'something')).toBe('N/A')
  })
})
