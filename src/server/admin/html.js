const {
  CURATED_TIPO_ICON_OPTIONS,
  DEFAULT_TIPO_ICON,
  getAllMdiIcons,
  normalizeTipoIcon
} = require('./iconCatalog');

const CURATED_SOCIAL_ICON_OPTIONS = [
  { value: 'mdi-account-group', label: 'Comunidad' },
  { value: 'mdi-web', label: 'Sitio web' },
  { value: 'mdi-email', label: 'Correo' },
  { value: 'mdi-telegram', label: 'Telegram' },
  { value: 'mdi-whatsapp', label: 'WhatsApp' },
  { value: 'mdi-instagram', label: 'Instagram' },
  { value: 'mdi-facebook', label: 'Facebook' },
  { value: 'mdi-twitter', label: 'Twitter' },
  { value: 'mdi-youtube', label: 'YouTube' },
  { value: 'mdi-linkedin', label: 'LinkedIn' },
  { value: 'mdi-github', label: 'GitHub' },
  { value: 'mdi-rss', label: 'RSS' },
  { value: 'mdi-newspaper', label: 'Blog' },
  { value: 'mdi-book-open-page-variant', label: 'Documentación' },
  { value: 'mdi-link', label: 'Enlace' }
];

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

function formatDateTime(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
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

  const source = String(html);
  const lowerSource = source.toLowerCase();
  const csrfInput = `<input type="hidden" name="_csrf" value="${escapeAttr(csrfToken)}">`;
  let result = '';
  let searchFrom = 0;

  while (searchFrom < source.length) {
    const formStart = lowerSource.indexOf('<form', searchFrom);
    if (formStart === -1) {
      result += source.slice(searchFrom);
      break;
    }
    const formEnd = lowerSource.indexOf('>', formStart + 5);
    if (formEnd === -1) {
      result += source.slice(searchFrom);
      break;
    }
    const openingTag = source.slice(formStart, formEnd + 1);
    result += source.slice(searchFrom, formEnd + 1);
    if (openingTag.toLowerCase().includes('method="post"')) {
      result += csrfInput;
    }
    searchFrom = formEnd + 1;
  }

  return result;
}

