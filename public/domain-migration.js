(function migrateBasuraCeroStorage() {
  'use strict'

  const targetOrigin = window.BASURACERO_MIGRATION_TARGET
  if (typeof targetOrigin !== 'string' || !targetOrigin.startsWith('https://')) return

  const storage = {}
  const allowedKeys = new Set([
    'favoriteIncidencias',
    'nombreUsuario',
    'avisoInstalacionCerrado',
    'bannerBienvenidaVisto'
  ])

  try {
    Object.keys(localStorage).forEach(key => {
      if (allowedKeys.has(key) || /^incidencia_\d+$/.test(key)) {
        const value = localStorage.getItem(key)
        if (typeof value === 'string') storage[key] = value
      }
    })
  } catch (_error) {
    // Continúa con una carga vacía si el navegador bloquea el almacenamiento.
  }

  const payload = JSON.stringify({ version: 1, storage })
  const bytes = new TextEncoder().encode(payload)
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const params = new URLSearchParams(window.location.search)
  const requestedReturn = params.get('return')
  const returnPath = requestedReturn && requestedReturn.startsWith('/') && !requestedReturn.startsWith('//')
    ? requestedReturn
    : `${window.location.pathname}${window.location.search}`
  const destination = new URL(returnPath, targetOrigin)
  destination.hash = `bc-migration-v1=${encoded}`
  window.location.replace(destination.href)
})()
