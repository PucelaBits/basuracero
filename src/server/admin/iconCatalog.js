const fs = require('fs');
const path = require('path');

const DEFAULT_TIPO_ICON = 'mdi-circle';
const CURATED_TIPO_ICON_OPTIONS = [
  { value: 'mdi-trash-can', label: 'Basura' },
  { value: 'mdi-tree', label: 'Vegetación' },
  { value: 'mdi-road-variant', label: 'Calzada' },
  { value: 'mdi-bench-back', label: 'Mobiliario' },
  { value: 'mdi-sign-direction', label: 'Señalización' },
  { value: 'mdi-lightbulb-off', label: 'Alumbrado' },
  { value: 'mdi-bug', label: 'Plagas' },
  { value: 'mdi-paw', label: 'Animales' },
  { value: 'mdi-water', label: 'Agua' },
  { value: 'mdi-spray-bottle', label: 'Limpieza' },
  { value: 'mdi-alert-circle', label: 'Incidencia' },
  { value: 'mdi-circle', label: 'Otros' }
];

let cachedAllIcons = null;
let cachedAllowedIcons = null;
const EXCLUDED_ICON_NAMES = new Set([
  'blank',
  'dark',
  'light',
  'flip-h',
  'flip-v',
  'inverted',
  'rotate-45',
  'rotate-90',
  'rotate-135',
  'rotate-180',
  'rotate-225',
  'rotate-270',
  'rotate-315',
  'spin',
  'spin-off'
]);

function toHumanLabel(iconValue) {
  return iconValue
    .replace(/^mdi-/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getMaterialCssPath() {
  return path.join(__dirname, '..', '..', '..', 'node_modules', '@mdi', 'font', 'css', 'materialdesignicons.css');
}

function getAllMdiIcons() {
  if (cachedAllIcons) {
    return cachedAllIcons;
  }

  const cssPath = getMaterialCssPath();
  const css = fs.readFileSync(cssPath, 'utf8');
  const regex = /\.mdi-([a-z0-9-]+)::?before/g;
  const seen = new Set();
  const icons = [];
  let match;

  while ((match = regex.exec(css)) !== null) {
    const value = `mdi-${match[1]}`;
    if (EXCLUDED_ICON_NAMES.has(match[1])) {
      continue;
    }
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    icons.push({
      value,
      label: toHumanLabel(value)
    });
  }

  cachedAllIcons = icons;
  return cachedAllIcons;
}

function getAllowedMdiIconSet() {
  if (!cachedAllowedIcons) {
    cachedAllowedIcons = new Set(getAllMdiIcons().map((icon) => icon.value));
  }
  return cachedAllowedIcons;
}

function normalizeTipoIcon(icon) {
  const nextIcon = String(icon || '').trim();
  return getAllowedMdiIconSet().has(nextIcon) ? nextIcon : DEFAULT_TIPO_ICON;
}

module.exports = {
  CURATED_TIPO_ICON_OPTIONS,
  DEFAULT_TIPO_ICON,
  getAllMdiIcons,
  normalizeTipoIcon
};
