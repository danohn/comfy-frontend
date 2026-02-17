export function flattenFeatureEntries(serverFeatures) {
  if (!serverFeatures || typeof serverFeatures !== 'object') return []
  const rows = []
  const walk = (prefix, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        walk(prefix ? `${prefix}.${nestedKey}` : nestedKey, nestedValue)
      }
      return
    }
    rows.push([prefix, value])
  }
  walk('', serverFeatures)
  return rows
}

export function prettyFeatureLabel(key) {
  return key
    .split('.')
    .map((segment) =>
      segment
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase())
    )
    .join(' / ')
}

export function prettyFeatureValue(value, key = '') {
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled'
  if (typeof value === 'number') {
    if (key.includes('max_upload_size')) {
      if (value >= 1024 * 1024) return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`
    }
    return String(value)
  }
  if (value == null) return 'N/A'
  return String(value)
}

export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return 'N/A'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${Math.round(gb * 10) / 10} GB`
  const mb = bytes / (1024 * 1024)
  return `${Math.round(mb)} MB`
}

export function formatDeviceName(rawName, fallbackIndex) {
  if (!rawName || typeof rawName !== 'string') return `Device ${fallbackIndex}`
  let name = rawName
  if (name.includes(': ')) {
    name = name.split(': ')[0]
  }
  if (name.includes(' ')) {
    const firstSpace = name.indexOf(' ')
    const maybePrefix = name.slice(0, firstSpace)
    if (/^[a-z]+:\d+$/i.test(maybePrefix)) {
      name = name.slice(firstSpace + 1)
    }
  }
  return name.trim() || `Device ${fallbackIndex}`
}

export function formatExtensionLabel(ext, idx) {
  if (typeof ext === 'string') return ext
  if (ext && typeof ext === 'object') {
    return ext.name || ext.title || ext.id || `Extension ${idx + 1}`
  }
  return `Extension ${idx + 1}`
}
