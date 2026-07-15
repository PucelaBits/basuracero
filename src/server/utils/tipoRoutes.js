function slugifyTipo(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildTipoPath(tipoId, tipoNombre) {
  const id = Number.parseInt(tipoId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return '/'
  }

  const slug = slugifyTipo(tipoNombre)
  return slug ? `/tipo/${id}/${slug}` : `/tipo/${id}`
}

function buildCategoryMeta({ appName, baseUrl, tipo }) {
  const categoryPath = buildTipoPath(tipo.id, tipo.nombre)
  const categoryName = tipo.nombre
  const title = `${categoryName} | ${appName}`
  const description = `Consulta en el mapa las incidencias de ${categoryName.toLowerCase()} en ${appName}.`

  return {
    title,
    description,
    url: new URL(categoryPath, baseUrl).href
  }
}

module.exports = {
  slugifyTipo,
  buildTipoPath,
  buildCategoryMeta
}
