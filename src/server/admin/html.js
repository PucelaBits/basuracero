const {
  CURATED_TIPO_ICON_OPTIONS,
  DEFAULT_TIPO_ICON,
  getAllMdiIcons,
  normalizeTipoIcon
} = require('./iconCatalog');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatDateInput(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const raw = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderTipoBadge(nombre, icono, compact = false) {
  return `
    <span class="tipo-inline${compact ? ' compact' : ''}">
      <i class="mdi ${escapeAttr(normalizeTipoIcon(icono || DEFAULT_TIPO_ICON))}" aria-hidden="true"></i>
      <span>${escapeHtml(nombre || 'Sin categoria')}</span>
    </span>
  `;
}

function renderTipoLabel(nombre, icono) {
  return `
    <span class="tipo-label">
      <i class="mdi ${escapeAttr(normalizeTipoIcon(icono || DEFAULT_TIPO_ICON))}" aria-hidden="true"></i>
      <span>${escapeHtml(nombre || 'Sin categoria')}</span>
    </span>
  `;
}

function renderTipoSelect({ name, tipos, selectedValue, id, required = false, includeEmptyOption = null }) {
  const options = [
    includeEmptyOption ? `<option value="">${escapeHtml(includeEmptyOption)}</option>` : '',
    ...tipos.map((tipo) => `<option value="${tipo.id}" data-icono="${escapeAttr(normalizeTipoIcon(tipo.icono || DEFAULT_TIPO_ICON))}"${String(selectedValue ?? '') === String(tipo.id) ? ' selected' : ''}>${escapeHtml(tipo.nombre)}</option>`)
  ].filter(Boolean).join('');
  return `
    <div class="tipo-select">
      <select id="${escapeAttr(id)}" name="${escapeAttr(name)}"${required ? ' required' : ''}>${options}</select>
    </div>
  `;
}

function renderTipoSelectScript() {
  return '';
}

function renderPostFormsWithCsrf(html, csrfToken) {
  if (!csrfToken) {
    return html;
  }

  return String(html).replace(/<form\b([^>]*)method="post"([^>]*)>/gi, (match) => {
    if (match.includes('name="_csrf"')) {
      return match;
    }

    return `${match}<input type="hidden" name="_csrf" value="${escapeAttr(csrfToken)}">`;
  });
}

function renderLayout({ title, body, currentAdmin, notice, csrfToken }) {
  const safeBody = renderPostFormsWithCsrf(body, csrfToken);
  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(title)}</title>
      <link rel="stylesheet" href="/admin-assets/mdi/css/materialdesignicons.min.css">
      <style>
        :root {
          color-scheme: light;
          --bg: #f4f6f7;
          --panel: #ffffff;
          --ink: #17202a;
          --muted: #66737f;
          --line: #dbe2e8;
          --accent: #1b2430;
          --accent-soft: #eef2f5;
          --danger: #a3322a;
          --surface-soft: #f8fafb;
        }
        * { box-sizing: border-box; }
        [hidden] { display: none !important; }
        :focus-visible {
          outline: 3px solid #315f7d;
          outline-offset: 3px;
        }
        body {
          margin: 0;
          min-height: 100vh;
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          background: linear-gradient(180deg, #f7f8f9 0%, #eef2f4 100%);
          color: var(--ink);
        }
        .shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          padding: 24px 16px 40px;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          padding: 10px 2px 18px;
          border-bottom: 1px solid rgba(216, 224, 232, 0.95);
        }
        .brand {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0;
        }
        .meta {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }
        .panel {
          background: var(--panel);
          border: 1px solid rgba(219, 226, 232, 0.92);
          border-radius: 20px;
          box-shadow: 0 14px 38px rgba(23, 32, 42, 0.05);
          padding: 28px 26px;
        }
        .panel h1, .panel h2 {
          margin: 0 0 16px;
          line-height: 1.2;
        }
        .panel p {
          margin: 0 0 16px;
          line-height: 1.6;
          color: var(--muted);
        }
        .subtle-panel {
          background: var(--surface-soft);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 22px;
        }
        form {
          display: grid;
          gap: 16px;
        }
        label {
          display: grid;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
        }
        input, select {
          min-height: 46px;
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 0 14px;
          font-size: 16px;
          color: var(--ink);
          background: #fff;
        }
        textarea {
          min-height: 120px;
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 16px;
          color: var(--ink);
          background: #fff;
          font-family: inherit;
          line-height: 1.5;
          resize: vertical;
        }
        button, .button-link {
          min-height: 48px;
          border: 0;
          border-radius: 16px;
          padding: 0 18px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          background: var(--accent);
          color: #fff;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        button[aria-disabled="true"] {
          cursor: wait;
          opacity: 0.72;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .button-ghost {
          background: transparent;
          color: var(--ink);
          border: 1px solid var(--line);
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .field-help {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
          margin-top: -2px;
        }
        .notice {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 14px;
          background: var(--accent-soft);
          color: var(--ink);
          line-height: 1.5;
          border: 1px solid #cce2dc;
        }
        .notice.error {
          background: #faece9;
          border-color: #efc8c0;
          color: var(--danger);
        }
        .grid {
          display: grid;
          gap: 16px;
        }
        .grid.two {
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        .grid.three {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .hero {
          display: grid;
          gap: 20px;
          margin-bottom: 20px;
        }
        .hero h1 {
          font-size: clamp(30px, 4vw, 40px);
        }
        .hero-copy {
          max-width: 620px;
        }
        .stat-card {
          background: var(--surface-soft);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 18px;
        }
        .stat-card strong {
          display: block;
          font-size: 30px;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .eyebrow {
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .quick-links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .quick-link {
          min-height: 120px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink);
          text-decoration: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
        }
        .quick-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(22, 33, 43, 0.08);
          border-color: #c6d3de;
        }
        .quick-link strong {
          font-size: 18px;
          line-height: 1.3;
        }
        .quick-link span {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .incident-card {
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: #fff;
          box-shadow: 0 12px 26px rgba(22, 33, 43, 0.05);
        }
        .thumb-link {
          display: block;
          background: #e8edf1;
        }
        .thumb {
          display: block;
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
        }
        .incident-card-body {
          padding: 16px;
        }
        .incident-card-body h3 {
          margin: 0 0 10px;
          font-size: 17px;
          line-height: 1.45;
        }
        .incident-card-body h3 a {
          color: var(--ink);
          text-decoration: none;
        }
        .meta-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .meta-list span {
          padding: 6px 10px;
          border-radius: 999px;
          background: #eef3f6;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.4;
        }
        .table-wrap {
          overflow-x: auto;
        }
        .tipo-inline {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 24px;
          padding: 0;
          line-height: 1.4;
          color: var(--ink);
          font-weight: 600;
        }
        .tipo-inline.compact {
          min-height: 20px;
          gap: 8px;
        }
        .tipo-inline i,
        .icon-tile i {
          font-size: 18px;
          line-height: 1;
          color: var(--muted);
        }
        .tipo-inline.compact i {
          font-size: 16px;
        }
        .tipo-select {
          display: grid;
          gap: 10px;
        }
        .tipo-select-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .icon-picker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
          gap: 8px;
          max-height: min(34vh, 320px);
          overflow-x: hidden;
          overflow-y: auto;
          padding-right: 4px;
          align-content: start;
        }
        .icon-option input[type="radio"] {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
        .icon-option {
          position: relative;
          min-width: 0;
        }
        .icon-tile {
          min-height: 68px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          cursor: pointer;
          text-align: center;
          transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease, background 140ms ease;
        }
        .icon-tile strong {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.35;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .icon-option input[type="radio"]:checked + .icon-tile {
          border-color: #1b2430;
          background: #f3f6f8;
          box-shadow: 0 6px 18px rgba(23, 32, 42, 0.06);
        }
        .icon-tile:hover {
          transform: translateY(-1px);
          border-color: #c5d0d8;
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(12, 18, 24, 0.45);
          z-index: 50;
        }
        .modal-backdrop.open {
          display: flex;
        }
        .modal-card {
          width: min(100%, 860px);
          max-height: calc(100vh - 48px);
          overflow: auto;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 22px;
          box-shadow: 0 24px 80px rgba(17, 24, 32, 0.24);
          padding: 24px;
        }
        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .modal-header h2 {
          margin-bottom: 6px;
        }
        .modal-close {
          min-height: 44px;
          min-width: 44px;
          border-radius: 14px;
          padding: 0 14px;
        }
        .modal-layout {
          display: grid;
          grid-template-columns: minmax(0, 260px) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }
        .modal-panel {
          display: grid;
          gap: 14px;
          align-content: start;
        }
        .category-form-field {
          display: grid;
          gap: 6px;
          align-content: start;
        }
        .category-form-field input {
          min-height: 48px;
          padding: 0 12px;
        }
        .modal-preview {
          display: grid;
          gap: 8px;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: var(--surface-soft);
        }
        .category-preview {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 42px;
          padding: 0 12px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #fff;
          font-weight: 600;
        }
        .category-preview-label {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .category-preview i {
          font-size: 16px;
          line-height: 1;
        }
        .icon-search {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: end;
        }
        .icon-picker-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 24px;
        }
        .icon-picker-heading strong {
          font-size: 14px;
        }
        .icon-picker-count {
          color: var(--muted);
          font-size: 13px;
        }
        .icon-catalog-toggle {
          min-height: 48px;
          white-space: nowrap;
        }
        .settings-layout {
          display: block;
        }
        .settings-form {
          display: grid;
          gap: 28px;
        }
        .settings-section {
          display: grid;
          gap: 16px;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--line);
        }
        .settings-section h2,
        .settings-section p {
          margin: 0;
        }
        .settings-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .settings-fields .field-wide {
          grid-column: 1 / -1;
        }
        .settings-brand-assets {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
        }
        .settings-brand-asset {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          min-height: 132px;
          padding: 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--surface-soft);
        }
        .settings-brand-asset img {
          width: 72px;
          height: 72px;
          padding: 8px;
          object-fit: contain;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
        }
        .settings-brand-asset-content {
          display: grid;
          gap: 10px;
          min-width: 0;
        }
        .settings-brand-asset-content p {
          line-height: 1.5;
        }
        .settings-upload-button {
          width: fit-content;
        }
        .settings-upload-status {
          min-height: 21px;
        }
        .settings-color-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .settings-color-grid input[type="color"] {
          width: 100%;
          min-height: 48px;
          padding: 4px;
          cursor: pointer;
        }
        .settings-preview-panel {
          display: grid;
          gap: 12px;
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: var(--surface-soft);
        }
        .settings-preview-header {
          display: grid;
          grid-template-columns: 66px minmax(0, 1fr) 48px;
          align-items: center;
          min-height: 48px;
          overflow: hidden;
          background: var(--preview-primary, #4b3481);
          color: #fff;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.22);
        }
        .settings-preview-header-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 66px;
          height: 48px;
        }
        .settings-preview-header-logo img {
          display: block;
          width: 30px;
          height: 30px;
          object-fit: cover;
        }
        .settings-preview-header-copy {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 0;
          text-align: center;
        }
        .settings-preview-header-name {
          margin: 0;
          max-width: 100%;
          overflow: hidden;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: 1px;
          text-overflow: ellipsis;
          text-shadow: 1px 1px 10px #000;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .settings-preview-header-subtitle {
          display: block;
          max-width: 100%;
          margin-top: 3px;
          padding: 0 6px;
          overflow: hidden;
          border-radius: 5px;
          background: var(--preview-secondary, #7361a0);
          color: rgba(255, 255, 255, 0.8);
          font-size: 10px;
          line-height: 1.35;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .settings-preview-header-menu {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          color: #fff;
        }
        .settings-preview-header-menu i {
          font-size: 24px;
          line-height: 1;
        }
        .settings-map {
          width: 100%;
          min-height: 380px;
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          background: #e9eef1;
        }
        .settings-map-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .settings-coordinate-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .settings-coordinate-grid output {
          display: block;
          min-height: 44px;
          padding: 10px 12px;
          border-radius: 12px;
          background: var(--surface-soft);
          font-variant-numeric: tabular-nums;
          font-size: 13px;
        }
        .settings-service-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
        .settings-service {
          display: grid;
          align-content: start;
          gap: 14px;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 16px;
        }
        .settings-service-heading {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .settings-service-heading h3 {
          margin: 0;
        }
        .settings-external-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 12px;
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--ink);
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }
        .settings-external-link:hover {
          background: var(--accent-soft);
        }
        .settings-secret-status {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          color: var(--muted);
          font-size: 13px;
        }
        .toolbar-inline {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--line);
        }
        .toolbar-inline .actions {
          gap: 10px;
        }
        .category-table {
          width: 100%;
          border-collapse: collapse;
        }
        .category-table th,
        .category-table td {
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
          vertical-align: middle;
        }
        .category-table th {
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .category-table td + td,
        .category-table th + th {
          padding-left: 18px;
        }
        .category-table td.metrics-cell {
          width: 96px;
        }
        .category-table td.actions-cell {
          width: 1%;
          white-space: nowrap;
        }
        .tipo-label {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.5;
        }
        .tipo-label i {
          width: 20px;
          flex: 0 0 auto;
          font-size: 18px;
          line-height: 1;
          color: var(--muted);
        }
        .metric-value {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .category-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }
        .category-merge-inline {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .category-merge-inline > * {
          flex: 1 1 220px;
        }
        .responsive-table {
          min-width: 620px;
        }
        .mobile-scroll-table {
          min-width: 720px;
        }
        .admin-list-table {
          min-width: 860px;
        }
        .admin-list-table th:first-child,
        .admin-list-table td:first-child {
          width: 44px;
        }
        .admin-list-table th:nth-child(2),
        .admin-list-table td:nth-child(2) {
          width: 72px;
        }
        .admin-list-table th:nth-child(4),
        .admin-list-table td:nth-child(4) {
          width: 220px;
        }
        .admin-list-table th:nth-child(5),
        .admin-list-table td:nth-child(5) {
          width: 120px;
        }
        .admin-list-table th:nth-child(6),
        .admin-list-table td:nth-child(6) {
          width: 140px;
        }
        .admin-list-table th:nth-child(7),
        .admin-list-table td:nth-child(7) {
          width: 110px;
        }
        .admin-list-table th:nth-child(8),
        .admin-list-table td:nth-child(8) {
          width: 98px;
        }
        .thumb-mini {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid var(--line);
          background: #e8edf1;
          display: block;
        }
        .row-title {
          display: grid;
          gap: 4px;
          min-width: 260px;
        }
        .row-title a {
          color: var(--ink);
          text-decoration: none;
          font-weight: 600;
          line-height: 1.5;
        }
        .status-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: #eef3f6;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.2;
          white-space: nowrap;
        }
        .sort-link {
          color: inherit;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sort-link.active {
          color: var(--ink);
        }
        .sort-link .arrow {
          font-size: 11px;
          opacity: 0.7;
        }
        .bulk-bar {
          display: grid;
          gap: 12px;
        }
        .bulk-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: end;
        }
        .bulk-controls > * {
          flex: 1 1 220px;
        }
        .checkbox-cell {
          display: flex;
          justify-content: center;
        }
        .checkbox-cell input,
        .select-all {
          width: 18px;
          height: 18px;
          min-height: 18px;
          padding: 0;
        }
        .table-cards {
          display: none;
          gap: 12px;
        }
        .table-card {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
          background: #fff;
        }
        .table-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .table-card-check {
          width: 18px;
          height: 18px;
          min-height: 18px;
          padding: 0;
          margin-top: 2px;
        }
        .table-card-image {
          display: block;
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #e8edf1;
          margin-bottom: 12px;
        }
        .table-card strong,
        .table-card span {
          display: block;
          line-height: 1.5;
        }
        .table-card strong {
          margin-bottom: 6px;
        }
        .table-card .status-chip {
          margin: 10px 0 6px;
        }
        .empty-state {
          border: 1px dashed var(--line);
          border-radius: 18px;
          padding: 18px;
          color: var(--muted);
          line-height: 1.6;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        th, td {
          padding: 12px 10px;
          border-bottom: 1px solid var(--line);
          text-align: left;
          vertical-align: top;
          line-height: 1.5;
        }
        th {
          color: var(--muted);
          font-weight: 700;
        }
        .small {
          font-size: 13px;
          color: var(--muted);
        }
        .detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
          gap: 18px;
        }
        .photo-stack {
          display: grid;
          gap: 12px;
        }
        .photo-stage {
          position: relative;
        }
        .hero-photo {
          display: block;
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 20px;
          border: 1px solid var(--line);
          background: #e8edf1;
          cursor: zoom-in;
        }
        .photo-main-button,
        .photo-thumb-button {
          display: block;
          width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }
        .photo-overlay-actions {
          position: absolute;
          right: 14px;
          bottom: 14px;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .photo-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 999px;
          background: rgba(23, 32, 42, 0.76);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(8px);
        }
        .photo-icon-button:hover {
          background: rgba(23, 32, 42, 0.9);
        }
        .photo-icon-button.photo-delete-button {
          background: rgba(163, 50, 42, 0.88);
          border-color: rgba(255, 255, 255, 0.18);
        }
        .thumb-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
          gap: 10px;
        }
        .thumb-item {
          position: relative;
        }
        .thumb-strip img {
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #e8edf1;
          cursor: zoom-in;
        }
        .thumb-item .photo-overlay-actions {
          right: 8px;
          bottom: 8px;
          gap: 6px;
        }
        .thumb-item .photo-icon-button {
          width: 34px;
          height: 34px;
        }
        .photo-modal-card {
          width: min(1080px, calc(100vw - 32px));
          max-height: calc(100vh - 32px);
          padding: 18px;
          display: grid;
          gap: 14px;
        }
        .photo-modal-stage {
          min-height: 0;
          overflow: auto;
          border-radius: 20px;
          background: #0f151d;
        }
        .photo-modal-image {
          display: block;
          width: 100%;
          height: auto;
          max-height: calc(100vh - 180px);
          object-fit: contain;
          margin: 0 auto;
        }
        .kv-list {
          display: grid;
          gap: 12px;
        }
        .kv-item {
          padding: 14px 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
        }
        .kv-item strong,
        .kv-item span {
          display: block;
          line-height: 1.5;
        }
        .kv-item strong {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 2px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .inline-form {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: end;
        }
        .inline-form > * {
          flex: 1 1 180px;
        }
        .detail-edit-grid {
          display: grid;
          gap: 16px;
        }
        .detail-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .detail-toolbar-left,
        .detail-toolbar-right {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .detail-mini-button {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          font-size: 14px;
        }
        .detail-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
        }
        .detail-header {
          display: grid;
          gap: 8px;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--line);
        }
        .detail-header-top {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 16px;
          align-items: baseline;
        }
        .detail-id {
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .detail-title {
          margin: 0;
          font-size: clamp(28px, 3vw, 36px);
          line-height: 1.12;
        }
        .detail-category-line {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.5;
        }
        .detail-category-line i {
          font-size: 17px;
          line-height: 1;
        }
        .detail-category-line strong {
          color: var(--ink);
          font-weight: 600;
        }
        .detail-stats {
          display: grid;
          gap: 6px;
        }
        .detail-stat {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 20px;
          padding: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }
        .detail-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          align-items: center;
        }
        .detail-stat i {
          font-size: 15px;
          line-height: 1;
          color: var(--muted);
        }
        .detail-edit-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .detail-edit-fields .full {
          grid-column: 1 / -1;
        }
        .detail-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .report-list {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }
        .report-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 14px 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
        }
        .report-meta {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .danger-zone {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid #efc8c0;
          border-radius: 18px;
          background: #fff8f7;
        }
        .danger-zone h3 {
          margin: 0 0 12px;
        }
        .dashboard-shell {
          display: grid;
          grid-template-columns: 248px minmax(0, 1fr);
          gap: 24px;
        }
        .dashboard-sidebar {
          display: grid;
          align-content: start;
          gap: 18px;
          padding-right: 8px;
        }
        .dashboard-nav {
          display: grid;
          gap: 6px;
        }
        .dashboard-nav a {
          min-height: 42px;
          padding: 0 12px;
          border-radius: 12px;
          color: var(--ink);
          text-decoration: none;
          display: flex;
          align-items: center;
          font-weight: 600;
        }
        .dashboard-nav a.active {
          background: #eef1f4;
        }
        .dashboard-sidebar-meta {
          display: grid;
          gap: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--line);
        }
        .dashboard-main {
          display: grid;
          gap: 22px;
        }
        .dashboard-header {
          display: grid;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--line);
        }
        .dashboard-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .dashboard-kpis {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .dashboard-kpi {
          padding: 14px 16px;
          border-right: 1px solid var(--line);
          background: transparent;
        }
        .dashboard-kpi:last-child {
          border-right: 0;
        }
        .dashboard-kpi strong {
          display: block;
          font-size: 28px;
          line-height: 1.1;
          margin-bottom: 4px;
        }
        .dashboard-kpi span {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .dashboard-section {
          display: grid;
          gap: 14px;
        }
        .dashboard-section-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--line);
        }
        .dashboard-section-header p {
          margin: 0;
        }
        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
        }
        .dashboard-table th,
        .dashboard-table td {
          padding: 12px 0;
          border-bottom: 1px solid var(--line);
          vertical-align: top;
        }
        .dashboard-table th {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--muted);
        }
        .dashboard-table td + td,
        .dashboard-table th + th {
          padding-left: 18px;
        }
        .dashboard-table a {
          color: var(--ink);
          text-decoration: none;
          font-weight: 600;
        }
        .dashboard-thumb {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid var(--line);
          background: #e8edf1;
          display: block;
        }
        .dashboard-mini-list {
          display: grid;
          gap: 10px;
        }
        .dashboard-mini-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 12px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
        }
        .dashboard-mini-row:last-child {
          border-bottom: 0;
        }
        .dashboard-muted-link {
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
        }
        .ops-page {
          display: grid;
          gap: 24px;
        }
        .ops-header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 16px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--line);
        }
        .ops-header-copy {
          max-width: 680px;
        }
        .ops-header h1 {
          font-size: clamp(28px, 3.4vw, 38px);
          margin-bottom: 8px;
        }
        .ops-header p {
          margin-bottom: 0;
        }
        .ops-toolbar {
          display: grid;
          gap: 12px;
          padding: 0 0 10px;
        }
        .ops-filters {
          display: grid;
          grid-template-columns: minmax(220px, 1.4fr) repeat(2, minmax(170px, 0.8fr)) auto;
          gap: 12px;
          align-items: end;
        }
        .ops-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: flex-start;
        }
        .ops-actions-left {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .ops-bulk {
          display: grid;
          grid-template-columns: minmax(220px, 320px) auto;
          gap: 10px;
          align-items: end;
          padding: 14px 0 18px;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .ops-surface {
          background: transparent;
          border: 0;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
        }
        .ops-table-wrap {
          overflow-x: auto;
        }
        .ops-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }
        .ops-table thead th {
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 0 12px 12px;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
          text-align: left;
          vertical-align: middle;
        }
        .ops-table tbody td {
          padding: 16px 12px;
          border-bottom: 1px solid rgba(219, 226, 232, 0.85);
          vertical-align: middle;
        }
        .ops-table tbody tr:hover {
          background: rgba(248, 250, 251, 0.9);
        }
        .ops-table th:first-child,
        .ops-table td:first-child {
          width: 44px;
        }
        .ops-table th:nth-child(2),
        .ops-table td:nth-child(2) {
          width: 72px;
        }
        .ops-table th:nth-child(3),
        .ops-table td:nth-child(3) {
          width: 34%;
        }
        .ops-table th:nth-child(4),
        .ops-table td:nth-child(4) {
          width: 22%;
        }
        .ops-table th:nth-child(5),
        .ops-table td:nth-child(5) {
          width: 112px;
        }
        .ops-table th:nth-child(6),
        .ops-table td:nth-child(6) {
          width: 124px;
        }
        .ops-table th:nth-child(7),
        .ops-table td:nth-child(7) {
          width: 104px;
        }
        .ops-checkbox {
          text-align: center;
          vertical-align: middle;
        }
        .ops-checkbox input {
          width: 18px;
          height: 18px;
          min-height: 18px;
          display: inline-block;
          margin: 0 auto;
          padding: 0;
        }
        .ops-thumb {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid var(--line);
          background: #e8edf1;
          display: block;
        }
        .ops-title {
          display: grid;
          gap: 6px;
          min-width: 0;
        }
        .ops-title a {
          color: var(--ink);
          text-decoration: none;
          font-weight: 600;
          line-height: 1.45;
        }
        .ops-title .small {
          line-height: 1.45;
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ops-sort {
          color: inherit;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ops-sort.active {
          color: var(--ink);
        }
        .ops-sort .arrow {
          font-size: 11px;
          opacity: 0.7;
        }
        .ops-row-link {
          color: var(--ink);
          text-decoration: none;
          font-weight: 600;
        }
        .ops-mobile-list {
          display: none;
        }
        .ops-mobile-item {
          display: grid;
          grid-template-columns: 44px 44px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          padding: 12px 0;
          border-top: 1px solid var(--line);
        }
        .ops-mobile-item:first-child {
          border-top: 0;
        }
        .ops-mobile-check-target {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ops-mobile-check {
          width: 18px;
          height: 18px;
          min-height: 18px;
          margin-top: 3px;
          padding: 0;
        }
        .ops-mobile-thumb {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid var(--line);
          background: #e8edf1;
          display: block;
        }
        .ops-mobile-body {
          display: grid;
          gap: 5px;
          min-width: 0;
        }
        .ops-mobile-body a {
          color: var(--ink);
          text-decoration: none;
          font-weight: 600;
          line-height: 1.35;
        }
        .ops-mobile-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ops-mobile-meta span,
        .ops-mobile-subline {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .ops-mobile-subline {
          display: block;
        }
        .ops-mobile-topline {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 10px;
        }
        .ops-mobile-date {
          white-space: nowrap;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }
        .ops-mobile-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 2px;
        }
        @media (max-width: 1120px) and (min-width: 769px) {
          .ops-table th:nth-child(6),
          .ops-table td:nth-child(6) {
            display: none;
          }
          .ops-table th:nth-child(3),
          .ops-table td:nth-child(3) {
            width: 40%;
          }
          .ops-table th:nth-child(4),
          .ops-table td:nth-child(4) {
            width: 24%;
          }
        }
        @media (max-width: 1050px) {
          .dashboard-shell {
            grid-template-columns: minmax(0, 1fr);
            gap: 20px;
          }
          .dashboard-sidebar {
            gap: 12px;
            min-width: 0;
            padding: 0 0 12px;
            border-bottom: 1px solid var(--line);
          }
          .dashboard-sidebar > div:first-child,
          .dashboard-sidebar-meta {
            display: none;
          }
          .dashboard-nav {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding-bottom: 4px;
          }
          .dashboard-nav a {
            flex: 0 0 auto;
            min-height: 44px;
            padding: 0 14px;
            border: 1px solid var(--line);
            background: #fff;
          }
          .dashboard-nav a.active {
            background: var(--accent-soft);
          }
          .dashboard-main {
            min-width: 0;
          }
        }
        @media (max-width: 900px) {
          .settings-preview-panel { width: 100%; }
        }
        @media (max-width: 768px) {
          .shell {
            padding: 14px 10px 30px;
          }
          .topbar {
            align-items: flex-start;
            flex-direction: column;
            padding: 0 0 16px;
          }
          .panel {
            padding: 18px 14px;
            border-radius: 18px;
          }
          .actions {
            align-items: stretch;
          }
          button, .button-link {
            width: 100%;
          }
          .ops-header {
            align-items: start;
            flex-direction: column;
          }
          .ops-toolbar {
            gap: 12px;
          }
          .ops-filters,
          .ops-bulk {
            grid-template-columns: 1fr;
          }
          .ops-actions {
            align-items: stretch;
            justify-content: start;
          }
          .ops-actions-left {
            width: 100%;
          }
          .ops-bulk {
            padding: 12px 0 16px;
          }
          .ops-table-wrap {
            display: none;
          }
          .ops-mobile-list {
            display: grid;
          }
          .quick-links,
          .card-grid,
          .detail-grid,
          .detail-edit-fields,
          .modal-layout,
          .dashboard-shell {
            grid-template-columns: 1fr;
          }
          .settings-layout,
          .settings-fields,
          .settings-brand-assets,
          .settings-color-grid,
          .settings-service-grid,
          .settings-coordinate-grid {
            grid-template-columns: 1fr;
          }
          .settings-preview-panel {
            position: static;
          }
          .modal-backdrop {
            padding: 12px;
          }
          .modal-card {
            padding: 16px;
            border-radius: 18px;
          }
          .toolbar-inline {
            align-items: stretch;
          }
          .dashboard-shell {
            gap: 16px;
          }
          .dashboard-sidebar {
            gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--line);
          }
          .dashboard-sidebar > div:first-child,
          .dashboard-sidebar-meta {
            display: none;
          }
          .dashboard-nav {
            display: flex;
            flex-wrap: nowrap;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 4px;
          }
          .dashboard-nav a {
            flex: 0 0 auto;
            min-height: 44px;
            padding: 0 14px;
            border: 1px solid var(--line);
            background: #fff;
          }
          .category-table thead {
            display: none;
          }
          .category-table,
          .category-table tbody,
          .category-table tr,
          .category-table td {
            display: block;
            width: 100%;
          }
          .category-table tr {
            padding: 14px 0;
            border-bottom: 1px solid var(--line);
          }
          .category-table td {
            padding: 0;
            border: 0;
          }
          .category-table td + td {
            padding-left: 0;
            margin-top: 8px;
          }
          .category-table td.metrics-cell {
            width: 100%;
          }
          .category-table td.metrics-cell::before,
          .category-table td.actions-cell::before {
            display: block;
            margin-bottom: 4px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .category-table td.metrics-cell[data-label]::before,
          .category-table td.actions-cell[data-label]::before {
            content: attr(data-label);
          }
          .category-actions {
            justify-content: flex-start;
          }
          .category-actions > * {
            flex: 1 1 calc(50% - 4px);
          }
          .icon-picker-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .detail-header-top,
          .detail-meta-row {
            gap: 8px 12px;
          }
          .detail-title {
            font-size: 32px;
          }
          .dashboard-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .dashboard-header-top {
            align-items: stretch;
            flex-direction: column;
          }
          .dashboard-header-top .button-link {
            width: 100%;
          }
          .dashboard-kpi:nth-child(2n) {
            border-right: 0;
          }
          .dashboard-kpi:last-child {
            border-right: 0;
          }
          .dashboard-table,
          .dashboard-table tbody,
          .dashboard-table tr,
          .dashboard-table td {
            display: block;
            width: 100%;
          }
          .dashboard-table thead {
            display: none;
          }
          .dashboard-table tr {
            padding: 14px 0;
            border-bottom: 1px solid var(--line);
          }
          .dashboard-table td,
          .dashboard-table td + td {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 5px 0;
            border: 0;
          }
          .dashboard-table td::before {
            content: attr(data-label);
            flex: 0 0 82px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .dashboard-sidebar {
            padding-right: 0;
          }
          .stat-card strong {
            font-size: 26px;
          }
          .responsive-table {
            display: none;
          }
          .table-cards {
            display: grid;
          }
          .bulk-controls > * {
            flex-basis: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <div class="topbar">
          <div>
            <div class="brand">Basura Cero Admin</div>
            <div class="meta">${currentAdmin ? `Sesion iniciada como <strong>${escapeHtml(currentAdmin.username)}</strong>` : 'Acceso de administracion'}</div>
          </div>
          ${currentAdmin ? `<form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${escapeAttr(csrfToken || '')}"><button class="button-ghost" type="submit">Cerrar sesion</button></form>` : ''}
        </div>
        <div class="panel">
          ${notice ? `<div class="notice${notice.type === 'error' ? ' error' : ''}" role="${notice.type === 'error' ? 'alert' : 'status'}" aria-live="polite">${escapeHtml(notice.message)}</div>` : ''}
          ${safeBody}
        </div>
      </div>
      <div class="sr-only" id="form-status" role="status" aria-live="polite"></div>
      <script>
        (() => {
          const status = document.getElementById('form-status');
          let lastModalTrigger = null;
          document.onclick = (event) => {
            const opener = event.target.closest('[data-open-delete-modal], [data-open-photo-modal], [data-open-category-create], [data-open-category-edit], [data-open-merge-modal]');
            if (opener) {
              lastModalTrigger = opener;
              window.setTimeout(() => {
                const modal = document.querySelector('.modal-backdrop.open');
                modal?.querySelector('button, input, select, textarea, a[href]')?.focus();
              }, 0);
              return;
            }
            const closer = event.target.closest('[data-close-delete-modal], [data-close-photo-modal], [data-close-modal]');
            if (closer && lastModalTrigger) {
              window.setTimeout(() => lastModalTrigger?.focus(), 0);
            }
          };
          document.onkeydown = (event) => {
            const modal = document.querySelector('.modal-backdrop.open');
            if (!modal) return;
            if (event.key === 'Escape') {
              event.preventDefault();
              modal.querySelector('[data-close-delete-modal], [data-close-photo-modal], [data-close-modal]')?.click();
              return;
            }
            if (event.key !== 'Tab') return;
            const focusable = Array.from(modal.getElementsByTagName('*')).filter((element) =>
              element.matches('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])') &&
              element.offsetParent !== null
            );
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          };
          Array.from(document.forms).forEach((form) => {
            form.onsubmit = (event) => {
              if (form.hasAttribute('data-confirm') && !window.confirm(form.dataset.confirm)) {
                event.preventDefault();
                return;
              }
              if (event.defaultPrevented || form.dataset.submitting === 'true') {
                if (form.dataset.submitting === 'true') event.preventDefault();
                return;
              }
              form.dataset.submitting = 'true';
              const submitter = event.submitter || form.querySelector('button[type="submit"]');
              if (submitter) {
                submitter.setAttribute('aria-disabled', 'true');
                submitter.dataset.originalLabel = submitter.textContent;
                submitter.textContent = submitter.dataset.loadingLabel || 'Procesando…';
              }
              if (status) status.textContent = 'Procesando la solicitud.';
            };
          });
        })();
      </script>
    </body>
  </html>`;
}

function renderLoginPage({ notice, csrfToken }) {
  return renderLayout({
    title: 'Acceso admin',
    notice,
    csrfToken,
    body: `
      <h1>Entrar al panel</h1>
      <p>Usa tu usuario y contraseña de administración. Si es el primer acceso, primero se te pedirá cambiar la contraseña temporal.</p>
      <form method="post" action="/admin/login">
        <label>Usuario
          <input name="username" autocomplete="username" required>
        </label>
        <label>Contraseña
          <input name="password" type="password" autocomplete="current-password" required>
        </label>
        <div class="actions">
          <button type="submit">Entrar</button>
        </div>
      </form>
    `
  });
}

function renderIncidenciaDetailPage({ currentAdmin, notice, incidencia, tipos, csrfToken }) {
  const images = incidencia.images || [];
  const solutionReports = incidencia.solutionReports || [];
  const inadequateReports = incidencia.inadequateReports || [];
  const statusOptions = ['activa', 'solucionada', 'spam']
    .map((estado) => `<option value="${estado}"${incidencia.estado === estado ? ' selected' : ''}>${escapeHtml(estado.charAt(0).toUpperCase() + estado.slice(1))}</option>`)
    .join('');

  return renderLayout({
    title: `Incidencia #${incidencia.id}`,
    currentAdmin,
    notice,
    csrfToken,
    body: `
      <section class="dashboard-shell">
        <aside class="dashboard-sidebar">
          <div>
            <div class="eyebrow">Admin</div>
            <h2 style="margin-bottom:8px">Panel de control</h2>
            <div class="small">Basura Cero</div>
          </div>
          <nav class="dashboard-nav">
            <a class="" href="/admin">Vista general</a>
            <a class="active" href="/admin/incidencias">Incidencias</a>
            <a class="" href="/admin/categorias">Categorias</a>
            <a class="" href="/admin/maintenance">Mantenimiento</a>
            <a class="" href="/admin/administradores">Administradores</a>
            <a class="" href="/admin/auditoria">Auditoria</a>
          </nav>
          <div class="dashboard-sidebar-meta">
            <div class="small">Sesion: ${escapeHtml(currentAdmin.username)}</div>
          </div>
        </aside>
        <div class="dashboard-main">
      <div class="detail-header">
        <div class="detail-header-top">
          <a class="detail-back-link" href="/admin/incidencias">
            <i class="mdi mdi-arrow-left" aria-hidden="true"></i>
            <span>Listado</span>
          </a>
          <span class="detail-id">#${incidencia.id}</span>
        </div>
        <h2 class="detail-title">${escapeHtml(incidencia.descripcion || 'Sin descripcion')}</h2>
        <div class="detail-category-line">
          <i class="mdi ${escapeAttr(normalizeTipoIcon(incidencia.tipo_icono || DEFAULT_TIPO_ICON))}" aria-hidden="true"></i>
          <span>${escapeHtml(incidencia.tipo || 'Sin categoria')}</span>
        </div>
        <div class="detail-stats">
          <div class="detail-meta-row">
            <span class="detail-stat"><i class="mdi mdi-calendar" aria-hidden="true"></i>${formatDate(incidencia.fecha)}</span>
            <span class="detail-stat"><i class="mdi mdi-map-marker" aria-hidden="true"></i>${escapeHtml(incidencia.barrio || 'Sin barrio')}</span>
            <span class="detail-stat"><i class="mdi mdi-check-decagram-outline" aria-hidden="true"></i>${escapeHtml(incidencia.estado || 'Sin estado')}</span>
            <span class="detail-stat"><i class="mdi mdi-check-circle-outline" aria-hidden="true"></i>${incidencia.reportes_solucion || 0}</span>
            <span class="detail-stat"><i class="mdi mdi-alert-circle-outline" aria-hidden="true"></i>${incidencia.reportes_inadecuado || 0}</span>
          </div>
        </div>
      </div>
      <section class="detail-grid" style="margin-bottom:18px">
        <div class="subtle-panel photo-stack">
          <h2>Fotos</h2>
          ${images.length
            ? `
              <div class="photo-stage">
                <button type="button" class="photo-main-button" data-open-photo-modal="${images[0].id}" aria-label="Ver foto principal en grande">
                  <img class="hero-photo" src="${escapeAttr(images[0].url)}" alt="Imagen principal de la incidencia ${incidencia.id}">
                </button>
                <div class="photo-overlay-actions">
                  <button type="button" class="photo-icon-button" data-open-photo-modal="${images[0].id}" aria-label="Ampliar foto principal">
                    <i class="mdi mdi-magnify-plus-outline" aria-hidden="true"></i>
                  </button>
                  <form method="post" action="/admin/incidencias/${incidencia.id}/imagenes/${images[0].id}/delete" data-photo-delete>
                    <button type="submit" class="photo-icon-button photo-delete-button" aria-label="Borrar foto principal">
                      <i class="mdi mdi-trash-can-outline" aria-hidden="true"></i>
                    </button>
                  </form>
                </div>
              </div>
              ${images.length > 1
                ? `<div class="thumb-strip">${images.slice(1).map((image, index) => `
                    <div class="thumb-item">
                      <button type="button" class="photo-thumb-button" data-open-photo-modal="${image.id}" aria-label="Ver foto ${index + 2} en grande">
                        <img src="${escapeAttr(image.url)}" alt="Imagen ${index + 2} de la incidencia ${incidencia.id}">
                      </button>
                      <div class="photo-overlay-actions">
                        <button type="button" class="photo-icon-button" data-open-photo-modal="${image.id}" aria-label="Ampliar foto ${index + 2}">
                          <i class="mdi mdi-magnify-plus-outline" aria-hidden="true"></i>
                        </button>
                        <form method="post" action="/admin/incidencias/${incidencia.id}/imagenes/${image.id}/delete" data-photo-delete>
                          <button type="submit" class="photo-icon-button photo-delete-button" aria-label="Borrar foto ${index + 2}">
                            <i class="mdi mdi-trash-can-outline" aria-hidden="true"></i>
                          </button>
                        </form>
                      </div>
                    </div>
                  `).join('')}</div>`
                : ''}
            `
            : '<div class="empty-state">No hay imagenes asociadas a esta incidencia.</div>'}
        </div>
        <div class="subtle-panel">
          <h2>Editar incidencia</h2>
          <form method="post" action="/admin/incidencias/${incidencia.id}" class="detail-edit-grid">
            <div class="detail-edit-fields">
              <label class="full">Descripcion
                <textarea name="descripcion" required>${escapeHtml(incidencia.descripcion || '')}</textarea>
              </label>
              <label>Categoria
                ${renderTipoSelect({
                  name: 'tipoId',
                  tipos,
                  selectedValue: incidencia.tipo_id,
                  id: `incidencia-tipo-${incidencia.id}`,
                  required: true
                })}
              </label>
              <label>Estado
                <select name="estado" required>${statusOptions}</select>
              </label>
              <label>Nombre de contacto
                <input name="nombre" value="${escapeAttr(incidencia.nombre || '')}" placeholder="Opcional">
              </label>
              <label>Fecha
                <input name="fecha" type="date" value="${escapeAttr(formatDateInput(incidencia.fecha))}" required>
              </label>
              <label>Barrio
                <input name="barrio" value="${escapeAttr(incidencia.barrio || '')}" placeholder="Opcional">
              </label>
              <label class="full">Direccion
                <textarea name="direccion">${escapeHtml(incidencia.direccion || '')}</textarea>
              </label>
            </div>
            <div class="detail-actions">
              <button type="submit">Guardar cambios</button>
            </div>
          </form>
          ${incidencia.reportes_solucion
            ? `
              <form method="post" action="/admin/incidencias/${incidencia.id}/clear-solution-reports" style="margin-top:10px" data-confirm="Se eliminaran los reportes de solucion y la incidencia se reabrira si estaba solucionada. ¿Continuar?">
                <button class="button-ghost detail-mini-button" type="submit">Limpiar solucion</button>
              </form>
            `
            : ''}
          <div class="kv-list" style="margin-top:18px">
            <div class="kv-item"><strong>Coords</strong><span>${incidencia.latitud != null && incidencia.longitud != null ? `${escapeHtml(incidencia.latitud)}, ${escapeHtml(incidencia.longitud)}` : '-'}</span></div>
          </div>
          <div class="detail-actions" style="margin-top:18px">
            <button type="button" class="button-ghost detail-mini-button" data-open-delete-modal style="color: var(--danger); border-color: #efc8c0;">Eliminar incidencia</button>
          </div>
        </div>
      </section>
      <section class="grid two">
        <div class="subtle-panel">
          <h2>Reportes de solucion</h2>
          ${solutionReports.length
            ? `
              <div class="report-list">
                ${solutionReports.map((report) => `
                  <div class="report-row">
                    <div class="report-meta">
                      <strong>${escapeHtml(report.usuario || 'Sin usuario')}</strong>
                      <span class="small">${formatDate(report.fecha)} · ${escapeHtml(report.ip || 'Sin IP')}</span>
                    </div>
                    <form method="post" action="/admin/incidencias/${incidencia.id}/reportes-solucion/${report.id}/delete" data-confirm="Este reporte de solucion se eliminara definitivamente. ¿Continuar?">
                      <button class="button-ghost detail-mini-button" type="submit">Borrar</button>
                    </form>
                  </div>
                `).join('')}
              </div>
            `
            : '<div class="empty-state">No hay reportes de solucion asociados.</div>'}
        </div>
        <div class="subtle-panel">
          <h2>Reportes inadecuados</h2>
          ${inadequateReports.length
            ? `
              <div class="report-list">
                ${inadequateReports.map((report) => `
                  <div class="report-row">
                    <div class="report-meta">
                      <strong>Reporte #${report.id}</strong>
                      <span class="small">${formatDate(report.fecha)} · ${escapeHtml(report.ip || 'Sin IP')}</span>
                    </div>
                    <form method="post" action="/admin/incidencias/${incidencia.id}/reportes-inadecuados/${report.id}/delete" data-confirm="Este reporte inadecuado se eliminara definitivamente. ¿Continuar?">
                      <button class="button-ghost detail-mini-button" type="submit">Borrar</button>
                    </form>
                  </div>
                `).join('')}
              </div>
            `
            : '<div class="empty-state">No hay reportes inadecuados asociados.</div>'}
        </div>
      </section>
      <div class="modal-backdrop" id="delete-incidencia-modal" aria-hidden="true">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-incidencia-title">
          <div class="modal-header">
            <div>
              <h2 id="delete-incidencia-title">Eliminar incidencia</h2>
            </div>
            <button type="button" class="button-ghost modal-close" data-close-delete-modal>Cerrar</button>
          </div>
          <form method="post" action="/admin/incidencias/${incidencia.id}/delete">
            <label>Confirmacion
              <input name="confirmationText" placeholder="ELIMINAR" required>
            </label>
            <div class="detail-actions" style="margin-top:18px">
              <button type="submit" style="background: var(--danger)">Eliminar incidencia</button>
              <button type="button" class="button-ghost" data-close-delete-modal>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
      <div class="modal-backdrop" id="photo-preview-modal" aria-hidden="true">
        <div class="modal-card photo-modal-card" role="dialog" aria-modal="true" aria-labelledby="photo-preview-title">
          <div class="modal-header">
            <div>
              <h2 id="photo-preview-title">Foto</h2>
            </div>
            <button type="button" class="button-ghost modal-close" data-close-photo-modal>Cerrar</button>
          </div>
          <div class="photo-modal-stage">
            <img class="photo-modal-image" id="photo-preview-image" src="" alt="Vista ampliada de la foto de la incidencia">
          </div>
          <div class="detail-actions">
            <form method="post" id="photo-delete-form" action="" data-photo-delete>
              <button type="submit" class="button-ghost detail-mini-button" style="color: var(--danger); border-color: #efc8c0;">Borrar foto</button>
            </form>
          </div>
        </div>
      </div>
      <script>
        (() => {
          const deleteModal = document.getElementById('delete-incidencia-modal');
          const openDelete = document.querySelector('[data-open-delete-modal]');
          const closeDeleteButtons = document.querySelectorAll('[data-close-delete-modal]');
          const photoModal = document.getElementById('photo-preview-modal');
          const photoPreviewImage = document.getElementById('photo-preview-image');
          const photoDeleteForm = document.getElementById('photo-delete-form');
          const closePhotoButtons = document.querySelectorAll('[data-close-photo-modal]');
          const photoButtons = document.querySelectorAll('[data-open-photo-modal]');
          const deleteForms = document.querySelectorAll('form[data-photo-delete]');
          const photoMap = ${JSON.stringify(images.reduce((acc, image) => {
            acc[image.id] = {
              url: image.url,
              deleteAction: `/admin/incidencias/${incidencia.id}/imagenes/${image.id}/delete`
            };
            return acc;
          }, {}))};
          const openModal = () => {
            if (!deleteModal) return;
            deleteModal.classList.add('open');
            deleteModal.setAttribute('aria-hidden', 'false');
          };
          const closeModal = () => {
            if (!deleteModal) return;
            deleteModal.classList.remove('open');
            deleteModal.setAttribute('aria-hidden', 'true');
          };
          const openPhotoModal = (imageId) => {
            const image = photoMap[String(imageId)];
            if (!photoModal || !image || !photoPreviewImage || !photoDeleteForm) return;
            photoPreviewImage.src = image.url;
            photoDeleteForm.action = image.deleteAction;
            photoModal.classList.add('open');
            photoModal.setAttribute('aria-hidden', 'false');
          };
          const closePhotoModal = () => {
            if (!photoModal || !photoPreviewImage || !photoDeleteForm) return;
            photoModal.classList.remove('open');
            photoModal.setAttribute('aria-hidden', 'true');
            photoPreviewImage.src = '';
            photoDeleteForm.action = '';
          };
          openDelete?.addEventListener('click', openModal);
          closeDeleteButtons.forEach((button) => button.addEventListener('click', closeModal));
          photoButtons.forEach((button) => {
            button.addEventListener('click', () => openPhotoModal(button.getAttribute('data-open-photo-modal')));
          });
          closePhotoButtons.forEach((button) => button.addEventListener('click', closePhotoModal));
          deleteModal?.addEventListener('click', (event) => {
            if (event.target === deleteModal) {
              closeModal();
            }
          });
          photoModal?.addEventListener('click', (event) => {
            if (event.target === photoModal) {
              closePhotoModal();
            }
          });
          deleteForms.forEach((form) => {
            form.addEventListener('submit', (event) => {
              const confirmed = window.confirm('Esta foto se borrara definitivamente.');
              if (!confirmed) {
                event.preventDefault();
              }
            });
          });
        })();
      </script>
      ${renderTipoSelectScript()}
        </div>
      </section>
    `
  });
}

function renderIncidenciasListPage({ currentAdmin, notice, incidencias, tipos, filters, csrfToken }) {
  const buildSortUrl = (sortBy) => {
    const nextDir = filters.sortBy === sortBy && filters.sortDir === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.estado) params.set('estado', filters.estado);
    if (filters.tipoId) params.set('tipoId', filters.tipoId);
    params.set('sortBy', sortBy);
    params.set('sortDir', nextDir);
    return `/admin/incidencias?${params.toString()}`;
  };
  const sortIndicator = (sortBy) => {
    if (filters.sortBy !== sortBy) return '<span class="arrow">↕</span>';
    return `<span class="arrow">${filters.sortDir === 'asc' ? '↑' : '↓'}</span>`;
  };

  const rows = incidencias.length
    ? incidencias.map((incidencia) => `
      <tr>
        <td class="ops-checkbox"><input type="checkbox" class="row-check" name="selectedIds" value="${incidencia.id}"></td>
        <td>${incidencia.imageUrl ? `<a href="/admin/incidencias/${incidencia.id}"><img class="ops-thumb" src="${escapeAttr(incidencia.imageUrl)}" alt="Foto de la incidencia ${incidencia.id}"></a>` : '<div class="ops-thumb"></div>'}</td>
        <td>
          <div class="ops-title">
            <a href="/admin/incidencias/${incidencia.id}">${escapeHtml(incidencia.descripcion || 'Sin descripcion')}</a>
            <span class="small">${escapeHtml(incidencia.direccion || incidencia.barrio || 'Sin ubicacion')}</span>
          </div>
        </td>
        <td>${renderTipoBadge(incidencia.tipo, incidencia.tipo_icono, true)}</td>
        <td><span class="status-chip">${escapeHtml(incidencia.estado || 'Sin estado')}</span></td>
        <td>${escapeHtml(incidencia.barrio || 'Sin barrio')}</td>
        <td>${formatDate(incidencia.fecha)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="7">No hay incidencias que coincidan con los filtros actuales.</td></tr>';

  const cards = incidencias.length
    ? incidencias.map((incidencia) => `
      <article class="ops-mobile-item">
        <label class="ops-mobile-check-target" aria-label="Seleccionar incidencia ${incidencia.id}">
          <input class="ops-mobile-check" type="checkbox" name="selectedIds" value="${incidencia.id}">
        </label>
        ${incidencia.imageUrl ? `<img class="ops-mobile-thumb" src="${escapeAttr(incidencia.imageUrl)}" alt="Foto de la incidencia ${incidencia.id}">` : '<div class="ops-mobile-thumb"></div>'}
        <div class="ops-mobile-body">
          <div class="ops-mobile-topline">
            <a href="/admin/incidencias/${incidencia.id}">${escapeHtml(incidencia.descripcion || 'Sin descripcion')}</a>
            <span class="ops-mobile-date">${formatDate(incidencia.fecha)}</span>
          </div>
          <div class="ops-mobile-meta">
            <span>${renderTipoBadge(incidencia.tipo, incidencia.tipo_icono, true)}</span>
            <span class="status-chip">${escapeHtml(incidencia.estado || 'Sin estado')}</span>
          </div>
          <span class="ops-mobile-subline">${escapeHtml(incidencia.direccion || incidencia.barrio || 'Sin ubicacion')}</span>
          <div class="ops-mobile-actions">
            <span class="ops-mobile-subline">${escapeHtml(incidencia.barrio || 'Sin barrio')}</span>
            <a class="ops-row-link" href="/admin/incidencias/${incidencia.id}">Ver ficha</a>
          </div>
        </div>
      </article>
    `).join('')
    : '<div class="empty-state">No hay incidencias que coincidan con los filtros actuales.</div>';

  return renderAdminSectionLayout({
    title: 'Incidencias',
    currentAdmin,
    notice,
    csrfToken,
    eyebrow: 'Incidencias',
    intro: null,
    activeNav: 'incidencias',
    content: `
      <div class="ops-page">
        <form method="get" action="/admin/incidencias" class="ops-toolbar">
          <div class="ops-filters">
            <label>Buscar
              <input name="search" value="${escapeAttr(filters.search || '')}" placeholder="Descripcion, direccion o barrio">
            </label>
            <label>Estado
              <select name="estado">
                <option value="">Todos</option>
                <option value="activa"${filters.estado === 'activa' ? ' selected' : ''}>Activa</option>
                <option value="solucionada"${filters.estado === 'solucionada' ? ' selected' : ''}>Solucionada</option>
                <option value="spam"${filters.estado === 'spam' ? ' selected' : ''}>Spam</option>
              </select>
            </label>
            <label>Categoria
              ${renderTipoSelect({
                name: 'tipoId',
                tipos,
                selectedValue: filters.tipoId || '',
                id: 'incidencias-filter-tipo',
                includeEmptyOption: 'Todas'
              })}
            </label>
            <button type="submit">Aplicar filtros</button>
          </div>
          <div class="ops-actions">
            <div class="ops-actions-left">
              <a class="button-link button-ghost" href="/admin/incidencias">Limpiar filtros</a>
            </div>
          </div>
        </form>
        <section class="ops-surface">
          <form method="post" action="/admin/incidencias/bulk" class="bulk-bar" data-bulk-form>
            <div class="ops-bulk">
              <label>Accion masiva
                <select name="bulkAction" required>
                  <option value="">Selecciona una accion</option>
                  <option value="solucionada">Marcar como solucionadas</option>
                  <option value="activa">Reabrir como activas</option>
                  <option value="spam">Marcar como spam</option>
                  <option value="changeTipo">Cambiar categoria</option>
                  <option value="clearSolutionReports">Limpiar reportes de solucion</option>
                </select>
              </label>
              <label data-bulk-tipo-wrap hidden aria-hidden="true">Cambiar a categoria
                ${renderTipoSelect({
                  name: 'bulkTipoId',
                  tipos,
                  selectedValue: '',
                  id: 'incidencias-bulk-tipo',
                  includeEmptyOption: 'Selecciona una categoria'
                })}
              </label>
              <button type="submit">Aplicar a seleccionadas</button>
            </div>
            <div class="ops-table-wrap">
              <table class="responsive-table admin-list-table ops-table">
                <thead>
                  <tr>
                    <th><input class="select-all" type="checkbox" aria-label="Seleccionar todas"></th>
                    <th>Foto</th>
                    <th>Incidencia</th>
                    <th><a class="ops-sort${filters.sortBy === 'tipo' ? ' active' : ''}" href="${buildSortUrl('tipo')}">Categoria ${sortIndicator('tipo')}</a></th>
                    <th><a class="ops-sort${filters.sortBy === 'estado' ? ' active' : ''}" href="${buildSortUrl('estado')}">Estado ${sortIndicator('estado')}</a></th>
                    <th><a class="ops-sort${filters.sortBy === 'barrio' ? ' active' : ''}" href="${buildSortUrl('barrio')}">Barrio ${sortIndicator('barrio')}</a></th>
                    <th><a class="ops-sort${filters.sortBy === 'fecha' ? ' active' : ''}" href="${buildSortUrl('fecha')}">Fecha ${sortIndicator('fecha')}</a></th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
            <div class="ops-mobile-list">${cards}</div>
          </form>
        </section>
      </div>
      <script>
        (() => {
          const selectAll = document.querySelector('.select-all');
          const rowChecks = Array.from(document.querySelectorAll('input[name="selectedIds"]'));
          const bulkAction = document.querySelector('select[name="bulkAction"]');
          const bulkTipoWrap = document.querySelector('[data-bulk-tipo-wrap]');
          const bulkTipoSelect = bulkTipoWrap?.querySelector('select[name="bulkTipoId"]');

          const syncBulkTipoVisibility = () => {
            if (!bulkAction || !bulkTipoWrap || !bulkTipoSelect) return;
            const needsTipo = bulkAction.value === 'changeTipo';
            bulkTipoWrap.hidden = !needsTipo;
            bulkTipoWrap.setAttribute('aria-hidden', needsTipo ? 'false' : 'true');
            bulkTipoSelect.disabled = !needsTipo;
            bulkTipoSelect.required = needsTipo;
            if (!needsTipo) {
              bulkTipoSelect.value = '';
            }
          };

          if (selectAll && rowChecks.length) {
            selectAll.addEventListener('change', () => {
              rowChecks.forEach((checkbox) => {
                checkbox.checked = selectAll.checked;
              });
            });
          }

          if (bulkAction) {
            bulkAction.addEventListener('change', syncBulkTipoVisibility);
            syncBulkTipoVisibility();
          }

          const bulkForm = document.querySelector('[data-bulk-form]');
          bulkForm?.addEventListener('submit', (event) => {
            const selectedCount = rowChecks.filter((checkbox) => checkbox.checked).length;
            if (!selectedCount || !bulkAction?.value) return;
            const actionLabel = bulkAction.options[bulkAction.selectedIndex]?.text || 'la accion seleccionada';
            const confirmation = 'Se aplicara "' + actionLabel + '" a ' + selectedCount +
              ' incidencia' + (selectedCount === 1 ? '' : 's') + '. ¿Continuar?';
            if (!window.confirm(confirmation)) {
              event.preventDefault();
            }
          });
        })();
      </script>
      ${renderTipoSelectScript()}
    `
  });
}

function renderChangePasswordPage({ currentAdmin, notice, minLength, csrfToken }) {
  return renderLayout({
    title: 'Cambiar contraseña',
    currentAdmin,
    notice,
    csrfToken,
    body: `
      <h1>Cambiar contraseña</h1>
      <p>${currentAdmin.mustChangePassword
    ? 'Necesitas establecer una contraseña nueva antes de usar el panel.'
    : 'Introduce una contraseña nueva para actualizar tus credenciales.'} Usa al menos ${minLength} caracteres.</p>
      <form method="post" action="/admin/change-password">
        <label>Nueva contraseña
          <input name="password" type="password" autocomplete="new-password" minlength="${minLength}" required>
        </label>
        <label>Repite la nueva contraseña
          <input name="passwordConfirm" type="password" autocomplete="new-password" minlength="${minLength}" required>
        </label>
        <div class="actions">
          <button type="submit">Guardar contraseña</button>
          <a class="button-link button-ghost" href="/admin">Volver</a>
        </div>
      </form>
    `
  });
}

function renderDashboardPage({ currentAdmin, notice, dashboard, csrfToken }) {
  const { stats, recentWithPhoto, byTipo } = dashboard;
  const recentRows = recentWithPhoto.length
    ? recentWithPhoto.map((item) => `
      <tr>
        <td data-label="Foto">${item.imageUrl ? `<img class="dashboard-thumb" src="${escapeAttr(item.imageUrl)}" alt="Foto de la incidencia ${item.id}">` : '<div class="dashboard-thumb"></div>'}</td>
        <td data-label="Incidencia"><a href="/admin/incidencias/${item.id}">${escapeHtml(item.descripcion || `Incidencia #${item.id}`)}</a></td>
        <td data-label="Categoria">${renderTipoBadge(item.tipo || '-', item.tipo_icono, true)}</td>
        <td data-label="Estado"><span class="status-chip">${escapeHtml(item.estado || '-')}</span></td>
        <td data-label="Zona">${escapeHtml(item.barrio || item.direccion || '-')}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5">Todavia no hay incidencias recientes disponibles.</td></tr>';
  const tipoRows = byTipo.length
    ? byTipo.map((tipo) => `
      <div class="dashboard-mini-row">
        <strong>${renderTipoBadge(tipo.nombre, tipo.icono, true)}</strong>
        <span class="small">${tipo.activas || 0} activas</span>
        <span class="small">${tipo.total} total</span>
      </div>
    `).join('')
    : '<div class="empty-state">Todavia no hay datos por categoria.</div>';

  return renderLayout({
    title: 'Panel de administracion',
    currentAdmin,
    notice,
    csrfToken,
    body: `
      <section class="dashboard-shell">
        <aside class="dashboard-sidebar">
          <div>
            <div class="eyebrow">Admin</div>
            <h2 style="margin-bottom:8px">Panel de control</h2>
            <div class="small">Basura Cero</div>
          </div>
          <nav class="dashboard-nav">
            <a class="active" href="/admin">Vista general</a>
            <a href="/admin/incidencias">Incidencias</a>
            <a href="/admin/categorias">Categorias</a>
            <a href="/admin/maintenance">Mantenimiento</a>
            <a href="/admin/configuracion">Configuración</a>
            <a href="/admin/administradores">Administradores</a>
            <a href="/admin/auditoria">Auditoria</a>
          </nav>
          <div class="dashboard-sidebar-meta">
            <div class="small">Sesion: ${escapeHtml(currentAdmin.username)}</div>
            <a class="dashboard-muted-link" href="/admin/incidencias">Ver listado completo</a>
          </div>
        </aside>
        <div class="dashboard-main">
          <section class="dashboard-header">
            <div class="dashboard-header-top">
              <div>
                <div class="eyebrow">Vista general</div>
                <h1>Panel de control</h1>
              </div>
              <a class="button-link" href="/admin/incidencias?estado=activa">Revisar incidencias</a>
            </div>
          </section>

          <section class="dashboard-kpis" aria-label="Metricas principales">
            <div class="dashboard-kpi"><strong>${stats.total}</strong><span>Total</span></div>
            <div class="dashboard-kpi"><strong>${stats.activas}</strong><span>Activas</span></div>
            <div class="dashboard-kpi"><strong>${stats.pendientesRevision}</strong><span>Por revisar</span></div>
            <div class="dashboard-kpi"><strong>${stats.solucionadas}</strong><span>Solucionadas</span></div>
            <div class="dashboard-kpi"><strong>${stats.spam}</strong><span>Spam</span></div>
          </section>

          <section class="dashboard-section">
            <div class="dashboard-section-header">
              <div>
                <h2 style="margin-bottom:6px">Incidencias recientes</h2>
                <p class="small">Acceso rapido a los ultimos avisos.</p>
              </div>
              <a class="dashboard-muted-link" href="/admin/incidencias">Ver todas</a>
            </div>
            <table class="dashboard-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Incidencia</th>
                  <th>Categoria</th>
                  <th>Estado</th>
                  <th>Zona</th>
                </tr>
              </thead>
              <tbody>${recentRows}</tbody>
            </table>
          </section>

          <section class="grid two">
            <div class="dashboard-section">
              <div class="dashboard-section-header">
                    <div>
                      <h2 style="margin-bottom:6px">Categorias</h2>
                      <p class="small">Donde se concentra la carga.</p>
                    </div>
                    <a class="dashboard-muted-link" href="/admin/categorias">Gestionar</a>
                  </div>
              <div class="dashboard-mini-list">${tipoRows}</div>
            </div>
            <div class="dashboard-section">
              <div class="dashboard-section-header">
                <div>
                  <h2 style="margin-bottom:6px">Atajos</h2>
                  <p class="small">Tareas frecuentes.</p>
                </div>
              </div>
              <div class="dashboard-mini-list">
                <div class="dashboard-mini-row">
                  <strong>Incidencias</strong>
                  <span class="small">Filtros y estados</span>
                  <a class="dashboard-muted-link" href="/admin/incidencias">Abrir</a>
                </div>
                <div class="dashboard-mini-row">
                  <strong>Mantenimiento</strong>
                  <span class="small">Revision y limpieza</span>
                  <a class="dashboard-muted-link" href="/admin/maintenance">Abrir</a>
                </div>
                    <div class="dashboard-mini-row">
                      <strong>Administradores</strong>
                      <span class="small">Accesos</span>
                      <a class="dashboard-muted-link" href="/admin/administradores">Abrir</a>
                    </div>
                  </div>
                </div>
              </section>
        </div>
      </section>
    `
  });
}

function renderAdminSectionLayout({ currentAdmin, notice, title, eyebrow, intro, activeNav, content, csrfToken }) {
  const navItem = (href, label, key) => `<a class="${activeNav === key ? 'active' : ''}" href="${href}">${label}</a>`;
  return renderLayout({
    title,
    currentAdmin,
    notice,
    csrfToken,
    body: `
      <section class="dashboard-shell">
        <aside class="dashboard-sidebar">
          <div>
            <div class="eyebrow">Admin</div>
            <h2 style="margin-bottom:8px">Panel de control</h2>
            <div class="small">Basura Cero</div>
          </div>
          <nav class="dashboard-nav">
            ${navItem('/admin', 'Vista general', 'dashboard')}
            ${navItem('/admin/incidencias', 'Incidencias', 'incidencias')}
            ${navItem('/admin/categorias', 'Categorias', 'categorias')}
            ${navItem('/admin/maintenance', 'Mantenimiento', 'maintenance')}
            ${navItem('/admin/configuracion', 'Configuración', 'configuracion')}
            ${navItem('/admin/administradores', 'Administradores', 'administradores')}
            ${navItem('/admin/auditoria', 'Auditoria', 'auditoria')}
          </nav>
          <div class="dashboard-sidebar-meta">
            <div class="small">Sesion: ${escapeHtml(currentAdmin.username)}</div>
          </div>
        </aside>
        <div class="dashboard-main">
          <section class="dashboard-header">
            <div class="dashboard-header-top">
              <div>
                <div class="eyebrow">${escapeHtml(eyebrow)}</div>
                <h1>${escapeHtml(title)}</h1>
              </div>
            </div>
            ${intro ? `<p class="small">${escapeHtml(intro)}</p>` : ''}
          </section>
          ${content}
        </div>
      </section>
    `
  });
}

function renderSettingsPage({ currentAdmin, notice, settings, csrfToken }) {
  const field = (key, label, options = {}) => `
    <label class="${options.wide ? 'field-wide' : ''}">${escapeHtml(label)}
      ${options.textarea
    ? `<textarea name="${key}" maxlength="${options.maxLength || 240}" rows="3" ${options.required === false ? '' : 'required'}>${escapeHtml(settings[key])}</textarea>`
    : `<input name="${key}" type="${options.type || 'text'}" value="${escapeAttr(settings[key])}" ${options.maxLength ? `maxlength="${options.maxLength}"` : ''} ${options.required === false ? '' : 'required'}>`}
    </label>`;
  const colorField = (key, label) => `
    <label>${escapeHtml(label)}
      <input type="color" name="${key}" value="${escapeAttr(settings[key])}" data-settings-color="${key}">
    </label>`;
  const selectField = (key, label, options) => `
    <label>${escapeHtml(label)}
      <select name="${key}">${options.map(([value, text]) => `<option value="${escapeAttr(value)}" ${settings[key] === value ? 'selected' : ''}>${escapeHtml(text)}</option>`).join('')}</select>
    </label>`;

  return renderAdminSectionLayout({
    currentAdmin,
    notice,
    csrfToken,
    title: 'Configuración',
    eyebrow: 'Sitio público',
    intro: 'Personaliza cómo se presenta y funciona el sitio público.',
    activeNav: 'configuracion',
    content: `
      <link rel="stylesheet" href="/admin-assets/leaflet/leaflet.css">
      <form method="post" action="/admin/configuracion" class="settings-layout" id="settings-form">
        <div class="settings-form">
          <section class="settings-section">
            <div>
              <h2>Identidad</h2>
              <p class="small">Estos datos aparecen en la cabecera, al compartir enlaces y al instalar la aplicación.</p>
            </div>
            <div class="settings-preview-panel" aria-label="Vista previa de la cabecera pública">
              <div class="eyebrow">Cabecera pública</div>
              <div class="settings-preview-header" id="settings-preview-header">
                <div class="settings-preview-header-logo" aria-hidden="true">
                  <img id="settings-preview-logo" src="${escapeAttr(settings.APP_LOGO_PATH)}" alt="">
                </div>
                <div class="settings-preview-header-copy">
                  <strong class="settings-preview-header-name" id="settings-preview-name">${escapeHtml(settings.APP_NAME)}</strong>
                  <span class="settings-preview-header-subtitle" id="settings-preview-subtitle">${escapeHtml(settings.APP_SUBTITLE)}</span>
                </div>
                <div class="settings-preview-header-menu" aria-hidden="true"><i class="mdi mdi-menu"></i></div>
              </div>
            </div>
            <div class="settings-fields">
              ${field('APP_NAME', 'Nombre', { maxLength: 80 })}
              ${field('APP_SUBTITLE', 'Subtítulo', { maxLength: 80, required: false })}
              ${field('APP_DESCRIPTION', 'Descripción', { textarea: true, maxLength: 240, wide: true })}
            </div>
            <input type="hidden" name="APP_LOGO_PATH" value="${escapeAttr(settings.APP_LOGO_PATH)}">
            <input type="hidden" name="APP_FAVICON_PATH" value="${escapeAttr(settings.APP_FAVICON_PATH)}">
            <div class="settings-brand-assets">
              <div class="settings-brand-asset">
                <img id="settings-logo-current" src="${escapeAttr(settings.APP_LOGO_PATH)}" alt="Logotipo actual">
                <div class="settings-brand-asset-content">
                  <strong>Logotipo</strong>
                  <p class="small">PNG, JPG o WebP. Máximo 2 MB.</p>
                  <button type="button" class="button-ghost settings-upload-button" data-brand-choose="logo">Subir logotipo</button>
                  <input type="file" hidden accept="image/png,image/jpeg,image/webp" data-brand-input="logo">
                  <span class="small settings-upload-status" data-brand-status="logo" role="status"></span>
                </div>
              </div>
              <div class="settings-brand-asset">
                <img id="settings-favicon-current" src="${escapeAttr(settings.APP_FAVICON_PATH)}" alt="Icono actual">
                <div class="settings-brand-asset-content">
                  <strong>Icono de la aplicación</strong>
                  <p class="small">Recomendado: imagen cuadrada de 512 × 512 px.</p>
                  <button type="button" class="button-ghost settings-upload-button" data-brand-choose="favicon">Subir icono</button>
                  <input type="file" hidden accept="image/png,image/jpeg,image/webp" data-brand-input="favicon">
                  <span class="small settings-upload-status" data-brand-status="favicon" role="status"></span>
                </div>
              </div>
            </div>
          </section>
          <section class="settings-section">
            <div>
              <h2>Área permitida</h2>
              <p class="small">Pulsa “Dibujar área” y arrastra sobre el mapa. Solo se aceptarán incidencias dentro del rectángulo.</p>
            </div>
            <div class="settings-map-toolbar">
              <button type="button" class="button-ghost" id="settings-draw-area">Dibujar área</button>
              <span class="small" id="settings-map-status">Área guardada</span>
            </div>
            <div id="settings-area-map" class="settings-map" aria-label="Mapa para definir el área permitida"></div>
            <input type="hidden" name="CIUDAD_LAT_MIN" value="${escapeAttr(settings.CIUDAD_LAT_MIN)}">
            <input type="hidden" name="CIUDAD_LAT_MAX" value="${escapeAttr(settings.CIUDAD_LAT_MAX)}">
            <input type="hidden" name="CIUDAD_LON_MIN" value="${escapeAttr(settings.CIUDAD_LON_MIN)}">
            <input type="hidden" name="CIUDAD_LON_MAX" value="${escapeAttr(settings.CIUDAD_LON_MAX)}">
            <input type="hidden" name="MAPA_CENTRO_LAT" value="${escapeAttr(settings.MAPA_CENTRO_LAT)}">
            <input type="hidden" name="MAPA_CENTRO_LON" value="${escapeAttr(settings.MAPA_CENTRO_LON)}">
            <input type="hidden" name="MAPA_ZOOM_INICIAL" value="${escapeAttr(settings.MAPA_ZOOM_INICIAL)}">
            <div class="settings-coordinate-grid" aria-label="Coordenadas guardadas">
              <div><span class="small">Sur</span><output data-coordinate="CIUDAD_LAT_MIN">${escapeHtml(settings.CIUDAD_LAT_MIN)}</output></div>
              <div><span class="small">Norte</span><output data-coordinate="CIUDAD_LAT_MAX">${escapeHtml(settings.CIUDAD_LAT_MAX)}</output></div>
              <div><span class="small">Oeste</span><output data-coordinate="CIUDAD_LON_MIN">${escapeHtml(settings.CIUDAD_LON_MIN)}</output></div>
              <div><span class="small">Este</span><output data-coordinate="CIUDAD_LON_MAX">${escapeHtml(settings.CIUDAD_LON_MAX)}</output></div>
            </div>
          </section>
          <section class="settings-section">
            <div>
              <h2>Reporte por WhatsApp</h2>
              <p class="small">Permite enviar una incidencia al teléfono del organismo responsable.</p>
            </div>
            <div class="settings-fields">
              ${selectField('WHATSAPP_SHARE_ENABLED', 'Mostrar la opción de WhatsApp', [['false', 'No'], ['true', 'Sí']])}
              <label>Teléfono de destino
                <input name="WHATSAPP_SHARE_PHONE" type="tel" inputmode="numeric" autocomplete="tel" maxlength="15" value="${escapeAttr(settings.WHATSAPP_SHARE_PHONE)}" placeholder="34600100100" aria-describedby="whatsapp-phone-help">
                <span class="small" id="whatsapp-phone-help">Incluye el prefijo del país y escribe solo números.</span>
              </label>
              ${selectField('WHATSAPP_REQUIRE_ACTIVATION', 'Antes de enviar la incidencia', [['false', 'Enviar la incidencia directamente'], ['true', 'Enviar un mensaje para iniciar el bot']])}
              <div class="settings-service field-wide" aria-live="polite">
                <strong id="whatsapp-mode-title"></strong>
                <span class="small" id="whatsapp-mode-description"></span>
              </div>
            </div>
          </section>
          <section class="settings-section">
            <div>
              <h2>Servicios externos</h2>
              <p class="small">Protege los formularios frente a abuso y elige cómo medir las visitas.</p>
            </div>
            <div class="settings-service-grid">
              <div class="settings-service">
                <div class="settings-service-heading">
                  <h3>Friendly Captcha</h3>
                  <a class="settings-external-link" href="https://app.friendlycaptcha.eu/" target="_blank" rel="noopener noreferrer" aria-label="Obtener claves en Friendly Captcha; se abre en una pestaña nueva">Obtener claves ↗</a>
                </div>
                ${selectField('FRIENDLYCAPTCHA_ENABLED', 'Estado', [['false', 'Desactivado'], ['true', 'Activado']])}
                ${field('FRIENDLYCAPTCHA_SITEKEY', 'Sitekey pública', { maxLength: 200, required: false })}
                <label>Clave secreta
                  <input type="password" name="FRIENDLYCAPTCHA_SECRET" value="" maxlength="300" autocomplete="new-password" placeholder="${settings.FRIENDLYCAPTCHA_SECRET_CONFIGURED ? 'Configurada; deja vacío para conservarla' : 'Introduce la clave secreta'}">
                </label>
                <span class="settings-secret-status">${settings.FRIENDLYCAPTCHA_SECRET_CONFIGURED ? 'Clave secreta configurada' : 'Falta la clave secreta'}</span>
              </div>
              <div class="settings-service">
                <h3>Analítica</h3>
                ${selectField('ANALYTICS_PROVIDER', 'Proveedor', [['none', 'Sin analítica'], ['matomo', 'Matomo'], ['google', 'Google Analytics'], ['matomo,google', 'Matomo y Google']])}
                ${field('MATOMO_URL', 'URL de Matomo', { maxLength: 240, required: false })}
                ${field('MATOMO_SITE_ID', 'Site ID de Matomo', { maxLength: 40, required: false })}
                ${field('GA_ID', 'ID de Google Analytics', { maxLength: 40, required: false })}
              </div>
            </div>
          </section>
          <section class="settings-section">
            <div>
              <h2>Apariencia</h2>
              <p class="small">Elige una paleta legible y comprueba el resultado en la vista previa.</p>
            </div>
            <div class="settings-color-grid">
              ${colorField('APP_PRIMARY_COLOR', 'Principal')}
              ${colorField('APP_SECONDARY_COLOR', 'Secundario')}
              ${colorField('APP_BACKGROUND_COLOR', 'Fondo')}
              ${colorField('APP_SUCCESS_COLOR', 'Éxito')}
              ${colorField('APP_ERROR_COLOR', 'Error')}
              ${colorField('APP_WARNING_COLOR', 'Aviso')}
              ${colorField('APP_INFO_COLOR', 'Información')}
            </div>
          </section>
          <section class="settings-section">
            <div>
              <h2>Textos públicos</h2>
              <p class="small">Mensajes breves que aparecen al reportar y resolver incidencias.</p>
            </div>
            <div class="settings-fields">
              ${field('VITE_INSTRUCCIONES_REGISTRO', 'Instrucciones al reportar', { textarea: true, maxLength: 300, wide: true, required: false })}
            </div>
          </section>
          <div class="detail-actions">
            <button type="submit">Guardar configuración</button>
          </div>
        </div>
      </form>
      <script src="/admin-assets/leaflet/leaflet.js"></script>
      <script>
        (() => {
          const form = document.getElementById('settings-form');
          const preview = document.getElementById('settings-preview-header');
          const sync = () => {
            document.getElementById('settings-preview-name').textContent = form.APP_NAME.value || 'Basura Cero';
            document.getElementById('settings-preview-subtitle').textContent = form.APP_SUBTITLE.value;
            document.getElementById('settings-preview-logo').src = form.APP_LOGO_PATH.value || '/img/default/logo.png';
            preview.style.setProperty('--preview-primary', form.APP_PRIMARY_COLOR.value);
            preview.style.setProperty('--preview-secondary', form.APP_SECONDARY_COLOR.value);
          };
          form?.addEventListener('input', sync);
          sync();

          document.querySelectorAll('[data-brand-choose]').forEach((button) => {
            button.addEventListener('click', () => {
              document.querySelector('[data-brand-input="' + button.dataset.brandChoose + '"]')?.click();
            });
          });
          document.querySelectorAll('[data-brand-input]').forEach((input) => {
            input.addEventListener('change', async () => {
              const kind = input.dataset.brandInput;
              const file = input.files?.[0];
              if (!file) return;
              const status = document.querySelector('[data-brand-status="' + kind + '"]');
              const button = document.querySelector('[data-brand-choose="' + kind + '"]');
              status.textContent = 'Subiendo imagen…';
              button.disabled = true;
              try {
                const data = new FormData();
                data.append('image', file);
                const response = await fetch('/admin/configuracion/branding/' + kind, {
                  method: 'POST',
                  headers: { 'x-csrf-token': form.elements._csrf.value },
                  body: data
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'No se ha podido subir la imagen.');
                const settingName = kind === 'logo' ? 'APP_LOGO_PATH' : 'APP_FAVICON_PATH';
                form.elements[settingName].value = result.path;
                document.getElementById(kind === 'logo' ? 'settings-logo-current' : 'settings-favicon-current').src = result.path;
                status.textContent = 'Imagen preparada. Guarda la configuración para aplicarla.';
                sync();
              } catch (error) {
                status.textContent = error.message;
              } finally {
                button.disabled = false;
                input.value = '';
              }
            });
          });

          const syncWhatsApp = () => {
            const enabled = form.WHATSAPP_SHARE_ENABLED.value === 'true';
            const requiresActivation = form.WHATSAPP_REQUIRE_ACTIVATION.value === 'true';
            document.getElementById('whatsapp-mode-title').textContent = enabled
              ? (requiresActivation ? 'Inicio de bot activado' : 'Envío directo activado')
              : 'Reporte por WhatsApp desactivado';
            document.getElementById('whatsapp-mode-description').textContent = enabled
              ? (requiresActivation
                ? 'Primero se abrirá un mensaje para iniciar el bot y la incidencia quedará copiada para pegarla después.'
                : 'WhatsApp se abrirá con la descripción y la dirección preparadas para enviar.')
              : 'La opción no aparecerá en las incidencias.';
          };
          form.WHATSAPP_SHARE_ENABLED.addEventListener('change', syncWhatsApp);
          form.WHATSAPP_REQUIRE_ACTIVATION.addEventListener('change', syncWhatsApp);
          syncWhatsApp();

          const mapElement = document.getElementById('settings-area-map');
          const drawButton = document.getElementById('settings-draw-area');
          const mapStatus = document.getElementById('settings-map-status');
          if (mapElement && window.L) {
            const readNumber = (name) => Number(form.elements[name].value);
            const initialBounds = window.L.latLngBounds(
              [readNumber('CIUDAD_LAT_MIN'), readNumber('CIUDAD_LON_MIN')],
              [readNumber('CIUDAD_LAT_MAX'), readNumber('CIUDAD_LON_MAX')]
            );
            const map = window.L.map(mapElement, { scrollWheelZoom: false });
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap'
            }).addTo(map);
            let rectangle = window.L.rectangle(initialBounds, {
              color: form.APP_PRIMARY_COLOR.value,
              weight: 3,
              fillOpacity: 0.12
            }).addTo(map);
            map.fitBounds(initialBounds, { padding: [24, 24] });

            let drawing = false;
            let startPoint = null;
            const setDrawingState = (active) => {
              drawing = active;
              startPoint = null;
              drawButton.textContent = active ? 'Cancelar dibujo' : 'Dibujar área';
              mapStatus.textContent = active ? 'Arrastra sobre el mapa para marcar el rectángulo' : 'Área guardada';
              mapElement.style.cursor = active ? 'crosshair' : '';
              if (active) map.dragging.disable(); else map.dragging.enable();
            };
            const updateCoordinates = (bounds) => {
              const values = {
                CIUDAD_LAT_MIN: bounds.getSouth().toFixed(7),
                CIUDAD_LAT_MAX: bounds.getNorth().toFixed(7),
                CIUDAD_LON_MIN: bounds.getWest().toFixed(7),
                CIUDAD_LON_MAX: bounds.getEast().toFixed(7),
                MAPA_CENTRO_LAT: bounds.getCenter().lat.toFixed(7),
                MAPA_CENTRO_LON: bounds.getCenter().lng.toFixed(7)
              };
              Object.entries(values).forEach(([name, value]) => {
                form.elements[name].value = value;
                document.querySelector('[data-coordinate="' + name + '"]')?.replaceChildren(value);
              });
              form.elements.MAPA_ZOOM_INICIAL.value = String(map.getBoundsZoom(bounds));
            };

            drawButton?.addEventListener('click', () => setDrawingState(!drawing));
            map.on('mousedown', (event) => {
              if (!drawing) return;
              startPoint = event.latlng;
            });
            map.on('mousemove', (event) => {
              if (!drawing || !startPoint) return;
              const nextBounds = window.L.latLngBounds(startPoint, event.latlng);
              rectangle.setBounds(nextBounds);
            });
            map.on('mouseup', (event) => {
              if (!drawing || !startPoint) return;
              const nextBounds = window.L.latLngBounds(startPoint, event.latlng);
              if (nextBounds.getNorth() !== nextBounds.getSouth() && nextBounds.getEast() !== nextBounds.getWest()) {
                rectangle.setBounds(nextBounds);
                updateCoordinates(nextBounds);
                mapStatus.textContent = 'Área actualizada; guarda los cambios para aplicarla';
              }
              setDrawingState(false);
            });
            form.APP_PRIMARY_COLOR.addEventListener('input', () => rectangle.setStyle({ color: form.APP_PRIMARY_COLOR.value }));
          }
        })();
      </script>
    `
  });
}

function renderAdminUsersPage({ currentAdmin, notice, admins, csrfToken }) {
  const rows = admins.length
    ? admins.map((admin) => `
      <tr>
        <td>${escapeHtml(admin.username)}</td>
        <td><span class="status-chip">${admin.is_active ? 'activo' : 'inactivo'}</span></td>
        <td><span class="status-chip">${admin.must_change_password ? 'pendiente' : 'ok'}</span></td>
        <td>${formatDate(admin.last_login_at)}</td>
        <td>${formatDate(admin.created_at)}</td>
        <td>
          <div class="actions">
            <form method="post" action="/admin/administradores/${admin.id}/update" class="inline-form">
              <input type="text" name="username" value="${escapeAttr(admin.username)}" aria-label="Usuario de ${escapeAttr(admin.username)}">
              <button class="detail-mini-button button-ghost" type="submit">Guardar</button>
            </form>
            <form method="post" action="/admin/administradores/${admin.id}/toggle-active" data-confirm="Se cambiara el acceso de este administrador. ¿Continuar?">
              <input type="hidden" name="isActive" value="${admin.is_active ? '0' : '1'}">
              <button class="detail-mini-button button-ghost" type="submit">${admin.is_active ? 'Desactivar' : 'Activar'}</button>
            </form>
            <form method="post" action="/admin/administradores/${admin.id}/force-reset" data-confirm="El administrador tendrá que cambiar su contraseña antes de volver a usar el panel. ¿Continuar?">
              <button class="detail-mini-button button-ghost" type="submit">Forzar clave</button>
            </form>
          </div>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="6">Todavia no hay administradores.</td></tr>';

  return renderAdminSectionLayout({
    currentAdmin,
    notice,
    csrfToken,
    title: 'Administradores',
    eyebrow: 'Seguridad',
    intro: null,
    activeNav: 'administradores',
    content: `
      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 style="margin-bottom:6px">Nuevo administrador</h2>
            <p class="small">Alta rápida con contraseña inicial y cambio forzado opcional.</p>
          </div>
        </div>
        <form method="post" action="/admin/administradores/create" class="detail-edit-fields">
          <label>Usuario<input type="text" name="username" required></label>
          <label>Contraseña inicial<input type="password" name="password" required></label>
          <label><span>Cambio obligatorio</span><select name="mustChangePassword"><option value="1">Si</option><option value="0">No</option></select></label>
          <label><span>Estado</span><select name="isActive"><option value="1">Activo</option><option value="0">Inactivo</option></select></label>
          <div class="detail-actions">
            <button type="submit">Crear administrador</button>
          </div>
        </form>
      </section>
      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 style="margin-bottom:6px">Equipo actual</h2>
            <p class="small">Edicion inline para los cambios mas frecuentes.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="mobile-scroll-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Clave</th>
                <th>Ultimo acceso</th>
                <th>Alta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `
  });
}

function renderCategoriasPage({ currentAdmin, notice, categorias, csrfToken }) {
  const allIcons = getAllMdiIcons();
  const iconJson = escapeAttr(JSON.stringify(allIcons));
  const recommendedIconJson = escapeAttr(JSON.stringify(CURATED_TIPO_ICON_OPTIONS));
  const options = categorias.map((item) => `<option value="${item.id}">${escapeHtml(item.nombre)}</option>`).join('');
  const rows = categorias.length
    ? categorias.map((item) => `
      <tr>
        <td>${renderTipoLabel(item.nombre, item.icono)}</td>
        <td class="metrics-cell" data-label="Activas"><span class="metric-value">${Number(item.activas || 0)}</span></td>
        <td class="metrics-cell" data-label="Solucionadas"><span class="metric-value">${Number(item.solucionadas || 0)}</span></td>
        <td class="metrics-cell" data-label="Total"><span class="metric-value">${Number(item.total || 0)}</span></td>
        <td class="actions-cell" data-label="Acciones">
          <div class="category-actions">
            <button
              class="button-ghost detail-mini-button"
              type="button"
              data-category-edit
              data-id="${item.id}"
              data-nombre="${escapeAttr(item.nombre)}"
              data-icono="${escapeAttr(normalizeTipoIcon(item.icono || DEFAULT_TIPO_ICON))}"
            >Editar</button>
            <form method="post" action="/admin/categorias/${item.id}/delete" data-confirm="La categoria se eliminara definitivamente si no tiene incidencias asociadas. ¿Continuar?">
              <button class="button-ghost detail-mini-button" type="submit">Borrar</button>
            </form>
          </div>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="5">Todavia no hay categorias registradas.</td></tr>';

  return renderAdminSectionLayout({
    currentAdmin,
    notice,
    csrfToken,
    title: 'Categorias',
    eyebrow: 'Clasificacion',
    intro: null,
    activeNav: 'categorias',
    content: `
      <section class="dashboard-section">
        <div class="toolbar-inline">
          <div class="actions">
            <button type="button" data-open-category-create>Nueva categoria</button>
            <button type="button" class="button-ghost" data-open-merge-modal>Fusionar categorias</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="category-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Activas</th>
                <th>Solucionadas</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>

      <div class="modal-backdrop" id="category-modal" aria-hidden="true">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
          <div class="modal-header">
            <div>
              <h2 id="category-modal-title">Nueva categoría</h2>
            </div>
            <button type="button" class="button-ghost modal-close" data-close-modal>Cerrar</button>
          </div>
          <form method="post" action="/admin/categorias/create" id="category-form">
            <div class="modal-layout">
              <div class="modal-panel">
                <label class="category-form-field">Nombre
                  <input id="category-name-input" type="text" name="nombre" required>
                </label>
                <div class="modal-preview">
                  <span class="small">Vista previa</span>
                  <span class="category-preview" id="category-preview-chip">
                    <i class="mdi ${escapeAttr(DEFAULT_TIPO_ICON)}" aria-hidden="true"></i>
                    <span id="category-preview-name">Nueva categoría</span>
                  </span>
                </div>
              </div>
              <div class="modal-panel">
                <div class="icon-search">
                  <label class="category-form-field">Buscar icono
                    <input id="icon-search-input" type="search" placeholder="Buscar en todo el catálogo">
                  </label>
                  <button type="button" class="button-ghost icon-catalog-toggle" id="icon-catalog-toggle" aria-expanded="false">Ver todos</button>
                </div>
                <div class="icon-picker-heading">
                  <strong id="icon-picker-title">Iconos recomendados</strong>
                  <span class="icon-picker-count" id="icon-picker-count"></span>
                </div>
                <div class="icon-picker-grid" id="all-icons-grid" data-icons='${iconJson}' data-recommended-icons='${recommendedIconJson}' aria-labelledby="icon-picker-title"></div>
              </div>
            </div>
            <div class="detail-actions" style="margin-top:18px">
              <button type="submit">Guardar categoría</button>
              <button type="button" class="button-ghost" data-close-modal>Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-backdrop" id="merge-modal" aria-hidden="true">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="merge-modal-title">
          <div class="modal-header">
            <div>
              <h2 id="merge-modal-title">Fusionar categorias</h2>
            </div>
            <button type="button" class="button-ghost modal-close" data-close-modal>Cerrar</button>
          </div>
          <form method="post" action="/admin/categorias/merge" data-confirm="Las incidencias de la categoria origen se moveran a la categoria destino. Revisa ambas selecciones antes de continuar.">
            <div class="category-merge-inline">
              <label>Origen<select name="sourceTipoId" required>${options}</select></label>
              <label>Destino<select name="targetTipoId" required>${options}</select></label>
            </div>
            <div class="detail-actions" style="margin-top:18px">
              <button type="submit">Fusionar categorias</button>
            </div>
          </form>
        </div>
      </div>

      <script>
        (() => {
          if (window.location.pathname !== '/admin/categorias') {
            window.history.replaceState({}, '', '/admin/categorias');
          }
          const categoryModal = document.getElementById('category-modal');
          const mergeModal = document.getElementById('merge-modal');
          const categoryForm = document.getElementById('category-form');
          const categoryTitle = document.getElementById('category-modal-title');
          const nameInput = document.getElementById('category-name-input');
          const previewChip = document.getElementById('category-preview-chip');
          const previewIcon = previewChip?.querySelector('i');
          const previewName = document.getElementById('category-preview-name');
          const searchInput = document.getElementById('icon-search-input');
          const iconCatalogToggle = document.getElementById('icon-catalog-toggle');
          const iconPickerTitle = document.getElementById('icon-picker-title');
          const iconPickerCount = document.getElementById('icon-picker-count');
          const allIconsGrid = document.getElementById('all-icons-grid');
          const allIcons = JSON.parse(allIconsGrid?.dataset.icons || '[]');
          const recommendedIcons = JSON.parse(allIconsGrid?.dataset.recommendedIcons || '[]');
          const recommendedValues = new Set(recommendedIcons.map((icon) => icon.value));
          const batchSize = 120;
          let showAllIcons = false;
          let filteredIcons = recommendedIcons;
          let visibleCount = 0;

          const openModal = (modal) => {
            if (!modal) return;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
          };

          const closeModal = (modal) => {
            if (!modal) return;
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
          };

          const syncPreview = () => {
            const checked = categoryForm?.querySelector('input[name="icono"]:checked');
            const iconValue = checked?.value || '${DEFAULT_TIPO_ICON}';
            if (previewIcon) {
              previewIcon.className = 'mdi ' + iconValue;
            }
            if (previewName) {
              previewName.textContent = nameInput?.value?.trim() || 'Nueva categoría';
            }
          };

          const getRecommendedIcons = () => {
            const currentValue = categoryForm?.querySelector('input[name="icono"]:checked')?.value;
            const currentIcon = allIcons.find((icon) => icon.value === currentValue);
            if (currentIcon && !recommendedValues.has(currentIcon.value)) {
              return [currentIcon, ...recommendedIcons];
            }
            return recommendedIcons;
          };

          const renderVisibleIcons = (reset = false) => {
            if (!allIconsGrid) return;
            const currentValue = categoryForm?.querySelector('input[name="icono"]:checked')?.value || '${DEFAULT_TIPO_ICON}';
            const selectedIndex = filteredIcons.findIndex((icon) => icon.value === currentValue);
            const minimumVisible = selectedIndex >= 0 ? selectedIndex + 1 : 0;
            if (reset) {
              visibleCount = filteredIcons.length <= recommendedIcons.length + 1
                ? filteredIcons.length
                : Math.max(batchSize, minimumVisible);
            } else {
              visibleCount = Math.max(visibleCount, minimumVisible);
            }
            const visibleIcons = filteredIcons.slice(0, visibleCount);
            allIconsGrid.innerHTML = visibleIcons.map((icon) => \`
              <label class="icon-option" data-icon-option data-value="\${icon.value}" data-label="\${icon.label.toLowerCase()}">
                <input type="radio" name="icono" value="\${icon.value}" \${icon.value === currentValue ? 'checked' : ''}>
                <span class="icon-tile">
                  <i class="mdi \${icon.value}" aria-hidden="true"></i>
                  <strong>\${icon.label}</strong>
                </span>
              </label>
            \`).join('');
            if (reset) allIconsGrid.scrollTop = 0;
            if (iconPickerCount) {
              iconPickerCount.textContent = filteredIcons.length + (filteredIcons.length === 1 ? ' opción' : ' opciones');
            }
          };

          const applyFilter = (query = '') => {
            const term = query.trim().toLowerCase();
            const showingFullCatalog = showAllIcons || Boolean(term);
            filteredIcons = term
              ? allIcons.filter((icon) => icon.label.toLowerCase().includes(term) || icon.value.toLowerCase().includes(term))
              : showAllIcons
                ? allIcons
                : getRecommendedIcons();
            if (iconPickerTitle) {
              iconPickerTitle.textContent = term
                ? 'Resultados'
                : showAllIcons
                  ? 'Todos los iconos'
                  : 'Iconos recomendados';
            }
            if (iconCatalogToggle) {
              iconCatalogToggle.textContent = showingFullCatalog ? 'Ver recomendados' : 'Ver todos';
              iconCatalogToggle.setAttribute('aria-expanded', String(showingFullCatalog));
            }
            renderVisibleIcons(true);
          };

          const setCategoryMode = ({ title, action, nombre = '', icono = '${DEFAULT_TIPO_ICON}' }) => {
            showAllIcons = false;
            if (categoryTitle) categoryTitle.textContent = title;
            if (categoryForm) categoryForm.action = action;
            if (nameInput) nameInput.value = nombre;
            const hiddenRadio = categoryForm?.querySelector('input[name="icono"][type="radio"][hidden]');
            hiddenRadio?.remove();
            const matchingRadio = categoryForm?.querySelector('input[name="icono"][value="' + icono + '"]');
            if (matchingRadio) {
              matchingRadio.checked = true;
            } else if (categoryForm) {
              const fallbackRadio = document.createElement('input');
              fallbackRadio.type = 'radio';
              fallbackRadio.name = 'icono';
              fallbackRadio.value = icono;
              fallbackRadio.checked = true;
              fallbackRadio.hidden = true;
              categoryForm.appendChild(fallbackRadio);
            }
            applyFilter(searchInput?.value || '');
            const refreshedRadio = categoryForm?.querySelector('input[name="icono"][value="' + icono + '"]');
            if (refreshedRadio) {
              refreshedRadio.checked = true;
              if (refreshedRadio !== hiddenRadio) {
                hiddenRadio?.remove();
              }
            }
            syncPreview();
          };

          document.querySelector('[data-open-category-create]')?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            setCategoryMode({
              title: 'Nueva categoría',
              action: '/admin/categorias/create',
              nombre: '',
              icono: '${DEFAULT_TIPO_ICON}'
            });
            openModal(categoryModal);
          });

          document.querySelectorAll('[data-category-edit]').forEach((button) => {
            button.addEventListener('click', () => {
              if (searchInput) searchInput.value = '';
              setCategoryMode({
                title: 'Editar categoría',
                action: '/admin/categorias/' + button.dataset.id + '/rename',
                nombre: button.dataset.nombre || '',
                icono: button.dataset.icono || '${DEFAULT_TIPO_ICON}'
              });
              openModal(categoryModal);
            });
          });

          document.querySelector('[data-open-merge-modal]')?.addEventListener('click', () => openModal(mergeModal));

          document.querySelectorAll('[data-close-modal]').forEach((button) => {
            button.addEventListener('click', () => {
              closeModal(categoryModal);
              closeModal(mergeModal);
            });
          });

          [categoryModal, mergeModal].forEach((modal) => {
            modal?.addEventListener('click', (event) => {
              if (event.target === modal) {
                closeModal(modal);
              }
            });
          });

          document.addEventListener('change', (event) => {
            if (event.target instanceof HTMLInputElement && event.target.name === 'icono') {
              categoryForm?.querySelector('input[name="icono"][type="radio"][hidden]')?.remove();
              syncPreview();
            }
          });

          nameInput?.addEventListener('input', syncPreview);
          searchInput?.addEventListener('input', () => applyFilter(searchInput.value));
          iconCatalogToggle?.addEventListener('click', () => {
            if (searchInput?.value.trim()) {
              searchInput.value = '';
              showAllIcons = false;
            } else {
              showAllIcons = !showAllIcons;
            }
            applyFilter(searchInput?.value || '');
          });
          allIconsGrid?.addEventListener('scroll', () => {
            if (allIconsGrid.scrollTop + allIconsGrid.clientHeight >= allIconsGrid.scrollHeight - 80 && visibleCount < filteredIcons.length) {
              visibleCount = Math.min(visibleCount + batchSize, filteredIcons.length);
              renderVisibleIcons();
            }
          });

          applyFilter();
          syncPreview();
        })();
      </script>
    `
  });
}

function renderAuditPage({ currentAdmin, notice, entries, csrfToken }) {
  const rows = entries.length
    ? entries.map((entry) => `
      <tr>
        <td>${formatDate(entry.created_at)}</td>
        <td>${escapeHtml(entry.admin_username || 'sistema')}</td>
        <td>${escapeHtml(entry.action || '-')}</td>
        <td>${escapeHtml(entry.entity_type || '-')}</td>
        <td>${escapeHtml(entry.entity_id || '-')}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5">Todavia no hay actividad registrada.</td></tr>';

  return renderAdminSectionLayout({
    currentAdmin,
    notice,
    csrfToken,
    title: 'Auditoria',
    eyebrow: 'Trazabilidad',
    intro: null,
    activeNav: 'auditoria',
    content: `
      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 style="margin-bottom:6px">Actividad reciente</h2>
            <p class="small">Ultimos eventos registrados en el panel.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="mobile-scroll-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Administrador</th>
                <th>Accion</th>
                <th>Entidad</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `
  });
}

function renderMaintenancePage({ currentAdmin, notice, pendingIncidencias, inadequateIncidencias, missingLocationIncidencias, tipos, preview, csrfToken }) {
  const tiposOptions = tipos.map((tipo) => `<option value="${tipo.id}">${escapeHtml(tipo.nombre)}</option>`).join('');
  const pendingRows = pendingIncidencias.length
    ? pendingIncidencias.map((item) => `
      <tr>
        <td>${item.id}</td>
        <td>${escapeHtml(item.tipo)}</td>
        <td>${item.reportes_solucion}</td>
        <td>${escapeHtml(item.descripcion)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4">No hay incidencias activas con votos de solucion pendientes.</td></tr>';

  const previewRows = preview.length
    ? preview.map((item) => `
      <tr>
        <td>${item.id}</td>
        <td>${escapeHtml(item.tipo || '')}</td>
        <td>${item.votos_solucion}</td>
        <td>${escapeHtml(item.descripcion)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4">Todavia no hay previsualizacion cargada.</td></tr>';

  const pendingCards = pendingIncidencias.length
    ? pendingIncidencias.map((item) => `
      <article class="table-card">
        <strong>#${item.id} · ${escapeHtml(item.tipo)}</strong>
        <span>${item.reportes_solucion} votos de solucion</span>
        <span>${escapeHtml(item.descripcion)}</span>
      </article>
    `).join('')
    : '<div class="empty-state">No hay incidencias activas con votos de solucion pendientes.</div>';

  const previewCards = preview.length
    ? preview.map((item) => `
      <article class="table-card">
        <strong>#${item.id} · ${escapeHtml(item.tipo || '')}</strong>
        <span>${item.votos_solucion} votos de solucion</span>
        <span>${escapeHtml(item.descripcion)}</span>
      </article>
    `).join('')
    : '<div class="empty-state">Todavia no hay previsualizacion cargada.</div>';

  const inadequateRows = (inadequateIncidencias || []).length
    ? inadequateIncidencias.map((item) => `
      <tr>
        <td>#${item.id}</td>
        <td>${escapeHtml(item.tipo)}</td>
        <td>${item.reportes_inadecuado}</td>
        <td>${escapeHtml(item.estado)}</td>
        <td>${escapeHtml(item.descripcion)}</td>
        <td>
          <div class="actions">
            <form method="post" action="/admin/maintenance/mark-spam" data-confirm="La incidencia se ocultara como spam. ¿Continuar?">
              <input type="hidden" name="incidenciaId" value="${item.id}">
              <button class="detail-mini-button button-ghost" type="submit">Spam</button>
            </form>
            <form method="post" action="/admin/maintenance/clear-inadequate-reports" data-confirm="Se eliminaran todos los reportes inadecuados de esta incidencia. ¿Continuar?">
              <input type="hidden" name="incidenciaId" value="${item.id}">
              <button class="detail-mini-button button-ghost" type="submit">Limpiar</button>
            </form>
            <a class="dashboard-muted-link" href="/admin/incidencias/${item.id}">Abrir</a>
          </div>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="6">No hay incidencias con reportes inadecuados pendientes.</td></tr>';

  const inadequateCards = (inadequateIncidencias || []).length
    ? inadequateIncidencias.map((item) => `
      <article class="table-card">
        <strong>#${item.id} · ${escapeHtml(item.tipo)}</strong>
        <span>${item.reportes_inadecuado} reportes inadecuados · ${escapeHtml(item.estado)}</span>
        <span>${escapeHtml(item.descripcion)}</span>
        <div class="actions" style="margin-top:10px">
          <form method="post" action="/admin/maintenance/mark-spam" data-confirm="La incidencia se ocultara como spam. ¿Continuar?">
            <input type="hidden" name="incidenciaId" value="${item.id}">
            <button class="detail-mini-button button-ghost" type="submit">Spam</button>
          </form>
          <form method="post" action="/admin/maintenance/clear-inadequate-reports" data-confirm="Se eliminaran todos los reportes inadecuados de esta incidencia. ¿Continuar?">
            <input type="hidden" name="incidenciaId" value="${item.id}">
            <button class="detail-mini-button button-ghost" type="submit">Limpiar</button>
          </form>
          <a class="dashboard-muted-link" href="/admin/incidencias/${item.id}">Abrir</a>
        </div>
      </article>
    `).join('')
    : '<div class="empty-state">No hay incidencias con reportes inadecuados pendientes.</div>';

  const missingLocationRows = (missingLocationIncidencias || []).length
    ? missingLocationIncidencias.map((item) => `
      <tr>
        <td>#${item.id}</td>
        <td>${escapeHtml(item.tipo)}</td>
        <td>${escapeHtml(item.barrio || 'Sin barrio')}</td>
        <td>${escapeHtml(item.direccion || 'Sin direccion')}</td>
        <td>${escapeHtml(item.descripcion)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5">No hay incidencias pendientes de completar ubicacion.</td></tr>';

  const missingLocationCards = (missingLocationIncidencias || []).length
    ? missingLocationIncidencias.map((item) => `
      <article class="table-card">
        <strong>#${item.id} · ${escapeHtml(item.tipo)}</strong>
        <span>${escapeHtml(item.barrio || 'Sin barrio')} · ${escapeHtml(item.direccion || 'Sin direccion')}</span>
        <span>${escapeHtml(item.descripcion)}</span>
      </article>
    `).join('')
    : '<div class="empty-state">No hay incidencias pendientes de completar ubicacion.</div>';

  return renderAdminSectionLayout({
    title: 'Mantenimiento',
    currentAdmin,
    notice,
    csrfToken,
    eyebrow: 'Mantenimiento',
    intro: null,
    activeNav: 'maintenance',
    content: `
      <div class="grid two">
        <div class="subtle-panel">
          <h2>Fusionar tipos</h2>
          <form method="post" action="/admin/maintenance/merge-tipos" data-confirm="Las incidencias del tipo origen se reasignaran al tipo destino. ¿Continuar?">
            <label>Tipo origen
              <select name="sourceTipoId" required>${tiposOptions}</select>
            </label>
            <label>Tipo destino
              <select name="targetTipoId" required>${tiposOptions}</select>
            </label>
            <button type="submit">Reasignar incidencias</button>
          </form>
        </div>
        <div class="subtle-panel">
          <h2>Limpiar reportes de solucion</h2>
          <form method="post" action="/admin/maintenance/clear-solution-reports" data-confirm="Se eliminaran los reportes de solucion y la incidencia se reabrira si procede. ¿Continuar?">
            <label>ID de incidencia
              <input name="incidenciaId" inputmode="numeric" required>
            </label>
            <button type="submit">Limpiar y reabrir si procede</button>
          </form>
        </div>
      </div>
      <div class="grid two" style="margin-top:16px">
        <div class="subtle-panel">
          <h2>Previsualizar incidencias antiguas solucionables</h2>
          <form method="post" action="/admin/maintenance/preview-old-solvable">
            <label>Dias minimos
              <input name="days" type="number" min="1" value="90" required>
            </label>
            <label>Votos minimos
              <input name="votes" type="number" min="0" value="1" required>
            </label>
            <button type="submit">Calcular vista previa</button>
          </form>
          <form method="post" action="/admin/maintenance/run-old-solvable" style="margin-top:12px" data-confirm="Se marcaran como solucionadas todas las candidatas que cumplan estos criterios. ¿Continuar?">
            <label>Dias minimos
              <input name="days" type="number" min="1" value="90" required>
            </label>
            <label>Votos minimos
              <input name="votes" type="number" min="0" value="1" required>
            </label>
            <button type="submit">Ejecutar sobre candidatas</button>
          </form>
        </div>
        <div class="subtle-panel">
          <h2>Pendientes de validar</h2>
          <div class="table-wrap">
            <table class="responsive-table">
              <thead>
                <tr><th>ID</th><th>Tipo</th><th>Votos</th><th>Descripcion</th></tr>
              </thead>
              <tbody>${pendingRows}</tbody>
            </table>
          </div>
          <div class="table-cards">${pendingCards}</div>
        </div>
      </div>
      <div class="subtle-panel" style="margin-top:16px">
        <h2>Moderacion de reportes inadecuados</h2>
        <div class="table-wrap">
          <table class="responsive-table">
            <thead>
              <tr><th>ID</th><th>Tipo</th><th>Reportes</th><th>Estado</th><th>Descripcion</th><th>Acciones</th></tr>
            </thead>
            <tbody>${inadequateRows}</tbody>
          </table>
        </div>
        <div class="table-cards">${inadequateCards}</div>
      </div>
      <div class="subtle-panel" style="margin-top:16px">
        <h2>Ubicacion pendiente</h2>
        <div class="actions" style="margin-bottom:12px">
          <form method="post" action="/admin/maintenance/process-missing-location" data-confirm="Se consultara el geocodificador para completar hasta 100 incidencias. Esta operacion puede tardar. ¿Continuar?">
            <button type="submit">Procesar hasta 100 incidencias</button>
          </form>
        </div>
        <div class="table-wrap">
          <table class="responsive-table">
            <thead>
              <tr><th>ID</th><th>Tipo</th><th>Barrio</th><th>Direccion</th><th>Descripcion</th></tr>
            </thead>
            <tbody>${missingLocationRows}</tbody>
          </table>
        </div>
        <div class="table-cards">${missingLocationCards}</div>
      </div>
      <div class="subtle-panel" style="margin-top:16px">
        <h2>Ultima previsualizacion</h2>
        <div class="table-wrap">
          <table class="responsive-table">
            <thead>
              <tr><th>ID</th><th>Tipo</th><th>Votos</th><th>Descripcion</th></tr>
            </thead>
            <tbody>${previewRows}</tbody>
          </table>
        </div>
        <div class="table-cards">${previewCards}</div>
      </div>
    `
  });
}

module.exports = {
  renderAdminUsersPage,
  renderAuditPage,
  renderCategoriasPage,
  renderChangePasswordPage,
  renderDashboardPage,
  renderIncidenciaDetailPage,
  renderIncidenciasListPage,
  renderLayout,
  renderLoginPage,
  renderMaintenancePage,
  renderSettingsPage
};