function renderLayout({ title, body, currentAdmin, notice, csrfToken }) {
  const safeBody = renderPostFormsWithCsrf(body, csrfToken);
  const pendingUpdate = currentAdmin?.updateStatus?.updateAvailable
    ? currentAdmin.updateStatus.release
    : null;
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
          --success: #276749;
          --success-soft: #edf7f1;
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
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .topbar-update-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          min-width: 48px;
          min-height: 48px;
          border: 1px solid #d9d4c7;
          border-radius: 14px;
          background: #faf8f2;
          color: #625b4d;
          font-size: 22px;
          text-decoration: none;
        }
        .topbar-update-link:hover {
          background: #f1ede4;
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
        button:disabled {
          cursor: not-allowed;
          opacity: 0.48;
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
        .toast-region {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 100;
          width: min(420px, calc(100vw - 32px));
          pointer-events: none;
        }
        .notice.toast {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          margin: 0;
          padding: 12px 12px 12px 16px;
          color: #1f563c;
          background: var(--success-soft);
          border-color: #a9d5bd;
          box-shadow: 0 18px 45px rgba(23, 32, 42, 0.18);
          pointer-events: auto;
          animation: toast-in 180ms ease-out both;
          transition: opacity 160ms ease, transform 160ms ease;
        }
        .toast-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          color: #fff;
          background: var(--success);
          font-size: 17px;
          line-height: 1;
        }
        .toast-message {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.5;
        }
        .toast-close {
          width: 44px;
          min-width: 44px;
          min-height: 44px;
          padding: 0;
          border-radius: 12px;
          color: #315b48;
          background: transparent;
        }
        .notice.toast.is-leaving {
          opacity: 0;
          transform: translateY(-8px);
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .notice.toast { animation: none; transition: none; }
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
        .settings-section-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-top: 4px;
        }
        .settings-save-status {
          min-height: 21px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .settings-save-status.success {
          color: #28734d;
        }
        .settings-save-status.error {
          color: var(--danger);
        }
        .settings-section-save {
          width: fit-content;
          min-width: 168px;
        }
        .settings-subsection {
          display: grid;
          gap: 12px;
          padding-top: 4px;
        }
        .settings-subsection-heading {
          display: grid;
          gap: 4px;
        }
        .settings-subsection-heading h3 {
          margin: 0;
          font-size: 16px;
          line-height: 1.4;
        }
        .settings-social-list {
          display: grid;
          gap: 10px;
        }
        .settings-social-row {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) 48px;
          gap: 10px;
          align-items: start;
          padding: 12px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--surface-soft);
        }
        .settings-social-fields {
          display: grid;
          grid-template-columns: minmax(120px, 0.8fr) minmax(220px, 1.6fr);
          gap: 10px;
          min-width: 0;
        }
        .settings-social-icon-trigger,
        .settings-social-remove {
          width: 48px;
          min-width: 48px;
          padding: 0;
        }
        .settings-social-icon-trigger {
          font-size: 22px;
          color: var(--ink);
        }
        .settings-social-icon-trigger i,
        .settings-social-remove i {
          line-height: 1;
        }
        .settings-social-remove {
          color: var(--danger);
        }
        .settings-social-empty {
          padding: 14px 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
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
        .settings-color-block {
          display: grid;
          gap: 12px;
          max-width: 560px;
        }
        .settings-color-heading {
          display: grid;
          gap: 4px;
        }
        .settings-color-heading h3 {
          margin: 0;
          font-size: 16px;
          line-height: 1.4;
        }
        .settings-color-list {
          display: grid;
          border-top: 1px solid var(--line);
        }
        .settings-color-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-height: 56px;
          padding: 4px 0;
          border-bottom: 1px solid var(--line);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .settings-color-row input[type="color"] {
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          min-height: 48px;
          padding: 3px;
          border-radius: 12px;
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
        .updates-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 20px 44px;
          padding: 4px 0 20px;
          border-bottom: 1px solid var(--line);
        }
        .updates-summary-item {
          display: grid;
          gap: 4px;
        }
        .updates-summary-item span {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .updates-summary-item strong {
          font-size: 20px;
          line-height: 1.3;
        }
        .updates-version-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 44px;
          color: var(--ink);
          text-decoration-color: #9aa7b2;
          text-underline-offset: 4px;
        }
        .updates-version-link:hover {
          text-decoration-color: var(--ink);
        }
        .updates-version-link i {
          color: var(--muted);
          font-size: 16px;
          line-height: 1;
        }
        .updates-channel-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 0;
          padding: 0;
          border: 0;
        }
        .updates-channel-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-height: 104px;
          padding: 16px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
          cursor: pointer;
        }
        .updates-channel-option:has(input:checked) {
          border-color: #8d99a5;
          background: var(--accent-soft);
          box-shadow: inset 0 0 0 1px #8d99a5;
        }
        .updates-channel-option input {
          flex: 0 0 auto;
          width: 20px;
          height: 20px;
          min-height: 20px;
          margin: 2px 0 0;
        }
        .updates-channel-copy {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .updates-channel-copy strong {
          line-height: 1.4;
        }
        .updates-channel-copy span {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }
        .updates-recommended {
          color: var(--success) !important;
          font-size: 12px !important;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .updates-form-actions,
        .updates-check-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .updates-check-copy {
          display: grid;
          gap: 4px;
        }
        .updates-check-copy p {
          margin: 0;
          line-height: 1.5;
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
        .number-sort-button {
          width: auto;
          min-height: 44px;
          margin: -10px -4px;
          padding: 0 4px;
          gap: 6px;
          border-radius: 8px;
          color: inherit;
          background: transparent;
          font-size: inherit;
          white-space: nowrap;
        }
        .number-sort-button:hover,
        .number-sort-button[aria-pressed="true"] {
          color: var(--ink);
          background: var(--accent-soft);
        }
        .number-sort-indicator {
          min-width: 12px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1;
          text-align: center;
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
        .old-solvable-workspace {
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 20px;
          background: #fff;
        }
        .old-solvable-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 28px;
          padding: 24px 24px 20px;
        }
        .old-solvable-heading h2 {
          margin-bottom: 8px;
        }
        .old-solvable-heading p {
          max-width: 720px;
          margin: 0;
        }
        .old-solvable-count {
          display: grid;
          min-width: 150px;
          text-align: right;
        }
        .old-solvable-count strong {
          font-size: 32px;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }
        .old-solvable-count span {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .old-solvable-filters {
          display: grid;
          grid-template-columns: minmax(180px, 0.8fr) minmax(220px, 1fr) auto;
          gap: 12px;
          align-items: end;
          padding: 18px 24px;
          border-block: 1px solid var(--line);
          background: var(--surface-soft);
        }
        .old-solvable-filters button {
          gap: 8px;
          white-space: nowrap;
        }
        .old-solvable-filter-status {
          grid-column: 1 / -1;
          min-height: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .old-solvable-filter-status:empty {
          display: none;
        }
        .input-suffix {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
        }
        .input-suffix:focus-within {
          outline: 3px solid #315f7d;
          outline-offset: 3px;
        }
        .input-suffix input {
          border: 0;
          border-radius: 0;
          outline: 0;
        }
        .input-suffix span {
          padding-right: 14px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 500;
        }
        .old-solvable-results {
          gap: 0;
        }
        .old-solvable-toolbar,
        .old-solvable-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 24px;
        }
        .old-solvable-toolbar {
          border-bottom: 1px solid var(--line);
        }
        .select-all-label {
          display: flex;
          align-items: center;
          grid-template-columns: none;
          gap: 10px;
          min-height: 44px;
          cursor: pointer;
        }
        .old-solvable-table {
          min-width: 920px;
        }
        .moderation-table {
          min-width: 820px;
        }
        .moderation-table th:first-child,
        .moderation-table td:first-child {
          width: 48px;
        }
        .moderation-table th:last-child,
        .moderation-table td:last-child {
          width: 38%;
        }
        .old-solvable-table th:first-child,
        .old-solvable-table td:first-child {
          width: 48px;
        }
        .old-solvable-table th:nth-child(6),
        .old-solvable-table td:nth-child(6) {
          width: 38%;
        }
        .maintenance-description {
          max-width: 440px;
          line-height: 1.5;
        }
        .maintenance-incident-link {
          color: var(--ink);
          font-weight: 700;
          text-decoration: none;
        }
        .maintenance-incident-link:hover,
        .dashboard-muted-link:hover {
          text-decoration: underline;
        }
        .maintenance-card-link {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          margin-top: 8px;
        }
        .old-solvable-actions {
          border-top: 1px solid var(--line);
          background: var(--surface-soft);
        }
        .moderation-actions {
          justify-content: flex-end;
        }
        .moderation-actions label {
          width: min(100%, 280px);
        }
        .moderation-actions button {
          min-width: 230px;
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
          align-items: start;
        }
        .photo-stack {
          display: grid;
          gap: 16px;
          align-content: start;
        }
        .detail-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-height: 44px;
        }
        .detail-section-heading h2 {
          margin: 0;
        }
        .photo-upload-form,
        .photo-replace-form {
          margin: 0;
        }
        .photo-file-input {
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
        .photo-file-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: #fff;
          color: var(--ink);
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: background .16s ease, border-color .16s ease, transform .16s ease;
        }
        .photo-file-trigger:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .photo-file-trigger:focus-within,
        .photo-icon-button:focus-within {
          outline: 3px solid rgba(35, 117, 140, .22);
          outline-offset: 2px;
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
          padding: 5px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 999px;
          background: rgba(23, 32, 42, 0.32);
          backdrop-filter: blur(10px);
        }
        .photo-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 999px;
          background: rgba(23, 32, 42, 0.76);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background .16s ease, transform .16s ease;
        }
        .photo-icon-button:hover {
          background: rgba(23, 32, 42, 0.9);
          transform: translateY(-1px);
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
          padding: 4px;
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
          container-type: inline-size;
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
          align-items: center;
        }
        .detail-public-link {
          margin-left: auto;
          gap: 8px;
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
        .detail-edit-fields > label,
        .detail-edit-fields input,
        .detail-edit-fields select,
        .detail-edit-fields textarea {
          min-width: 0;
        }
        .detail-edit-fields .full {
          grid-column: 1 / -1;
        }
        .location-picker {
          display: grid;
          gap: 10px;
        }
        .location-picker-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .location-picker-actions button {
          width: auto;
        }
        .location-search-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          position: relative;
        }
        .location-search-row button {
          width: auto;
        }
        .location-search-results {
          position: absolute;
          z-index: 1200;
          top: calc(100% + 6px);
          right: 0;
          left: 0;
          display: grid;
          gap: 6px;
          max-height: 240px;
          padding: 6px;
          overflow-y: auto;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: var(--panel);
          box-shadow: 0 12px 28px rgba(23, 32, 42, 0.14);
        }
        .location-search-results:empty { display: none; }
        .location-result {
          width: 100%;
          min-height: 40px;
          padding: 8px 10px;
          text-align: left;
          color: var(--ink);
          background: var(--accent-soft);
          border: 1px solid var(--line);
        }
        .location-picker-map {
          height: 280px;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 14px;
        }
        @container (max-width: 390px) {
          .detail-edit-fields {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @container (max-width: 330px) {
          .location-search-row {
            grid-template-columns: minmax(0, 1fr);
          }
          .location-search-row button {
            width: 100%;
          }
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
        details.subtle-panel > summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          cursor: pointer;
          font-weight: 700;
          list-style: none;
        }
        details.subtle-panel > summary::-webkit-details-marker {
          display: none;
        }
        details.subtle-panel > summary::before {
          content: '›';
          font-size: 24px;
          line-height: 1;
          color: var(--muted);
          transition: transform .16s ease;
        }
        details.subtle-panel[open] > summary::before {
          transform: rotate(90deg);
        }
        .timeline-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
        }
        .timeline-toolbar label {
          display: grid;
          gap: 6px;
          font-weight: 600;
        }
        .timeline-toolbar select {
          min-width: 190px;
        }
        .timeline-icon {
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--surface-soft);
          color: var(--primary);
          font-size: 16px;
        }
        .timeline-table {
          min-width: 0;
        }
        .timeline-table th:first-child,
        .timeline-table td:first-child {
          width: 48px;
        }
        .timeline-table th:nth-child(2),
        .timeline-table td:nth-child(2) {
          width: 44%;
        }
        .timeline-detail {
          display: block;
          margin-top: 3px;
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
        .dashboard-mobile-nav {
          display: none;
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
        .dashboard-update {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          border: 1px solid #d9d4c7;
          border-radius: 16px;
          background: #faf8f2;
          color: var(--ink);
        }
        .dashboard-update-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #ebe6da;
          color: #625b4d;
          font-size: 22px;
        }
        .dashboard-update-copy {
          display: grid;
          gap: 3px;
          min-width: 0;
        }
        .dashboard-update-copy p {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }
        .dashboard-update-notes {
          display: grid;
          gap: 4px;
          margin: 8px 0 4px;
          padding-left: 18px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }
        .dashboard-update-command {
          margin-top: 6px !important;
        }
        .dashboard-update-copy code {
          color: var(--ink);
          font-size: 13px;
          font-weight: 700;
        }
        .dashboard-update-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid #c9c2b2;
          border-radius: 12px;
          color: var(--ink);
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }
        .dashboard-update-link:hover {
          background: #f1ede4;
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
        .external-report-table {
          min-width: 0;
        }
        .external-report-table th:first-child,
        .external-report-table td:first-child {
          width: 30%;
        }
        .external-report-table th:nth-child(2),
        .external-report-table td:nth-child(2) {
          width: 16%;
        }
        .external-report-table th:nth-child(3),
        .external-report-table td:nth-child(3) {
          width: 11%;
        }
        .external-report-table th:nth-child(4),
        .external-report-table td:nth-child(4) {
          width: 12%;
        }
        .external-report-table th:nth-child(5),
        .external-report-table td:nth-child(5) {
          width: 17%;
        }
        .external-report-table th:nth-child(6),
        .external-report-table td:nth-child(6) {
          width: 14%;
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
        .external-report-mobile-list {
          display: none;
        }
        .external-report-mobile-item {
          display: grid;
          gap: 7px;
          padding: 14px 0;
          border-top: 1px solid var(--line);
        }
        .external-report-mobile-item:first-child {
          border-top: 0;
        }
        .external-report-mobile-topline,
        .external-report-mobile-meta,
        .external-report-mobile-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .external-report-mobile-topline a {
          color: var(--ink);
          text-decoration: none;
          font-weight: 650;
          min-width: 0;
        }
        .external-report-mobile-meta {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
        .external-report-mobile-footer {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .external-report-mobile-count {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          flex: 0 0 auto;
          color: var(--ink);
          font-variant-numeric: tabular-nums;
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
        @media (max-width: 1120px) and (min-width: 769px) {
          .external-report-table th:nth-child(6),
          .external-report-table td:nth-child(6) {
            display: none;
          }
          .external-report-table th:first-child,
          .external-report-table td:first-child {
            width: 38%;
          }
          .external-report-table th:nth-child(2),
          .external-report-table td:nth-child(2) {
            width: 18%;
          }
          .external-report-table th:nth-child(3),
          .external-report-table td:nth-child(3) {
            width: 13%;
          }
          .external-report-table th:nth-child(4),
          .external-report-table td:nth-child(4) {
            width: 14%;
          }
          .external-report-table th:nth-child(5),
          .external-report-table td:nth-child(5) {
            width: 17%;
          }
        }
        @media (max-width: 1200px) {
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
        @media (max-width: 980px) and (min-width: 769px) {
          .detail-grid {
            grid-template-columns: minmax(0, 1fr);
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
          .topbar-actions {
            width: 100%;
            justify-content: flex-end;
          }
          .panel {
            padding: 18px 14px;
            border-radius: 18px;
          }
          .toast-region {
            top: 12px;
            right: 12px;
            width: calc(100vw - 24px);
          }
          .toast-close {
            width: 44px;
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
          .external-report-mobile-list {
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
          .settings-service-grid,
          .settings-coordinate-grid {
            grid-template-columns: 1fr;
          }
          .updates-channel-options {
            grid-template-columns: 1fr;
          }
          .updates-form-actions,
          .updates-check-row {
            align-items: stretch;
            flex-direction: column;
          }
          .updates-form-actions button,
          .updates-check-row button {
            width: 100%;
          }
          .settings-preview-panel {
            position: static;
          }
          .settings-section-actions {
            display: grid;
            align-items: stretch;
            justify-content: stretch;
          }
          .settings-section-save {
            width: 100%;
          }
          .settings-social-row {
            grid-template-columns: 48px minmax(0, 1fr) 48px;
          }
          .settings-social-fields {
            grid-template-columns: 1fr;
            gap: 8px;
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
          .dashboard-sidebar > .dashboard-nav {
            display: none;
          }
          .dashboard-mobile-nav {
            display: block;
            width: 100%;
          }
          .dashboard-mobile-nav summary {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            min-height: 56px;
            padding: 8px 14px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: #fff;
            cursor: pointer;
            list-style: none;
          }
          .dashboard-mobile-nav summary::-webkit-details-marker {
            display: none;
          }
          .dashboard-mobile-nav-current {
            display: grid;
            gap: 1px;
            min-width: 0;
          }
          .dashboard-mobile-nav-current span {
            color: var(--muted);
            font-size: 12px;
            font-weight: 600;
            line-height: 1.35;
          }
          .dashboard-mobile-nav-current strong {
            overflow: hidden;
            font-size: 16px;
            line-height: 1.35;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .dashboard-mobile-nav-chevron {
            flex: 0 0 auto;
            font-size: 22px;
            line-height: 1;
            transition: transform 160ms ease;
          }
          .dashboard-mobile-nav[open] .dashboard-mobile-nav-chevron {
            transform: rotate(180deg);
          }
          .dashboard-mobile-nav-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            margin-top: 8px;
            padding: 8px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 12px 30px rgba(23, 32, 42, 0.08);
          }
          .dashboard-mobile-nav-list a {
            display: flex;
            align-items: center;
            min-height: 48px;
            padding: 0 12px;
            border-radius: 12px;
            color: var(--ink);
            font-size: 14px;
            font-weight: 600;
            line-height: 1.35;
            text-decoration: none;
          }
          .dashboard-mobile-nav-list a.active {
            background: var(--accent-soft);
            color: var(--accent);
          }
          .dashboard-section-label,
          .dashboard-section-title {
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
          .dashboard-header.no-intro {
            min-height: 0;
            gap: 0;
            padding: 0;
            border: 0;
          }
          .dashboard-header.has-intro {
            gap: 0;
          }
          .dashboard-header.has-intro > p {
            margin: 0;
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
          .dashboard-update {
            grid-template-columns: 44px minmax(0, 1fr);
          }
          .dashboard-update-link {
            grid-column: 1 / -1;
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
          .table-scroll:has(.external-event-table) {
            overflow: visible;
          }
          .external-event-table.responsive-table {
            display: block;
            min-width: 0;
            width: 100%;
          }
          .external-event-table thead {
            display: none;
          }
          .external-event-table tbody {
            display: grid;
            gap: 10px;
          }
          .external-event-table tr {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px 12px;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: #fff;
          }
          .external-event-table td {
            display: block;
            width: auto !important;
            padding: 0;
            border: 0;
          }
          .external-event-table td:nth-child(2) {
            grid-row: 2;
            grid-column: 1 / -1;
            color: var(--muted);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 13px;
          }
          .external-event-table td:nth-child(3) {
            grid-row: 1;
            grid-column: 2;
            color: var(--muted);
            font-size: 13px;
          }
          .external-event-table td:nth-child(4) {
            grid-row: 3;
            grid-column: 1 / -1;
          }
          .external-event-table td:nth-child(4) button {
            width: auto;
          }
          .timeline-table-wrap {
            overflow: visible;
          }
          .timeline-table.responsive-table {
            display: block;
            min-width: 0;
            width: 100%;
          }
          .timeline-table thead {
            display: none;
          }
          .timeline-table tbody {
            display: grid;
            gap: 10px;
          }
          .timeline-table tr {
            display: grid;
            grid-template-columns: 28px minmax(0, 1fr);
            gap: 5px 10px;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: #fff;
          }
          .timeline-table td {
            display: block;
            width: auto !important;
            padding: 0;
            border: 0;
          }
          .timeline-table td:first-child {
            grid-row: 1 / span 3;
          }
          .timeline-table td:nth-child(2) {
            grid-column: 2;
          }
          .timeline-table td:nth-child(3),
          .timeline-table td:nth-child(4) {
            grid-column: 2;
            color: var(--muted);
            font-size: 13px;
          }
          .timeline-toolbar {
            display: grid;
            grid-template-columns: 1fr;
          }
          .location-search-row {
            grid-template-columns: 1fr;
          }
          .location-search-row button {
            width: 100%;
          }
          .location-picker-actions {
            align-items: stretch;
            flex-direction: column;
          }
          .location-picker-actions button {
            width: 100%;
          }
          .location-picker-map {
            height: 240px;
          }
          .timeline-toolbar select {
            width: 100%;
            min-width: 0;
          }
          details.subtle-panel > summary {
            align-items: flex-start;
          }
          details.subtle-panel > summary > span:last-child {
            text-align: right;
          }
          .table-cards {
            display: grid;
          }
          .bulk-controls > *,
          .old-solvable-filters > * {
            flex-basis: 100%;
          }
          .old-solvable-heading,
          .old-solvable-toolbar,
          .old-solvable-actions {
            align-items: stretch;
            flex-direction: column;
          }
          .old-solvable-heading {
            gap: 16px;
            padding: 20px 16px 16px;
          }
          .old-solvable-count {
            min-width: 0;
            text-align: left;
          }
          .old-solvable-filters {
            grid-template-columns: 1fr;
            padding: 16px;
          }
          .old-solvable-toolbar,
          .old-solvable-actions {
            gap: 10px;
            padding: 12px 16px;
          }
          .old-solvable-actions .actions {
            width: 100%;
          }
          .moderation-actions label,
          .moderation-actions button {
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      ${notice && notice.type !== 'error' ? `
        <div class="toast-region" aria-live="polite" aria-atomic="true">
          <div class="notice toast" id="success-toast" role="status">
            <span class="toast-icon" aria-hidden="true"><i class="mdi mdi-check"></i></span>
            <span class="toast-message">${escapeHtml(notice.message)}</span>
            <button class="toast-close" type="button" data-dismiss-toast aria-label="Cerrar notificacion">
              <i class="mdi mdi-close" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      ` : ''}
      <div class="shell">
        <div class="topbar">
          <div>
            <div class="brand">Basura Cero Admin</div>
            <div class="meta">${currentAdmin ? `Sesion iniciada como <strong>${escapeHtml(currentAdmin.username)}</strong>` : 'Acceso de administracion'}</div>
          </div>
          ${currentAdmin ? `
            <div class="topbar-actions">
              ${pendingUpdate ? `<a class="topbar-update-link" href="/admin/updates" aria-label="Actualización ${escapeAttr(pendingUpdate.version || '')} disponible. Ver actualizaciones"><i class="mdi mdi-update" aria-hidden="true"></i></a>` : ''}
              <form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${escapeAttr(csrfToken || '')}"><button class="button-ghost" type="submit">Cerrar sesion</button></form>
            </div>
          ` : ''}
        </div>
        <div class="panel">
          ${notice?.type === 'error' ? `<div class="notice error" role="alert" aria-live="assertive">${escapeHtml(notice.message)}</div>` : ''}
          ${safeBody}
        </div>
      </div>
      <div class="sr-only" id="form-status" role="status" aria-live="polite"></div>
      <script>
        (() => {
          const status = document.getElementById('form-status');
          const toast = document.getElementById('success-toast');
          let lastModalTrigger = null;
          const dismissToast = () => {
            if (!toast || toast.dataset.leaving === 'true') return;
            toast.dataset.leaving = 'true';
            toast.className += ' is-leaving';
            window.setTimeout(() => toast.closest('.toast-region')?.remove(), 180);
          };
          if (toast) {
            const toastClose = toast.querySelector('[data-dismiss-toast]');
            if (toastClose) toastClose.onclick = dismissToast;
            window.setTimeout(dismissToast, 5000);
            const url = new URL(window.location.href);
            if (url.searchParams.has('message')) {
              url.searchParams.delete('message');
              window.history.replaceState({}, '', url);
            }
          }
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

          document.addEventListener('click', (event) => {
            const button = event.target.closest('.number-sort-button');
            if (!button) return;
            const heading = button.closest('th[data-sort-number]');
            const table = heading?.closest('table[data-number-sortable]');
            const body = table?.tBodies?.[0];
            if (!heading || !table || !body) return;

            const column = Array.from(heading.parentElement.children).indexOf(heading);
            const rows = Array.from(body.rows);
            if (column < 0 || rows.length < 2) return;

            const nextDirection = table.dataset.sortColumn === String(column) && table.dataset.sortDirection === 'desc'
              ? 'asc'
              : 'desc';
            const numericValue = (row) => {
              const cell = row.cells[column];
              const raw = cell?.dataset.sortValue ?? cell?.textContent ?? '';
              const normalized = String(raw).replace(',', '.').replace(/[^0-9+.-]/g, '');
              const value = Number(normalized);
              return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
            };

            rows
              .map((row, index) => ({ row, index, value: numericValue(row) }))
              .sort((left, right) => {
                const comparison = nextDirection === 'asc'
                  ? left.value - right.value
                  : right.value - left.value;
                return comparison || left.index - right.index;
              })
              .forEach(({ row }) => body.appendChild(row));

            table.dataset.sortColumn = String(column);
            table.dataset.sortDirection = nextDirection;
            table.querySelectorAll('th[data-sort-number]').forEach((candidate) => {
              const active = candidate === heading;
              candidate.setAttribute('aria-sort', active ? (nextDirection === 'asc' ? 'ascending' : 'descending') : 'none');
              const candidateButton = candidate.querySelector('.number-sort-button');
              const indicator = candidate.querySelector('.number-sort-indicator');
              if (candidateButton) candidateButton.setAttribute('aria-pressed', active ? 'true' : 'false');
              if (indicator) indicator.textContent = active ? (nextDirection === 'asc' ? '↑' : '↓') : '↕';
            });
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
  const externalReports = incidencia.externalReports || [];
  const timeline = incidencia.timeline || [];
  const timelineActions = [...new Map(timeline.map((entry) => [entry.action, entry.label])).entries()];
  const timelineIcon = (entry) => {
    const icons = {
      incidencia_creada: 'mdi-plus-circle-outline',
      reporte_solucion: 'mdi-check-circle-outline',
      reporte_inadecuado: 'mdi-alert-circle-outline',
      aviso_ayuntamiento: 'mdi-whatsapp',
      aviso_importado: 'mdi-database-import-outline',
      update_incidencia: 'mdi-pencil-outline',
      set_incidencia_activa: 'mdi-play-circle-outline',
      set_incidencia_solucionada: 'mdi-check-decagram-outline',
      set_incidencia_spam: 'mdi-alert-octagon-outline',
      change_incidencia_tipo: 'mdi-tag-edit-outline',
      clear_solution_reports: 'mdi-broom',
      clear_inadequate_reports: 'mdi-broom',
      delete_solution_report: 'mdi-trash-can-outline',
      delete_inadequate_report: 'mdi-trash-can-outline',
      delete_incidencia_image: 'mdi-image-remove-outline',
      delete_external_report_event: 'mdi-trash-can-outline',
      auto_solve_old_incidencia: 'mdi-auto-fix',
      hydrate_location_data: 'mdi-map-marker-edit-outline'
    };
    return icons[entry.action] || (entry.type === 'sistema' ? 'mdi-cog-outline' : 'mdi-information-outline');
  };
  const statusOptions = ['activa', 'solucionada', 'spam']
    .map((estado) => `<option value="${estado}"${incidencia.estado === estado ? ' selected' : ''}>${escapeHtml(estado.charAt(0).toUpperCase() + estado.slice(1))}</option>`)
    .join('');

  return renderLayout({
    title: `Incidencia #${incidencia.id}`,
    currentAdmin,
    notice,
    csrfToken,
    body: `
      <link rel="stylesheet" href="/admin-assets/leaflet/leaflet.css">
      <section class="dashboard-shell">
        <aside class="dashboard-sidebar">
          <div>
            <div class="eyebrow">Admin</div>
            <h2 style="margin-bottom:8px">Panel de control</h2>
            <div class="small">Basura Cero</div>
          </div>
          ${renderAdminNavigation('incidencias')}
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
          <a class="button-link button-ghost detail-mini-button detail-public-link" href="/i/${incidencia.id}" target="_blank" rel="noopener noreferrer">
            <i class="mdi mdi-open-in-new" aria-hidden="true"></i>
            <span>Ver en la web</span>
          </a>
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
            <span class="detail-stat" title="Avisos al ayuntamiento"><i class="mdi mdi-account-group-outline" aria-hidden="true"></i>${incidencia.avisos_ayuntamiento || 0}</span>
          </div>
        </div>
      </div>
      <section class="detail-grid" style="margin-bottom:18px">
        <div class="subtle-panel photo-stack">
          <div class="detail-section-heading">
            <h2>Fotos</h2>
            <form method="post" action="/admin/incidencias/${incidencia.id}/imagenes/add" enctype="multipart/form-data" class="photo-upload-form" data-photo-file-form>
              <label class="photo-file-trigger">
                <i class="mdi mdi-plus" aria-hidden="true"></i>
                <span>Añadir foto</span>
                <input class="photo-file-input" type="file" name="imagen" accept="image/jpeg,image/png,image/webp" required data-photo-file-input>
              </label>
            </form>
          </div>
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
                  <form method="post" action="/admin/incidencias/${incidencia.id}/imagenes/${images[0].id}/replace" enctype="multipart/form-data" class="photo-replace-form" data-photo-file-form>
                    <label class="photo-icon-button" title="Reemplazar foto principal" aria-label="Reemplazar foto principal">
                      <i class="mdi mdi-image-sync-outline" aria-hidden="true"></i>
                      <input class="photo-file-input" type="file" name="imagen" accept="image/jpeg,image/png,image/webp" required data-photo-file-input>
                    </label>
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
                        <form method="post" action="/admin/incidencias/${incidencia.id}/imagenes/${image.id}/replace" enctype="multipart/form-data" class="photo-replace-form" data-photo-file-form>
                          <label class="photo-icon-button" title="Reemplazar foto ${index + 2}" aria-label="Reemplazar foto ${index + 2}">
                            <i class="mdi mdi-image-sync-outline" aria-hidden="true"></i>
                            <input class="photo-file-input" type="file" name="imagen" accept="image/jpeg,image/png,image/webp" required data-photo-file-input>
                          </label>
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
              <label>Latitud
                <input name="latitud" id="incidencia-latitud" type="number" step="any" value="${escapeAttr(incidencia.latitud ?? '')}" placeholder="41.652">
              </label>
              <label>Longitud
                <input name="longitud" id="incidencia-longitud" type="number" step="any" value="${escapeAttr(incidencia.longitud ?? '')}" placeholder="-4.728">
              </label>
              <div class="full location-picker">
                <label>Buscar dirección
                  <div class="location-search-row">
                    <input id="incidencia-location-search" type="search" placeholder="Calle, plaza o barrio en Valladolid" autocomplete="off">
                    <button type="button" class="button-ghost" id="incidencia-location-search-button">Buscar</button>
                <div class="location-search-results" id="incidencia-location-results" aria-live="polite"></div>
                  </div>
                </label>
                <div class="location-picker-actions">
                  <button type="button" class="button-ghost" id="incidencia-location-edit-toggle" aria-pressed="false">Ajustar punto en el mapa</button>
                  <span class="small" id="incidencia-location-edit-status">El mapa es solo de consulta.</span>
                </div>
                <div id="incidencia-location-map" class="location-picker-map" aria-label="Mapa para ajustar la ubicación"></div>
                <p class="small">Busca una dirección o activa el ajuste para mover el marcador. Al guardar se normalizan dirección y barrio.</p>
              </div>
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
      <details class="subtle-panel" style="margin-top:18px">
        <summary><span>Avisos al ayuntamiento</span><span class="small"><strong>${incidencia.avisos_ayuntamiento || 0}</strong> en total</span></summary>
        <p class="small">Cada fila corresponde a una persona distinta. La huella se muestra recortada y solo sirve para identificar el aviso al moderarlo.</p>
        ${externalReports.length
          ? `<div class="table-scroll" style="margin-top:16px">
              <table class="responsive-table admin-list-table ops-table external-event-table" data-number-sortable data-sort-column="2" data-sort-direction="desc">
                <thead><tr>
                  <th>Canal</th>
                  <th>Huella</th>
                  <th data-sort-number aria-sort="descending"><button class="number-sort-button" type="button" aria-pressed="true">Fecha <span class="number-sort-indicator">↓</span></button></th>
                  <th><span class="sr-only">Acciones</span></th>
                </tr></thead>
                <tbody>${externalReports.map((report) => `
                  <tr>
                    <td data-label="Canal"><strong>${escapeHtml(report.channel === 'whatsapp' ? 'WhatsApp' : report.channel)}</strong></td>
                    <td data-label="Huella">${escapeHtml(report.fingerprintShort)}</td>
                    <td data-label="Fecha" data-sort-value="${new Date(report.created_at).getTime() || 0}">${formatDateTime(report.created_at)}</td>
                    <td data-label="Acciones"><form method="post" action="/admin/incidencias/${incidencia.id}/avisos-ayuntamiento/${report.id}/delete" data-confirm="Este aviso se eliminara del contador y del ranking. ¿Continuar?"><button class="button-ghost detail-mini-button" type="submit">Borrar</button></form></td>
                  </tr>
                `).join('')}</tbody>
              </table>
            </div>`
          : '<div class="empty-state">No hay avisos individuales registrados en la aplicación.</div>'}
      </details>
      <details class="subtle-panel" style="margin-top:18px" data-incidencia-timeline>
        <summary><span>Historial de la incidencia</span><span class="small">${timeline.length} acciones</span></summary>
        <div class="timeline-toolbar">
          <label>Quién
            <select data-timeline-filter>
              <option value="">Todas</option>
              <option value="usuario">Usuarios</option>
              <option value="admin">Administración</option>
              <option value="sistema">Sistema</option>
            </select>
          </label>
          <label>Acción
            <select data-timeline-action-filter>
              <option value="">Todas las acciones</option>
              ${timelineActions.map(([action, label]) => `<option value="${escapeAttr(action)}">${escapeHtml(label)}</option>`).join('')}
            </select>
          </label>
        </div>
        ${timeline.length ? `<div class="table-scroll timeline-table-wrap">
          <table class="responsive-table admin-list-table ops-table timeline-table" data-number-sortable data-sort-column="3" data-sort-direction="desc">
            <thead><tr><th><span class="sr-only">Tipo</span></th><th>Acción</th><th>Quién</th><th data-sort-number aria-sort="descending"><button class="number-sort-button" type="button" aria-pressed="true">Fecha <span class="number-sort-indicator">↓</span></button></th></tr></thead>
            <tbody>${timeline.map((entry) => `
              <tr data-timeline-type="${escapeAttr(entry.type)}" data-timeline-action="${escapeAttr(entry.action)}">
                <td data-label="Tipo"><i class="mdi ${escapeAttr(timelineIcon(entry))} timeline-icon" aria-hidden="true"></i></td>
                <td data-label="Acción"><strong>${escapeHtml(entry.label)}</strong></td>
                <td data-label="Quién">${escapeHtml(entry.type === 'admin' ? 'Administración' : entry.type === 'sistema' ? 'Sistema' : 'Usuario')}${entry.detail ? `<span class="small timeline-detail">${escapeHtml(entry.detail)}</span>` : ''}</td>
                <td data-label="Fecha" data-sort-value="${new Date(entry.date).getTime() || 0}">${formatDateTime(entry.date)}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        </div>` : '<div class="empty-state">Aún no hay actividad registrada.</div>'}
      </details>
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
          const photoFileForms = document.querySelectorAll('form[data-photo-file-form]');
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
          photoFileForms.forEach((form) => {
            const input = form.querySelector('[data-photo-file-input]');
            input?.addEventListener('change', () => {
              if (input.files?.length) form.requestSubmit();
            });
          });
          const timelineFilter = document.querySelector('[data-timeline-filter]');
          const timelineActionFilter = document.querySelector('[data-timeline-action-filter]');
          const applyTimelineFilters = () => {
            document.querySelectorAll('[data-timeline-type]').forEach((row) => {
              const actorMatches = !timelineFilter?.value || row.dataset.timelineType === timelineFilter.value;
              const actionMatches = !timelineActionFilter?.value || row.dataset.timelineAction === timelineActionFilter.value;
              row.hidden = !actorMatches || !actionMatches;
            });
          };
          timelineFilter?.addEventListener('change', applyTimelineFilters);
          timelineActionFilter?.addEventListener('change', applyTimelineFilters);
        })();
      </script>
      <script src="/admin-assets/leaflet/leaflet.js"></script>
      <script>
        (() => {
          const mapElement = document.getElementById('incidencia-location-map');
          const latitude = document.getElementById('incidencia-latitud');
          const longitude = document.getElementById('incidencia-longitud');
          const search = document.getElementById('incidencia-location-search');
          const searchButton = document.getElementById('incidencia-location-search-button');
          const results = document.getElementById('incidencia-location-results');
          const editToggle = document.getElementById('incidencia-location-edit-toggle');
          const editStatus = document.getElementById('incidencia-location-edit-status');
          if (!mapElement || !latitude || !longitude || !window.L) return;
          const fallback = [41.6523, -4.7245];
          const initial = [Number(latitude.value), Number(longitude.value)];
          const start = Number.isFinite(initial[0]) && Number.isFinite(initial[1]) ? initial : fallback;
          const map = L.map(mapElement, { scrollWheelZoom: false }).setView(start, 16);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }).addTo(map);
          let marker;
          let editingMap = false;
          const updateEditingState = () => {
            editToggle?.setAttribute('aria-pressed', String(editingMap));
            if (editToggle) editToggle.textContent = editingMap ? 'Terminar ajuste en el mapa' : 'Ajustar punto en el mapa';
            if (editStatus) editStatus.textContent = editingMap ? 'Pulsa o arrastra el marcador para cambiar el punto.' : 'El mapa es solo de consulta.';
            if (marker?.dragging) editingMap ? marker.dragging.enable() : marker.dragging.disable();
          };
          const setLocation = (lat, lng, pan = true) => {
            latitude.value = Number(lat).toFixed(6);
            longitude.value = Number(lng).toFixed(6);
            if (!marker) marker = L.marker([lat, lng], { draggable: false }).addTo(map);
            else marker.setLatLng([lat, lng]);
            if (pan) map.setView([lat, lng], 16);
            marker.off('dragend').on('dragend', () => { const point = marker.getLatLng(); setLocation(point.lat, point.lng, false); });
          };
          setLocation(start[0], start[1], false);
          map.on('click', (event) => { if (editingMap) setLocation(event.latlng.lat, event.latlng.lng); });
          editToggle?.addEventListener('click', () => { editingMap = !editingMap; updateEditingState(); });
          updateEditingState();
          const performSearch = async () => {
            const query = search.value.trim();
            if (query.length < 3) { results.textContent = 'Escribe al menos 3 caracteres.'; return; }
            results.textContent = 'Buscando…';
            try {
              const response = await fetch('/admin/geocode/search?q=' + encodeURIComponent(query), { headers: { Accept: 'application/json' } });
              const payload = await response.json();
              if (!response.ok) throw new Error(payload.error || 'Búsqueda no disponible');
              const matches = payload.results || [];
              results.innerHTML = '';
              if (!matches.length) { results.textContent = 'No se han encontrado direcciones.'; return; }
              matches.forEach((match) => {
                const button = document.createElement('button');
                button.type = 'button'; button.className = 'location-result'; button.textContent = match.displayName;
                button.addEventListener('click', () => { setLocation(match.latitud, match.longitud); results.innerHTML = ''; });
                results.appendChild(button);
              });
            } catch (_error) { results.textContent = 'No se ha podido buscar la dirección. Puedes mover el marcador en el mapa.'; }
          };
          searchButton?.addEventListener('click', performSearch);
          search?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); performSearch(); } });
          search?.addEventListener('keydown', (event) => { if (event.key === 'Escape') results.innerHTML = ''; });
          document.addEventListener('click', (event) => {
            if (!event.target.closest('.location-search-row')) results.innerHTML = '';
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
            <span class="small">#${incidencia.id}</span>
            <a href="/admin/incidencias/${incidencia.id}">${escapeHtml(incidencia.descripcion || 'Sin descripcion')}</a>
            <span class="small">${escapeHtml(incidencia.direccion || incidencia.barrio || 'Sin ubicacion')}</span>
          </div>
        </td>
        <td>${renderTipoBadge(incidencia.tipo, incidencia.tipo_icono, true)}</td>
        <td><span class="status-chip">${escapeHtml(incidencia.estado || 'Sin estado')}</span></td>
        <td>${escapeHtml(incidencia.barrio || 'Sin barrio')}</td>
        <td>${incidencia.avisos_ayuntamiento || 0}</td>
        <td>${formatDate(incidencia.fecha)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="8">No hay incidencias que coincidan con los filtros actuales.</td></tr>';

  const cards = incidencias.length
    ? incidencias.map((incidencia) => `
      <article class="ops-mobile-item">
        <label class="ops-mobile-check-target" aria-label="Seleccionar incidencia ${incidencia.id}">
          <input class="ops-mobile-check" type="checkbox" name="selectedIds" value="${incidencia.id}">
        </label>
        ${incidencia.imageUrl ? `<img class="ops-mobile-thumb" src="${escapeAttr(incidencia.imageUrl)}" alt="Foto de la incidencia ${incidencia.id}">` : '<div class="ops-mobile-thumb"></div>'}
        <div class="ops-mobile-body">
          <div class="ops-mobile-topline">
            <a href="/admin/incidencias/${incidencia.id}">#${incidencia.id} · ${escapeHtml(incidencia.descripcion || 'Sin descripcion')}</a>
            <span class="ops-mobile-date">${formatDate(incidencia.fecha)}</span>
          </div>
          <div class="ops-mobile-meta">
            <span>${renderTipoBadge(incidencia.tipo, incidencia.tipo_icono, true)}</span>
            <span class="status-chip">${escapeHtml(incidencia.estado || 'Sin estado')}</span>
            <span class="small"><i class="mdi mdi-account-group-outline" aria-hidden="true"></i> ${incidencia.avisos_ayuntamiento || 0}</span>
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
                    <th><a class="ops-sort${filters.sortBy === 'id' ? ' active' : ''}" href="${buildSortUrl('id')}">Incidencia ${sortIndicator('id')}</a></th>
                    <th><a class="ops-sort${filters.sortBy === 'tipo' ? ' active' : ''}" href="${buildSortUrl('tipo')}">Categoria ${sortIndicator('tipo')}</a></th>
                    <th><a class="ops-sort${filters.sortBy === 'estado' ? ' active' : ''}" href="${buildSortUrl('estado')}">Estado ${sortIndicator('estado')}</a></th>
                    <th><a class="ops-sort${filters.sortBy === 'barrio' ? ' active' : ''}" href="${buildSortUrl('barrio')}">Barrio ${sortIndicator('barrio')}</a></th>
                    <th><a class="ops-sort${filters.sortBy === 'avisos' ? ' active' : ''}" href="${buildSortUrl('avisos')}">Avisos al ayuntamiento ${sortIndicator('avisos')}</a></th>
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

function renderExternalReportsPage({ currentAdmin, notice, reports, tipos, filters, csrfToken }) {
  const buildSortUrl = (sortBy) => {
    const nextDir = filters.sortBy === sortBy && filters.sortDir === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.estado) params.set('estado', filters.estado);
    if (filters.tipoId) params.set('tipoId', filters.tipoId);
    params.set('sortBy', sortBy);
    params.set('sortDir', nextDir);
    return `/admin/avisos-ayuntamiento?${params.toString()}`;
  };
  const sortIndicator = (sortBy) => {
    if (filters.sortBy !== sortBy) return '<span class="arrow">↕</span>';
    return `<span class="arrow">${filters.sortDir === 'asc' ? '↑' : '↓'}</span>`;
  };
  const rows = reports.length
    ? reports.map((report) => `
      <tr>
        <td data-label="Incidencia">
          <div class="ops-title">
            <span class="small">#${report.id}</span>
            <a href="/admin/incidencias/${report.id}">${escapeHtml(report.descripcion || 'Sin descripcion')}</a>
            <span class="small">${escapeHtml(report.direccion || report.barrio || 'Sin ubicacion')}</span>
          </div>
        </td>
        <td data-label="Categoría">${renderTipoBadge(report.tipo, report.tipo_icono, true)}</td>
        <td data-label="Estado"><span class="status-chip">${escapeHtml(report.estado || 'Sin estado')}</span></td>
        <td data-label="Barrio">${escapeHtml(report.barrio || 'Sin barrio')}</td>
        <td data-label="Avisos al ayuntamiento"><strong>${report.avisos_ayuntamiento}</strong></td>
        <td data-label="Fecha">${formatDate(report.fecha)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6">No hay avisos al ayuntamiento que coincidan con los filtros actuales.</td></tr>';
  const cards = reports.length
    ? reports.map((report) => `
      <article class="external-report-mobile-item">
        <div class="external-report-mobile-topline">
          <a href="/admin/incidencias/${report.id}">#${report.id} · ${escapeHtml(report.descripcion || 'Sin descripcion')}</a>
          <strong class="external-report-mobile-count"><i class="mdi mdi-account-group-outline" aria-hidden="true"></i>${report.avisos_ayuntamiento}</strong>
        </div>
        <div class="external-report-mobile-meta">
          ${renderTipoBadge(report.tipo, report.tipo_icono, true)}
          <span class="status-chip">${escapeHtml(report.estado || 'Sin estado')}</span>
        </div>
        <div class="external-report-mobile-footer">
          <span>${escapeHtml(report.barrio || report.direccion || 'Sin ubicación')}</span>
          <span>${formatDate(report.fecha)}</span>
        </div>
      </article>
    `).join('')
    : '<div class="empty-state">No hay avisos al ayuntamiento que coincidan con los filtros actuales.</div>';

  return renderAdminSectionLayout({
    title: 'Avisos al ayuntamiento',
    currentAdmin,
    notice,
    csrfToken,
    eyebrow: 'Participación',
    intro: 'Explora las incidencias cuyo botón de WhatsApp se ha abierto. Cada persona solo cuenta una vez por incidencia; el dato no confirma el envío del mensaje.',
    activeNav: 'avisos-ayuntamiento',
    content: `
      <div class="ops-page">
        <form method="get" action="/admin/avisos-ayuntamiento" class="ops-toolbar">
          <div class="ops-filters">
            <label>Buscar
              <input name="search" value="${escapeAttr(filters.search || '')}" placeholder="Descripción, dirección o barrio">
            </label>
            <label>Estado
              <select name="estado">
                <option value="">Todos</option>
                <option value="activa"${filters.estado === 'activa' ? ' selected' : ''}>Activa</option>
                <option value="solucionada"${filters.estado === 'solucionada' ? ' selected' : ''}>Solucionada</option>
                <option value="spam"${filters.estado === 'spam' ? ' selected' : ''}>Spam</option>
              </select>
            </label>
            <label>Categoría
              ${renderTipoSelect({
                name: 'tipoId',
                tipos,
                selectedValue: filters.tipoId || '',
                id: 'avisos-filter-tipo',
                includeEmptyOption: 'Todas'
              })}
            </label>
            <button type="submit">Aplicar filtros</button>
          </div>
          <div class="ops-actions">
            <a class="button-link button-ghost" href="/admin/avisos-ayuntamiento">Limpiar filtros</a>
          </div>
        </form>
        <section class="ops-surface">
          <div class="ops-table-wrap">
            <table class="responsive-table admin-list-table ops-table external-report-table">
              <thead>
                <tr>
                  <th>Incidencia</th>
                  <th><a class="ops-sort${filters.sortBy === 'tipo' ? ' active' : ''}" href="${buildSortUrl('tipo')}">Categoría ${sortIndicator('tipo')}</a></th>
                  <th><a class="ops-sort${filters.sortBy === 'estado' ? ' active' : ''}" href="${buildSortUrl('estado')}">Estado ${sortIndicator('estado')}</a></th>
                  <th><a class="ops-sort${filters.sortBy === 'barrio' ? ' active' : ''}" href="${buildSortUrl('barrio')}">Barrio ${sortIndicator('barrio')}</a></th>
                  <th><a class="ops-sort${filters.sortBy === 'avisos' ? ' active' : ''}" href="${buildSortUrl('avisos')}" title="Avisos al ayuntamiento">Avisos ${sortIndicator('avisos')}</a></th>
                  <th><a class="ops-sort${filters.sortBy === 'fecha' ? ' active' : ''}" href="${buildSortUrl('fecha')}">Fecha ${sortIndicator('fecha')}</a></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div class="external-report-mobile-list">${cards}</div>
        </section>
      </div>
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

function renderDashboardPage({ currentAdmin, notice, dashboard, updateStatus, csrfToken }) {
  const { stats, recentWithPhoto, byTipo, externalReports = [] } = dashboard;
  const updateRelease = updateStatus?.updateAvailable ? updateStatus.release : null;
  const updateHeading = updateStatus?.channel === 'beta'
    ? `Actualización beta ${updateRelease?.version || ''} disponible`
    : updateStatus?.currentVersion
      ? `Tienes la versión ${updateStatus.currentVersion}. La versión ${updateRelease?.version || ''} está disponible.`
      : `Versión ${updateRelease?.version || ''} disponible`;
  const updateNotes = updateRelease?.notes?.length
    ? `<ul class="dashboard-update-notes">${updateRelease.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
    : '';
  const recentRows = recentWithPhoto.length
    ? recentWithPhoto.map((item) => `
      <tr>
        <td data-label="Foto">${item.imageUrl ? `<img class="dashboard-thumb" src="${escapeAttr(item.imageUrl)}" alt="Foto de la incidencia ${item.id}">` : '<div class="dashboard-thumb"></div>'}</td>
        <td data-label="Incidencia" data-sort-value="${item.id}"><a href="/admin/incidencias/${item.id}">#${item.id} · ${escapeHtml(item.descripcion || 'Sin descripcion')}</a></td>
        <td data-label="Categoria">${renderTipoBadge(item.tipo || '-', item.tipo_icono, true)}</td>
        <td data-label="Estado"><span class="status-chip">${escapeHtml(item.estado || '-')}</span></td>
        <td data-label="Zona">${escapeHtml(item.barrio || item.direccion || '-')}</td>
        <td data-label="Avisos al ayuntamiento">${item.avisos_ayuntamiento || 0}</td>
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
  const externalReportRows = externalReports.length
    ? externalReports.map((report) => `
      <tr>
        <td data-label="Incidencia"><a href="/admin/incidencias/${report.incidenciaId}">#${report.incidenciaId} · ${escapeHtml(report.descripcion || 'Sin descripcion')}</a></td>
        <td data-label="Avisos al ayuntamiento">${report.total}</td>
        <td data-label="Estado"><span class="status-chip">${escapeHtml(report.estado || '-')}</span></td>
      </tr>
    `).join('')
    : '<tr><td colspan="3">Todavia no hay avisos al ayuntamiento registrados.</td></tr>';

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
          ${renderAdminNavigation('dashboard')}
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

          ${updateRelease ? `
            <section class="dashboard-update" role="status" aria-label="Actualizacion disponible">
              <div class="dashboard-update-icon" aria-hidden="true"><i class="mdi mdi-update"></i></div>
              <div class="dashboard-update-copy">
                <strong>${escapeHtml(updateHeading)}</strong>
                ${updateNotes}
                <p class="dashboard-update-command">Ejecuta <code>./scripts/upgrade.sh</code> desde el servidor para instalarla.</p>
              </div>
              ${updateRelease.url ? `<a class="dashboard-update-link" href="${escapeAttr(updateRelease.url)}" target="_blank" rel="noopener noreferrer">Ver novedades en GitHub</a>` : ''}
            </section>
          ` : ''}

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
            <table class="dashboard-table" data-number-sortable>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">Incidencia <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th>
                  <th>Categoria</th>
                  <th>Estado</th>
                  <th>Zona</th>
                  <th>Avisos al ayuntamiento</th>
                </tr>
              </thead>
              <tbody>${recentRows}</tbody>
            </table>
          </section>

          <section class="dashboard-section">
            <div class="dashboard-section-header">
              <div>
                <h2 style="margin-bottom:6px">Avisos al ayuntamiento</h2>
                <p class="small">Una muestra de las incidencias con más aperturas únicas; no confirma que el mensaje se haya enviado.</p>
              </div>
              <a class="dashboard-muted-link" href="/admin/avisos-ayuntamiento">Ver todos</a>
            </div>
            <table class="dashboard-table">
              <thead><tr><th>Incidencia</th><th>Avisos</th><th>Estado</th></tr></thead>
              <tbody>${externalReportRows}</tbody>
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

function renderAdminNavigation(activeNav) {
  const items = [
    ['/admin', 'Vista general', 'dashboard'],
    ['/admin/incidencias', 'Incidencias', 'incidencias'],
    ['/admin/avisos-ayuntamiento', 'Avisos al ayuntamiento', 'avisos-ayuntamiento'],
    ['/admin/categorias', 'Categorías', 'categorias'],
    ['/admin/maintenance', 'Mantenimiento', 'maintenance'],
    ['/admin/configuracion', 'Configuración', 'configuracion'],
    ['/admin/administradores', 'Administradores', 'administradores'],
    ['/admin/auditoria', 'Auditoría', 'auditoria'],
    ['/admin/updates', 'Actualizaciones', 'updates']
  ];
  const activeItem = items.find(([, , key]) => key === activeNav) || items[0];
  const links = items
    .map(([href, label, key]) => `<a class="${activeNav === key ? 'active' : ''}" href="${href}"${activeNav === key ? ' aria-current="page"' : ''}>${label}</a>`)
    .join('');

  return `
    <nav class="dashboard-nav" aria-label="Secciones del panel">${links}</nav>
    <details class="dashboard-mobile-nav">
      <summary>
        <span class="dashboard-mobile-nav-current">
          <span>Sección actual</span>
          <strong>${escapeHtml(activeItem[1])}</strong>
        </span>
        <i class="mdi mdi-chevron-down dashboard-mobile-nav-chevron" aria-hidden="true"></i>
      </summary>
      <nav class="dashboard-mobile-nav-list" aria-label="Cambiar sección">${links}</nav>
    </details>`;
}

function renderAdminSectionLayout({ currentAdmin, notice, title, eyebrow, intro, activeNav, content, csrfToken }) {
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
          ${renderAdminNavigation(activeNav)}
          <div class="dashboard-sidebar-meta">
            <div class="small">Sesion: ${escapeHtml(currentAdmin.username)}</div>
          </div>
        </aside>
        <div class="dashboard-main">
          <section class="dashboard-header ${intro ? 'has-intro' : 'no-intro'}">
            <div class="dashboard-header-top">
              <div>
                <div class="eyebrow dashboard-section-label">${escapeHtml(eyebrow)}</div>
                <h1 class="dashboard-section-title">${escapeHtml(title)}</h1>
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

function renderUpdatesPage({ currentAdmin, notice, channel, installedRelease, updateStatus, csrfToken }) {
  const installedVersion = installedRelease?.version || 'Desconocida';
  const installedVersionContent = installedRelease?.url
    ? `<a class="updates-version-link" href="${escapeAttr(installedRelease.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(installedVersion)}</span><i class="mdi mdi-open-in-new" aria-hidden="true"></i><span class="sr-only">: ver novedades en GitHub</span></a>`
    : escapeHtml(installedVersion);
  const availableRelease = updateStatus?.updateAvailable ? updateStatus.release : null;
  const availableTitle = updateStatus?.channel === 'beta'
    ? `Actualización beta ${availableRelease?.version || ''} disponible`
    : `Tienes la versión ${installedVersion}. La versión ${availableRelease?.version || ''} está disponible.`;
  const availableNotes = availableRelease?.notes?.length
    ? `<ul class="dashboard-update-notes">${availableRelease.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
    : '';

  return renderAdminSectionLayout({
    currentAdmin,
    notice,
    csrfToken,
    title: 'Actualizaciones',
    eyebrow: 'Sistema',
    intro: 'Elige cuándo recibir nuevas versiones y revisa si hay alguna disponible.',
    activeNav: 'updates',
    content: `
      <section class="updates-summary" aria-label="Estado de la instalación">
        <div class="updates-summary-item">
          <span>Versión instalada</span>
          <strong>${installedVersionContent}</strong>
        </div>
        <div class="updates-summary-item">
          <span>Canal activo</span>
          <strong>${channel === 'beta' ? 'Beta' : 'Estable'}</strong>
        </div>
      </section>

      ${availableRelease ? `
        <section class="dashboard-update" role="status" aria-label="Actualización disponible">
          <div class="dashboard-update-icon" aria-hidden="true"><i class="mdi mdi-update"></i></div>
          <div class="dashboard-update-copy">
            <strong>${escapeHtml(availableTitle)}</strong>
            ${availableNotes}
            <p class="dashboard-update-command">Ejecuta <code>./scripts/upgrade.sh</code> desde el servidor para instalarla.</p>
          </div>
          ${availableRelease.url ? `<a class="dashboard-update-link" href="${escapeAttr(availableRelease.url)}" target="_blank" rel="noopener noreferrer">Ver novedades en GitHub</a>` : ''}
        </section>
      ` : ''}

      <section class="dashboard-section" aria-labelledby="updates-channel-title">
        <div class="dashboard-section-header">
          <div>
            <h2 id="updates-channel-title" style="margin-bottom:6px">Canal de actualizaciones</h2>
            <p class="small">Estable es la opción adecuada para la mayoría de instalaciones.</p>
          </div>
        </div>
        <form method="post" action="/admin/updates/channel">
          <fieldset class="updates-channel-options">
            <legend class="sr-only">Selecciona un canal de actualizaciones</legend>
            <label class="updates-channel-option">
              <input type="radio" name="UPDATE_CHANNEL" value="stable" ${channel === 'stable' ? 'checked' : ''} required>
              <span class="updates-channel-copy">
                <strong>Estable</strong>
                <span class="updates-recommended">Recomendado</span>
                <span>Recibe solo versiones publicadas y recomendadas para el uso habitual.</span>
              </span>
            </label>
            <label class="updates-channel-option">
              <input type="radio" name="UPDATE_CHANNEL" value="beta" ${channel === 'beta' ? 'checked' : ''} required>
              <span class="updates-channel-copy">
                <strong>Beta</strong>
                <span>Recibe antes las últimas novedades en pruebas. Puede incluir funciones que todavía se están validando.</span>
              </span>
            </label>
          </fieldset>
          <div class="updates-form-actions" style="margin-top:16px">
            <span class="small">Cambiar de canal no instala nada automáticamente.</span>
            <button type="submit">Guardar canal</button>
          </div>
        </form>
      </section>

      <section class="dashboard-section" aria-labelledby="updates-check-title">
        <div class="updates-check-row">
          <div class="updates-check-copy">
            <h2 id="updates-check-title">Buscar actualizaciones</h2>
            <p class="small">La comprobación automática se realiza cada seis horas.</p>
          </div>
          <form method="post" action="/admin/updates/check">
            <button type="submit" class="button-ghost" data-update-check>Comprobar ahora</button>
          </form>
        </div>
      </section>
      <script>
        document.querySelector('[data-update-check]')?.closest('form')?.addEventListener('submit', (event) => {
          const button = event.submitter;
          if (button) button.textContent = 'Comprobando…';
        });
      </script>
    `
  });
}

function renderSettingsPage({ currentAdmin, notice, settings, csrfToken }) {
  let socialLinks = [];
  try {
    const parsedLinks = JSON.parse(settings.APP_SOCIAL_LINKS || '[]');
    socialLinks = Array.isArray(parsedLinks) ? parsedLinks : [];
  } catch (_error) {
    socialLinks = [];
  }
  const socialIconJson = escapeAttr(JSON.stringify(getAllMdiIcons()));
  const recommendedSocialIconJson = escapeAttr(JSON.stringify(CURATED_SOCIAL_ICON_OPTIONS));
  const field = (key, label, options = {}) => `
    <label class="${options.wide ? 'field-wide' : ''}">${escapeHtml(label)}
      ${options.textarea
    ? `<textarea name="${key}" maxlength="${options.maxLength || 240}" rows="3" ${options.required === false ? '' : 'required'}>${escapeHtml(settings[key])}</textarea>`
    : `<input name="${key}" type="${options.type || 'text'}" value="${escapeAttr(settings[key])}" ${options.maxLength ? `maxlength="${options.maxLength}"` : ''} ${options.required === false ? '' : 'required'}>`}
    </label>`;
  const colorField = (key, label) => `
    <label class="settings-color-row">
      <span>${escapeHtml(label)}</span>
      <input type="color" name="${key}" value="${escapeAttr(settings[key])}" data-settings-color="${key}" aria-label="Color ${escapeAttr(label)}">
    </label>`;
  const socialLinkRow = (link = {}) => `
    <div class="settings-social-row" data-social-row>
      <button type="button" class="button-ghost settings-social-icon-trigger" data-social-icon-trigger aria-label="Elegir icono para ${escapeAttr(link.name || 'el enlace')}"><i class="mdi ${escapeAttr(link.icon || 'mdi-link')}" aria-hidden="true"></i></button>
      <div class="settings-social-fields">
        <label><span class="sr-only">Nombre</span>
          <input type="text" maxlength="60" value="${escapeAttr(link.name || '')}" placeholder="Nombre" aria-label="Nombre del enlace" data-social-name required>
        </label>
        <label><span class="sr-only">URL</span>
          <input type="url" maxlength="300" value="${escapeAttr(link.url || '')}" placeholder="URL" aria-label="URL del enlace" data-social-url required>
        </label>
      </div>
      <input type="hidden" value="${escapeAttr(link.icon || 'mdi-link')}" data-social-icon>
      <button type="button" class="button-ghost settings-social-remove" data-social-remove aria-label="Eliminar enlace"><i class="mdi mdi-delete-outline" aria-hidden="true"></i></button>
    </div>`;
  const sectionSaveButton = (sectionName, sectionKey) => `
    <div class="settings-section-actions">
      <span class="settings-save-status" data-settings-status="${escapeAttr(sectionKey)}" role="status" aria-live="polite"></span>
      <button type="submit" name="_section" value="${escapeAttr(sectionKey)}" formnovalidate class="settings-section-save" data-settings-save aria-label="Guardar cambios de ${escapeAttr(sectionName)}">Guardar cambios</button>
    </div>`;
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
          <section class="settings-section" data-settings-section="identity">
            <div>
              <h2>Identidad y apariencia</h2>
              <p class="small">Nombre, imágenes, colores y textos del sitio público.</p>
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
            <div class="settings-color-block">
              <div class="settings-color-heading">
                <h3>Colores</h3>
                <p class="small">Paleta utilizada en la interfaz pública.</p>
              </div>
              <div class="settings-color-list">
                ${colorField('APP_PRIMARY_COLOR', 'Principal')}
                ${colorField('APP_SECONDARY_COLOR', 'Secundario')}
                ${colorField('APP_BACKGROUND_COLOR', 'Fondo')}
                ${colorField('APP_SUCCESS_COLOR', 'Éxito')}
                ${colorField('APP_ERROR_COLOR', 'Error')}
                ${colorField('APP_WARNING_COLOR', 'Aviso')}
                ${colorField('APP_INFO_COLOR', 'Información')}
              </div>
            </div>
            <div class="settings-subsection">
              <div class="settings-subsection-heading">
                <h3>Textos públicos</h3>
                <p class="small">Aparecen al reportar y resolver incidencias.</p>
              </div>
              <div class="settings-fields">
                ${field('VITE_INSTRUCCIONES_REGISTRO', 'Instrucciones al reportar', { textarea: true, maxLength: 300, wide: true, required: false })}
                ${field('TEXTO_BOTON_RESOLVER', 'Botón para resolver una incidencia', { maxLength: 40 })}
                ${field('TEXTO_ESTADO_SOLUCIONADO', 'Estado de una incidencia resuelta', { maxLength: 40 })}
              </div>
            </div>
            <div class="settings-subsection">
              <div class="settings-subsection-heading">
                <h3>Enlaces públicos</h3>
                <p class="small">Aparecen en el menú y en la guía.</p>
              </div>
              <input type="hidden" name="APP_SOCIAL_LINKS" value="${escapeAttr(settings.APP_SOCIAL_LINKS || '[]')}" data-social-json>
              <div class="settings-social-list" data-social-list>
                ${socialLinks.map((link) => socialLinkRow(link)).join('')}
              </div>
              <div class="settings-social-empty" data-social-empty${socialLinks.length ? ' hidden' : ''}>No hay enlaces configurados.</div>
              <button type="button" class="button-ghost settings-upload-button" data-social-add>Añadir enlace</button>
            </div>
            ${sectionSaveButton('Identidad y apariencia', 'identity')}
          </section>
          <section class="settings-section" data-settings-section="map">
            <div>
              <h2>Mapa y proximidad</h2>
              <p class="small">Define dónde se puede reportar, buscar direcciones y mostrar incidencias cercanas.</p>
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
            <div class="settings-fields">
              ${selectField('SEARCH_REGION_LIMIT_ENABLED', 'Limitar la búsqueda de direcciones', [['false', 'No'], ['true', 'Sí']])}
              ${field('SEARCH_REGION_QUERY', 'Región de búsqueda', { maxLength: 120, required: false })}
              <label>Distancia máxima de incidencias cercanas
                <span class="input-suffix">
                  <input name="DISTANCIA_MAXIMA_CERCANAS" type="number" inputmode="numeric" min="100" max="50000" value="${escapeAttr(settings.DISTANCIA_MAXIMA_CERCANAS)}" required>
                  <span>metros</span>
                </span>
              </label>
            </div>
            ${sectionSaveButton('Mapa y proximidad', 'map')}
          </section>
          <section class="settings-section" data-settings-section="resolution">
            <div>
              <h2>Resolución de incidencias</h2>
              <p class="small">Configura los umbrales que determinan cuándo una incidencia se considera solucionada.</p>
            </div>
            <div class="settings-fields">
              <label>Votos mínimos para considerar una incidencia como solucionada
                <input name="REPORTES_PARA_SOLUCIONAR" type="number" inputmode="numeric" min="1" max="100" value="${escapeAttr(settings.REPORTES_PARA_SOLUCIONAR)}" required>
              </label>
              <label>Se considerará una incidencia antigua a partir de
                <span class="input-suffix">
                  <input name="DIAS_PARA_CONSIDERAR_ANTIGUA" type="number" inputmode="numeric" min="1" max="3650" value="${escapeAttr(settings.DIAS_PARA_CONSIDERAR_ANTIGUA)}" required>
                  <span>días</span>
                </span>
              </label>
              <label>Votos mínimos para considerar una incidencia antigua como solucionada
                <input name="REPORTES_PARA_SOLUCIONAR_ANTIGUA" type="number" inputmode="numeric" min="1" max="100" value="${escapeAttr(settings.REPORTES_PARA_SOLUCIONAR_ANTIGUA)}" required>
              </label>
            </div>
            <p class="small">El autor siempre puede resolver su incidencia con un voto.</p>
            ${sectionSaveButton('Resolución de incidencias', 'resolution')}
          </section>
          <section class="settings-section" data-settings-section="whatsapp">
            <div>
              <h2>Reporte por WhatsApp</h2>
              <p class="small">Permite enviar una incidencia al teléfono del organismo responsable.</p>
            </div>
            <div class="settings-fields">
              ${selectField('WHATSAPP_SHARE_ENABLED', 'Mostrar la opción de WhatsApp', [['false', 'No'], ['true', 'Sí']])}
            </div>
            <div class="settings-fields" id="whatsapp-dependent-fields"${settings.WHATSAPP_SHARE_ENABLED === 'true' ? '' : ' hidden'}>
              <label>Teléfono de destino
                <input name="WHATSAPP_SHARE_PHONE" type="tel" inputmode="numeric" autocomplete="tel" maxlength="15" value="${escapeAttr(settings.WHATSAPP_SHARE_PHONE)}" placeholder="34600100100" aria-describedby="whatsapp-phone-help">
                <span class="small" id="whatsapp-phone-help">Incluye el prefijo del país y escribe solo números.</span>
              </label>
              ${selectField('WHATSAPP_REQUIRE_ACTIVATION', 'Antes de enviar la incidencia', [['false', 'Enviar la incidencia directamente'], ['true', 'Enviar un mensaje para iniciar el bot']])}
              <div class="settings-service field-wide" aria-live="polite">
                <strong id="whatsapp-mode-title"></strong>
                <span class="small" id="whatsapp-mode-description"></span>
              </div>
              ${field('WHATSAPP_SHARE_BUTTON_TEXT', 'Texto del botón', { maxLength: 80 })}
              ${field('WHATSAPP_SHARE_REPORT_COUNT_TEXT_SINGULAR', 'Texto del contador (una persona)', { maxLength: 160 })}
              <label>Texto del contador (varias personas)
                <input name="WHATSAPP_SHARE_REPORT_COUNT_TEXT_PLURAL" type="text" maxlength="160" value="${escapeAttr(settings.WHATSAPP_SHARE_REPORT_COUNT_TEXT_PLURAL)}" required aria-describedby="whatsapp-report-count-help">
                <span class="small" id="whatsapp-report-count-help">Usa <code>{count}</code> para insertar la cantidad. Ejemplo: <code>{count} personas informaron al ayuntamiento</code>.</span>
              </label>
              ${field('WHATSAPP_SHARE_DIALOG_TITLE', 'Título del aviso', { maxLength: 100 })}
              ${field('WHATSAPP_SHARE_DIALOG_TEXT', 'Mensaje antes de abrir WhatsApp', { textarea: true, maxLength: 300, wide: true })}
              ${field('WHATSAPP_SHARE_DIALOG_NOTE', 'Indicación para pegar la incidencia', { textarea: true, maxLength: 300, wide: true })}
            </div>
            ${sectionSaveButton('Reporte por WhatsApp', 'whatsapp')}
          </section>
          <section class="settings-section" data-settings-section="services">
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
            ${sectionSaveButton('Servicios externos', 'services')}
          </section>
        </div>
      </form>
      <div class="modal-backdrop" id="social-icon-modal" aria-hidden="true">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="social-icon-modal-title">
          <div class="modal-header">
            <div>
              <h2 id="social-icon-modal-title">Icono del enlace</h2>
            </div>
            <button type="button" class="button-ghost modal-close" data-close-social-icons>Cerrar</button>
          </div>
          <div class="icon-search">
            <label>Buscar icono
              <input id="social-icon-search" type="search" placeholder="Red social, correo, web…">
            </label>
            <button type="button" class="button-ghost icon-catalog-toggle" id="social-icon-toggle" aria-expanded="false">Ver todos</button>
          </div>
          <div class="icon-picker-heading">
            <strong id="social-icon-picker-title">Iconos recomendados</strong>
            <span class="icon-picker-count" id="social-icon-picker-count"></span>
          </div>
          <div class="icon-picker-grid" id="social-icons-grid" data-icons='${socialIconJson}' data-recommended-icons='${recommendedSocialIconJson}' aria-labelledby="social-icon-picker-title"></div>
        </div>
      </div>
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

          const socialList = document.querySelector('[data-social-list]');
          const socialJson = document.querySelector('[data-social-json]');
          const socialEmpty = document.querySelector('[data-social-empty]');
          const updateSocialEmpty = () => {
            if (socialEmpty) socialEmpty.hidden = Boolean(socialList?.querySelector('[data-social-row]'));
          };
          const syncSocialLinks = () => {
            if (!socialJson || !socialList) return;
            socialJson.value = JSON.stringify([...socialList.querySelectorAll('[data-social-row]')].map((row) => ({
              name: row.querySelector('[data-social-name]').value.trim(),
              url: row.querySelector('[data-social-url]').value.trim(),
              icon: row.querySelector('[data-social-icon]').value.trim() || 'mdi-link'
            })));
          };
          const createSocialRow = () => {
            const row = document.createElement('div');
            row.className = 'settings-social-row';
            row.dataset.socialRow = '';
            row.innerHTML = '<button type="button" class="button-ghost settings-social-icon-trigger" data-social-icon-trigger aria-label="Elegir icono para el enlace"><i class="mdi mdi-link" aria-hidden="true"></i></button>'
              + '<div class="settings-social-fields">'
              + '<label><span class="sr-only">Nombre</span><input type="text" maxlength="60" placeholder="Nombre" aria-label="Nombre del enlace" data-social-name required></label>'
              + '<label><span class="sr-only">URL</span><input type="url" maxlength="300" placeholder="URL" aria-label="URL del enlace" data-social-url required></label>'
              + '</div>'
              + '<input type="hidden" value="mdi-link" data-social-icon>'
              + '<button type="button" class="button-ghost settings-social-remove" data-social-remove aria-label="Eliminar enlace"><i class="mdi mdi-delete-outline" aria-hidden="true"></i></button>';
            return row;
          };
          document.querySelector('[data-social-add]')?.addEventListener('click', () => {
            if (!socialList || socialList.querySelectorAll('[data-social-row]').length >= 12) return;
            const row = createSocialRow();
            socialList.append(row);
            updateSocialEmpty();
            row.querySelector('[data-social-name]').focus();
          });
          socialList?.addEventListener('click', (event) => {
            const removeButton = event.target.closest('[data-social-remove]');
            if (removeButton) {
              removeButton.closest('[data-social-row]')?.remove();
              syncSocialLinks();
              updateSocialEmpty();
              return;
            }
            const iconButton = event.target.closest('[data-social-icon-trigger]');
            if (iconButton) openSocialIconPicker(iconButton.closest('[data-social-row]'));
          });
          updateSocialEmpty();

          const socialIconModal = document.getElementById('social-icon-modal');
          const socialIconSearch = document.getElementById('social-icon-search');
          const socialIconToggle = document.getElementById('social-icon-toggle');
          const socialIconTitle = document.getElementById('social-icon-picker-title');
          const socialIconCount = document.getElementById('social-icon-picker-count');
          const socialIconsGrid = document.getElementById('social-icons-grid');
          const rawSocialIcons = JSON.parse(socialIconsGrid?.dataset.icons || '[]');
          const recommendedSocialIcons = JSON.parse(socialIconsGrid?.dataset.recommendedIcons || '[]');
          const recommendedSocialMap = new Map(recommendedSocialIcons.map((icon) => [icon.value, icon]));
          const allSocialIcons = rawSocialIcons.map((icon) => recommendedSocialMap.get(icon.value) || icon);
          let activeSocialRow = null;
          let showAllSocialIcons = false;
          let filteredSocialIcons = recommendedSocialIcons;

          const closeSocialIconPicker = () => {
            socialIconModal?.classList.remove('open');
            socialIconModal?.setAttribute('aria-hidden', 'true');
            activeSocialRow = null;
          };
          const getSocialIconOptions = () => {
            const currentValue = activeSocialRow?.querySelector('[data-social-icon]')?.value;
            const currentIcon = allSocialIcons.find((icon) => icon.value === currentValue);
            return currentIcon && !recommendedSocialMap.has(currentIcon.value)
              ? [currentIcon, ...recommendedSocialIcons]
              : recommendedSocialIcons;
          };
          const renderSocialIcons = () => {
            if (!socialIconsGrid) return;
            const currentValue = activeSocialRow?.querySelector('[data-social-icon]')?.value || 'mdi-link';
            socialIconsGrid.innerHTML = filteredSocialIcons.map((icon) => \`
              <label class="icon-option">
                <input type="radio" name="social-icon-choice" value="\${icon.value}" \${icon.value === currentValue ? 'checked' : ''}>
                <span class="icon-tile">
                  <i class="mdi \${icon.value}" aria-hidden="true"></i>
                  <strong>\${icon.label}</strong>
                </span>
              </label>
            \`).join('');
            if (socialIconCount) socialIconCount.textContent = filteredSocialIcons.length + (filteredSocialIcons.length === 1 ? ' opción' : ' opciones');
          };
          const filterSocialIcons = () => {
            const term = socialIconSearch?.value.trim().toLowerCase() || '';
            filteredSocialIcons = term
              ? allSocialIcons.filter((icon) => icon.label.toLowerCase().includes(term) || icon.value.toLowerCase().includes(term))
              : showAllSocialIcons
                ? allSocialIcons
                : getSocialIconOptions();
            if (socialIconTitle) socialIconTitle.textContent = term ? 'Resultados' : showAllSocialIcons ? 'Todos los iconos' : 'Iconos recomendados';
            if (socialIconToggle) {
              socialIconToggle.textContent = showAllSocialIcons || term ? 'Ver recomendados' : 'Ver todos';
              socialIconToggle.setAttribute('aria-expanded', String(showAllSocialIcons || Boolean(term)));
            }
            renderSocialIcons();
          };
          const openSocialIconPicker = (row) => {
            if (!row || !socialIconModal) return;
            activeSocialRow = row;
            showAllSocialIcons = false;
            if (socialIconSearch) socialIconSearch.value = '';
            filterSocialIcons();
            socialIconModal.classList.add('open');
            socialIconModal.setAttribute('aria-hidden', 'false');
          };
          socialIconsGrid?.addEventListener('change', (event) => {
            if (!(event.target instanceof HTMLInputElement) || !activeSocialRow) return;
            const value = event.target.value;
            activeSocialRow.querySelector('[data-social-icon]').value = value;
            activeSocialRow.querySelector('[data-social-icon-trigger] i').className = 'mdi ' + value;
            syncSocialLinks();
            closeSocialIconPicker();
          });
          socialIconSearch?.addEventListener('input', filterSocialIcons);
          socialIconToggle?.addEventListener('click', () => {
            if (socialIconSearch?.value.trim()) socialIconSearch.value = '';
            showAllSocialIcons = !showAllSocialIcons;
            filterSocialIcons();
          });
          document.querySelector('[data-close-social-icons]')?.addEventListener('click', closeSocialIconPicker);
          socialIconModal?.addEventListener('click', (event) => {
            if (event.target === socialIconModal) closeSocialIconPicker();
          });

          form?.addEventListener('submit', async (event) => {
            const button = event.submitter;
            if (!button?.matches('[data-settings-save]')) return;
            event.preventDefault();
            const section = button.closest('[data-settings-section]');
            const sectionKey = button.value;
            if (!section || !sectionKey) return;
            if (sectionKey === 'identity') syncSocialLinks();
            const controls = [...section.querySelectorAll('input:not([type="file"]), select, textarea')];
            const invalidControl = controls.find((control) => !control.closest('[hidden]') && !control.checkValidity());
            if (invalidControl) {
              invalidControl.reportValidity();
              return;
            }
            const status = form.querySelector('[data-settings-status="' + sectionKey + '"]');
            const payload = new URLSearchParams();
            payload.set('_csrf', form.elements._csrf.value);
            payload.set('_section', sectionKey);
            section.querySelectorAll('[name]').forEach((control) => {
              if (control.name !== '_section' && !control.disabled) payload.set(control.name, control.value);
            });
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'Guardando…';
            status.className = 'settings-save-status';
            status.textContent = 'Guardando cambios…';
            try {
              const response = await fetch('/admin/configuracion', {
                method: 'POST',
                headers: {
                  'accept': 'application/json',
                  'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
                  'x-csrf-token': form.elements._csrf.value
                },
                body: payload.toString()
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error || 'No se han podido guardar los cambios.');
              status.className = 'settings-save-status success';
              status.textContent = 'Cambios guardados.';
              if (sectionKey === 'map') mapStatus.textContent = 'Área guardada';
            } catch (error) {
              status.className = 'settings-save-status error';
              status.textContent = error.message;
            } finally {
              button.disabled = false;
              button.textContent = originalText;
            }
          });

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
                status.textContent = 'Imagen preparada. Guarda esta sección para aplicarla.';
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
            const dependentFields = document.getElementById('whatsapp-dependent-fields');
            dependentFields.hidden = !enabled;
            form.WHATSAPP_SHARE_ENABLED.setAttribute('aria-expanded', String(enabled));
            form.WHATSAPP_SHARE_ENABLED.setAttribute('aria-controls', 'whatsapp-dependent-fields');
            document.getElementById('whatsapp-mode-title').textContent = enabled
              ? (requiresActivation ? 'Inicio de bot activado' : 'Envío directo activado')
              : '';
            document.getElementById('whatsapp-mode-description').textContent = enabled
              ? (requiresActivation
                ? 'Primero se abrirá un mensaje para iniciar el bot y la incidencia quedará copiada para pegarla después.'
                : 'WhatsApp se abrirá con la descripción y la dirección preparadas para enviar.')
              : '';
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
            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              maxZoom: 19,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
        <td class="metrics-cell" data-label="Activas" data-sort-value="${Number(item.activas || 0)}"><span class="metric-value">${Number(item.activas || 0)}</span></td>
        <td class="metrics-cell" data-label="Solucionadas" data-sort-value="${Number(item.solucionadas || 0)}"><span class="metric-value">${Number(item.solucionadas || 0)}</span></td>
        <td class="metrics-cell" data-label="Total" data-sort-value="${Number(item.total || 0)}"><span class="metric-value">${Number(item.total || 0)}</span></td>
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
          <table class="category-table" data-number-sortable>
            <thead>
              <tr>
                <th>Categoria</th>
                <th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">Activas <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th>
                <th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">Solucionadas <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th>
                <th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">Total <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th>
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
        <td data-sort-value="${Number.parseInt(entry.entity_id, 10) || 0}">${escapeHtml(entry.entity_id || '-')}</td>
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
          <table class="mobile-scroll-table" data-number-sortable>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Administrador</th>
                <th>Accion</th>
                <th>Entidad</th>
                <th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">ID <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `
  });
}

function renderMaintenancePage({ currentAdmin, notice, inadequateIncidencias, missingLocationIncidencias, tipos, preview, oldSolvableCriteria, csrfToken }) {
  const tiposOptions = tipos.map((tipo) => `<option value="${tipo.id}">${escapeHtml(tipo.nombre)}</option>`).join('');
  const criteria = oldSolvableCriteria || { days: 90, votes: 1 };

  const previewRows = preview.length
    ? preview.map((item) => `
      <tr>
        <td class="checkbox-cell">
          <input class="old-solvable-checkbox" type="checkbox" name="incidenciaIds" value="${item.id}" aria-label="Seleccionar incidencia ${item.id}">
        </td>
        <td data-sort-value="${item.id}"><a class="maintenance-incident-link" href="/admin/incidencias/${item.id}">#${item.id}</a></td>
        <td>${escapeHtml(item.tipo || '')}</td>
        <td data-sort-value="${item.antiguedad_dias}"><strong>${item.antiguedad_dias}</strong> dias<br><span class="small">${formatDate(item.fecha)}</span></td>
        <td data-sort-value="${item.votos_solucion}">${item.votos_solucion}</td>
        <td class="maintenance-description">${escapeHtml(item.descripcion)}</td>
        <td><a class="dashboard-muted-link" href="/admin/incidencias/${item.id}">Ver detalle</a></td>
      </tr>
    `).join('')
    : '<tr><td colspan="7">No hay incidencias activas que cumplan estos criterios.</td></tr>';

  const previewCards = preview.length
    ? preview.map((item) => `
      <article class="table-card">
        <div class="table-card-head">
          <div>
            <strong><a class="maintenance-incident-link" href="/admin/incidencias/${item.id}">#${item.id}</a> · ${escapeHtml(item.tipo || '')}</strong>
            <span>${item.antiguedad_dias} dias · ${item.votos_solucion} ${item.votos_solucion === 1 ? 'voto' : 'votos'} de solucion</span>
          </div>
          <input class="table-card-check old-solvable-checkbox" type="checkbox" name="incidenciaIds" value="${item.id}" aria-label="Seleccionar incidencia ${item.id}">
        </div>
        <span>${escapeHtml(item.descripcion)}</span>
        <a class="dashboard-muted-link maintenance-card-link" href="/admin/incidencias/${item.id}">Ver incidencia</a>
      </article>
    `).join('')
    : '<div class="empty-state">No hay incidencias activas que cumplan estos criterios. Prueba a reducir la antiguedad o los votos minimos.</div>';

  const inadequateRows = (inadequateIncidencias || []).length
    ? inadequateIncidencias.map((item) => `
      <tr>
        <td class="checkbox-cell">
          <input class="inadequate-checkbox" type="checkbox" name="incidenciaIds" value="${item.id}" aria-label="Seleccionar incidencia ${item.id}">
        </td>
        <td data-sort-value="${item.id}"><a class="maintenance-incident-link" href="/admin/incidencias/${item.id}">#${item.id}</a></td>
        <td>${escapeHtml(item.tipo)}</td>
        <td data-sort-value="${item.reportes_inadecuado}">${item.reportes_inadecuado}</td>
        <td>${escapeHtml(item.estado)}</td>
        <td class="maintenance-description">${escapeHtml(item.descripcion)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6">No hay incidencias con reportes inadecuados pendientes.</td></tr>';

  const inadequateCards = (inadequateIncidencias || []).length
    ? inadequateIncidencias.map((item) => `
      <article class="table-card">
        <div class="table-card-head">
          <div>
            <strong><a class="maintenance-incident-link" href="/admin/incidencias/${item.id}">#${item.id}</a> · ${escapeHtml(item.tipo)}</strong>
            <span>${item.reportes_inadecuado} ${item.reportes_inadecuado === 1 ? 'reporte inadecuado' : 'reportes inadecuados'} · ${escapeHtml(item.estado)}</span>
          </div>
          <input class="table-card-check inadequate-checkbox" type="checkbox" name="incidenciaIds" value="${item.id}" aria-label="Seleccionar incidencia ${item.id}">
        </div>
        <span>${escapeHtml(item.descripcion)}</span>
      </article>
    `).join('')
    : '<div class="empty-state">No hay incidencias con reportes inadecuados pendientes.</div>';

  const missingLocationRows = (missingLocationIncidencias || []).length
    ? missingLocationIncidencias.map((item) => `
      <tr>
        <td data-sort-value="${item.id}">#${item.id}</td>
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
      <section class="old-solvable-workspace" style="margin-top:16px" aria-labelledby="old-solvable-title">
        <div class="old-solvable-heading">
          <div>
            <span class="eyebrow">Resolucion asistida</span>
            <h2 id="old-solvable-title">Incidencias antiguas</h2>
            <p>Busca por antiguedad y, si lo necesitas, exige un numero minimo de votos de solucion.</p>
          </div>
          <div class="old-solvable-count" aria-label="${preview.length} incidencias encontradas">
            <strong>${preview.length}</strong>
            <span>${preview.length === 1 ? 'incidencia encontrada' : 'incidencias encontradas'}</span>
          </div>
        </div>

        <form class="old-solvable-filters" method="post" action="/admin/maintenance/preview-old-solvable">
          <label>Antiguedad minima
            <span class="input-suffix">
              <input name="days" type="number" min="1" max="3650" value="${escapeAttr(criteria.days)}" required>
              <span>dias</span>
            </span>
          </label>
          <label>Votos minimos de solucion
            <input name="votes" type="number" min="1" max="1000" value="${escapeAttr(criteria.votes)}" required>
          </label>
          <button class="button-ghost" type="submit"><i class="mdi mdi-magnify" aria-hidden="true"></i> Buscar</button>
          <span class="old-solvable-filter-status" role="status" aria-live="polite"></span>
        </form>

        <form id="old-solvable-form" class="old-solvable-results" method="post" action="/admin/maintenance/run-old-solvable" data-confirm="Se marcaran como solucionadas las incidencias indicadas. ¿Continuar?">
          <input type="hidden" name="days" value="${escapeAttr(criteria.days)}">
          <input type="hidden" name="votes" value="${escapeAttr(criteria.votes)}">
          <div class="old-solvable-toolbar">
            <label class="select-all-label">
              <input id="old-solvable-select-all" class="select-all" type="checkbox"${preview.length ? '' : ' disabled'}>
              <span>Seleccionar todas</span>
            </label>
            <span id="old-solvable-selection" class="meta" aria-live="polite">Ninguna seleccionada</span>
          </div>
          <div class="table-wrap">
            <table class="responsive-table old-solvable-table" data-number-sortable>
              <thead>
                <tr>
                  <th><span class="sr-only">Seleccionar</span></th>
                  <th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">ID <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th><th>Tipo</th><th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">Antiguedad <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th><th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">Votos <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th><th>Descripcion</th><th>Detalle</th>
                </tr>
              </thead>
              <tbody>${previewRows}</tbody>
            </table>
          </div>
          <div class="table-cards">${previewCards}</div>
          <div class="old-solvable-actions">
            <span class="meta">Esta accion cambia el estado y queda registrada en auditoria.</span>
            <div class="actions">
              <button id="solve-selected" type="submit" name="scope" value="selected" disabled>Marcar 0 como solucionadas</button>
            </div>
          </div>
        </form>
      </section>
      <section class="old-solvable-workspace moderation-workspace" style="margin-top:16px" aria-labelledby="inadequate-title">
        <div class="old-solvable-heading">
          <div>
            <span class="eyebrow">Moderacion</span>
            <h2 id="inadequate-title">Reportes inadecuados</h2>
            <p>Revisa el detalle desde el ID y actua sobre una o varias incidencias.</p>
          </div>
          <div class="old-solvable-count" aria-label="${(inadequateIncidencias || []).length} incidencias pendientes">
            <strong>${(inadequateIncidencias || []).length}</strong>
            <span>${(inadequateIncidencias || []).length === 1 ? 'incidencia pendiente' : 'incidencias pendientes'}</span>
          </div>
        </div>
        <form id="inadequate-moderation-form" class="old-solvable-results" method="post" action="/admin/maintenance/moderate-inadequate-reports" data-confirm="Se eliminaran los reportes inadecuados seleccionados. ¿Continuar?">
          <div class="old-solvable-toolbar">
            <label class="select-all-label">
              <input id="inadequate-select-all" class="select-all" type="checkbox"${(inadequateIncidencias || []).length ? '' : ' disabled'}>
              <span>Seleccionar todas</span>
            </label>
            <span id="inadequate-selection" class="meta" aria-live="polite">Ninguna seleccionada</span>
          </div>
          <div class="table-wrap">
            <table class="responsive-table moderation-table" data-number-sortable>
              <thead>
                <tr><th><span class="sr-only">Seleccionar</span></th><th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">ID <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th><th>Tipo</th><th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">Reportes <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th><th>Estado</th><th>Descripcion</th></tr>
              </thead>
              <tbody>${inadequateRows}</tbody>
            </table>
          </div>
          <div class="table-cards">${inadequateCards}</div>
          <div class="old-solvable-actions moderation-actions">
            <label>Accion
              <select id="inadequate-action" name="action">
                <option value="clear">Limpiar reportes</option>
                <option value="delete">Borrar incidencias</option>
              </select>
            </label>
            <button id="moderate-selected" type="submit" disabled>Limpiar reportes de 0</button>
          </div>
        </form>
      </section>
      <div class="subtle-panel" style="margin-top:16px">
        <h2>Ubicacion pendiente</h2>
        <div class="actions" style="margin-bottom:12px">
          <form method="post" action="/admin/maintenance/process-missing-location" data-confirm="Se consultara el geocodificador para completar hasta 100 incidencias. Esta operacion puede tardar. ¿Continuar?">
            <button type="submit">Procesar hasta 100 incidencias</button>
          </form>
        </div>
        <div class="table-wrap">
          <table class="responsive-table" data-number-sortable>
            <thead>
              <tr><th data-sort-number aria-sort="none"><button class="number-sort-button" type="button" aria-pressed="false">ID <span class="number-sort-indicator" aria-hidden="true">↕</span></button></th><th>Tipo</th><th>Barrio</th><th>Direccion</th><th>Descripcion</th></tr>
            </thead>
            <tbody>${missingLocationRows}</tbody>
          </table>
        </div>
        <div class="table-cards">${missingLocationCards}</div>
      </div>
      <script>
        (() => {
          const workspace = document.querySelector('.old-solvable-workspace');
          const filterForm = workspace?.querySelector('.old-solvable-filters');
          const resultsForm = document.getElementById('old-solvable-form');
          if (!workspace || !filterForm || !resultsForm) return;

          const bindResults = () => {
            const selectAll = resultsForm.querySelector('#old-solvable-select-all');
            const selectedButton = resultsForm.querySelector('#solve-selected');
            const selectionLabel = resultsForm.querySelector('#old-solvable-selection');
            const checkboxes = Array.from(resultsForm.querySelectorAll('.old-solvable-checkbox'));
            const uniqueIds = () => new Set(checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value));
            const refresh = () => {
              const count = uniqueIds().size;
              selectionLabel.textContent = count ? count + (count === 1 ? ' seleccionada' : ' seleccionadas') : 'Ninguna seleccionada';
              selectedButton.disabled = count === 0;
              selectedButton.textContent = count === 1 ? 'Marcar 1 como solucionada' : 'Marcar ' + count + ' como solucionadas';
              if (selectAll) {
                const total = new Set(checkboxes.map((checkbox) => checkbox.value)).size;
                selectAll.checked = total > 0 && count === total;
                selectAll.indeterminate = count > 0 && count < total;
              }
            };
            checkboxes.forEach((checkbox) => checkbox.addEventListener('change', () => {
              checkboxes.filter((peer) => peer.value === checkbox.value).forEach((peer) => { peer.checked = checkbox.checked; });
              refresh();
            }));
            selectAll?.addEventListener('change', () => {
              checkboxes.forEach((checkbox) => { checkbox.checked = selectAll.checked; });
              refresh();
            });
            resultsForm.onclick = (event) => {
              const submitter = event.target.closest('button[type="submit"]');
              if (!submitter) return;
              const count = uniqueIds().size;
              resultsForm.dataset.confirm = 'Se marcaran como solucionadas ' + count + (count === 1 ? ' incidencia' : ' incidencias') + '. ¿Continuar?';
            };
            refresh();
          };

          filterForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const scrollPosition = window.scrollY;
            const button = filterForm.querySelector('button[type="submit"]');
            const status = filterForm.querySelector('.old-solvable-filter-status');
            const originalLabel = button.innerHTML;
            button.disabled = true;
            button.textContent = 'Buscando…';
            status.textContent = '';
            workspace.setAttribute('aria-busy', 'true');
            try {
              const response = await fetch(filterForm.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                body: new URLSearchParams(new FormData(filterForm))
              });
              const nextDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
              const nextWorkspace = nextDocument.querySelector('.old-solvable-workspace');
              const nextResults = nextWorkspace?.querySelector('#old-solvable-form');
              const nextCount = nextWorkspace?.querySelector('.old-solvable-count');
              if (!response.ok || !nextWorkspace || !nextResults || !nextCount) {
                const errorMessage = nextDocument.querySelector('.notice.error')?.textContent?.trim();
                throw new Error(errorMessage || 'No se ha podido actualizar la búsqueda.');
              }
              workspace.querySelector('.old-solvable-count').replaceWith(nextCount);
              resultsForm.innerHTML = nextResults.innerHTML;
              bindResults();
              window.scrollTo(0, scrollPosition);
              const total = nextCount.querySelector('strong')?.textContent || '0';
              status.textContent = total + (total === '1' ? ' incidencia encontrada.' : ' incidencias encontradas.');
            } catch (error) {
              status.textContent = error.message;
            } finally {
              button.disabled = false;
              button.innerHTML = originalLabel;
              workspace.removeAttribute('aria-busy');
            }
          });

          bindResults();

          const moderationForm = document.getElementById('inadequate-moderation-form');
          if (moderationForm) {
            const selectAllModeration = moderationForm.querySelector('#inadequate-select-all');
            const selectionModeration = moderationForm.querySelector('#inadequate-selection');
            const actionModeration = moderationForm.querySelector('#inadequate-action');
            const submitModeration = moderationForm.querySelector('#moderate-selected');
            const moderationCheckboxes = Array.from(moderationForm.querySelectorAll('.inadequate-checkbox'));
            const selectedIds = () => new Set(moderationCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value));
            const refreshModeration = () => {
              const count = selectedIds().size;
              const deleting = actionModeration.value === 'delete';
              selectionModeration.textContent = count ? count + (count === 1 ? ' seleccionada' : ' seleccionadas') : 'Ninguna seleccionada';
              submitModeration.disabled = count === 0;
              submitModeration.textContent = deleting
                ? 'Borrar ' + count + (count === 1 ? ' incidencia' : ' incidencias')
                : 'Limpiar reportes de ' + count;
              submitModeration.style.background = deleting ? 'var(--danger)' : '';
              moderationForm.dataset.confirm = deleting
                ? 'Se eliminaran definitivamente ' + count + (count === 1 ? ' incidencia' : ' incidencias') + ' y todos sus datos. ¿Continuar?'
                : 'Se eliminaran los reportes inadecuados de ' + count + (count === 1 ? ' incidencia' : ' incidencias') + '. ¿Continuar?';
              if (selectAllModeration) {
                const total = new Set(moderationCheckboxes.map((checkbox) => checkbox.value)).size;
                selectAllModeration.checked = total > 0 && count === total;
                selectAllModeration.indeterminate = count > 0 && count < total;
              }
            };
            moderationCheckboxes.forEach((checkbox) => checkbox.addEventListener('change', () => {
              moderationCheckboxes.filter((peer) => peer.value === checkbox.value).forEach((peer) => { peer.checked = checkbox.checked; });
              refreshModeration();
            }));
            selectAllModeration?.addEventListener('change', () => {
              moderationCheckboxes.forEach((checkbox) => { checkbox.checked = selectAllModeration.checked; });
              refreshModeration();
            });
            actionModeration.addEventListener('change', refreshModeration);
            refreshModeration();
          }
        })();
      </script>
    `
  });
}

module.exports = {
  renderAdminUsersPage,
  renderAuditPage,
  renderCategoriasPage,
  renderChangePasswordPage,
  renderDashboardPage,
  renderExternalReportsPage,
  renderIncidenciaDetailPage,
  renderIncidenciasListPage,
  renderLayout,
  renderLoginPage,
  renderMaintenancePage,
  renderSettingsPage,
  renderUpdatesPage
};
