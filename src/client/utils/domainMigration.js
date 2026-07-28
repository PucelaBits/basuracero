// V2 fuerza una comprobacion adicional tras el cambio de dominio. La
// importacion es idempotente: nunca sobrescribe codigos ya guardados.
const MIGRATION_MARKER = 'basuraceroDomainMigrationV2'
const MIGRATION_HASH_PREFIX = '#bc-migration-v1='
const MAX_INCIDENCIAS = 500
const MAX_CODE_LENGTH = 512

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(normalized + padding)
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function mergeMigrationData(data) {
  if (!data || data.version !== 1 || typeof data.storage !== 'object' || !data.storage) {
    return false
  }

  const entries = Object.entries(data.storage).slice(0, MAX_INCIDENCIAS + 4)
  const migratedFavorites = []

  entries.forEach(([key, value]) => {
    if (/^incidencia_\d+$/.test(key) && typeof value === 'string' && value.length <= MAX_CODE_LENGTH) {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value)
      return
    }

    if (key === 'favoriteIncidencias' && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
          parsed.forEach(id => {
            const numericId = Number.parseInt(id, 10)
            if (Number.isInteger(numericId) && numericId > 0) migratedFavorites.push(numericId)
          })
        }
      } catch (_error) {
        // Ignora favoritos corruptos sin impedir la migracion de los codigos.
      }
      return
    }

    if (['nombreUsuario', 'avisoInstalacionCerrado', 'bannerBienvenidaVisto'].includes(key) && typeof value === 'string') {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value.slice(0, 500))
    }
  })

  if (migratedFavorites.length > 0) {
    let currentFavorites = []
    try {
      const parsed = JSON.parse(localStorage.getItem('favoriteIncidencias') || '[]')
      if (Array.isArray(parsed)) currentFavorites = parsed
    } catch (_error) {
      // Sustituye una lista local corrupta por los favoritos migrados.
    }
    const merged = [...new Set([...currentFavorites, ...migratedFavorites])]
      .map(id => Number.parseInt(id, 10))
      .filter(id => Number.isInteger(id) && id > 0)
    localStorage.setItem('favoriteIncidencias', JSON.stringify(merged))
  }

  return true
}

function importPayloadFromFragment() {
  if (!window.location.hash.startsWith(MIGRATION_HASH_PREFIX)) return false

  const encodedPayload = window.location.hash.slice(MIGRATION_HASH_PREFIX.length)
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)

  try {
    const data = JSON.parse(decodeBase64Url(encodedPayload))
    return mergeMigrationData(data)
  } catch (_error) {
    return false
  }
}

export function prepareDomainMigration(legacyOrigin) {
  const imported = importPayloadFromFragment()
  if (imported) localStorage.setItem(MIGRATION_MARKER, new Date().toISOString())

  if (!legacyOrigin || localStorage.getItem(MIGRATION_MARKER)) return true

  try {
    const legacyUrl = new URL('/__basuracero_migrate', legacyOrigin)
    if (legacyUrl.origin === window.location.origin) return true
    legacyUrl.searchParams.set('return', `${window.location.pathname}${window.location.search}`)
    window.location.replace(legacyUrl.href)
    return false
  } catch (_error) {
    return true
  }
}

export { MIGRATION_HASH_PREFIX, MIGRATION_MARKER, mergeMigrationData }
