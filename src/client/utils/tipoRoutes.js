export function slugifyTipo(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildTipoPath(tipoId, tipoNombre) {
  const id = Number.parseInt(tipoId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return '/'
  }

  const slug = slugifyTipo(tipoNombre)
  return slug ? `/tipo/${id}/${slug}` : `/tipo/${id}`
}

export function buildTipoRoute(tipoId, tipoNombre) {
  const id = Number.parseInt(tipoId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return { name: 'Home' }
  }

  const slug = slugifyTipo(tipoNombre)
  return {
    name: 'TipoCategoria',
    params: {
      id: String(id),
      ...(slug ? { slug } : {})
    }
  }
}

export function parseTipoId(value) {
  const id = Number.parseInt(value, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

export function buildCategoryMeta({ appName, appDescription, baseUrl, tipo }) {
  const title = `${tipo.nombre} | ${appName}`
  const description = `Consulta en el mapa las incidencias de ${tipo.nombre.toLowerCase()} en ${appName}.`

  return {
    title,
    description,
    url: new URL(buildTipoPath(tipo.id, tipo.nombre), baseUrl).href,
    appDescription
  }
}
