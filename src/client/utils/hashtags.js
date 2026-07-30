export const HASHTAG_PATTERN = /(^|[^\p{L}\p{N}_-])#([\p{L}\p{N}][\p{L}\p{N}_-]{0,49})/gu
export const HASHTAG_VALUE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,49}$/u

export function normalizeHashtag(value) {
  const normalized = String(value || '').trim().replace(/^#/, '').toLocaleLowerCase('es')
  return HASHTAG_VALUE_PATTERN.test(normalized) ? normalized : null
}

export function splitHashtags(text) {
  const value = String(text || '')
  const parts = []
  let lastIndex = 0
  let match

  HASHTAG_PATTERN.lastIndex = 0
  while ((match = HASHTAG_PATTERN.exec(value)) !== null) {
    const prefix = match[1]
    const tag = match[2].toLocaleLowerCase('es')
    const hashtagStart = match.index + prefix.length

    if (hashtagStart > lastIndex) parts.push({ type: 'text', value: value.slice(lastIndex, hashtagStart) })
    parts.push({ type: 'hashtag', value: `#${match[2]}`, tag })
    lastIndex = HASHTAG_PATTERN.lastIndex
  }

  if (lastIndex < value.length) parts.push({ type: 'text', value: value.slice(lastIndex) })
  return parts.length ? parts : [{ type: 'text', value }]
}
