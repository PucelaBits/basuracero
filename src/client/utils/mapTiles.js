import { getRuntimeConfig } from './runtimeConfig'

const CARTO_RASTER_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

export function getCartoTileUrl() {
  const key = String(getRuntimeConfig().CARTO_API_KEY || '').trim()
  return key ? `${CARTO_RASTER_TILE_URL}?key=${encodeURIComponent(key)}` : CARTO_RASTER_TILE_URL
}
