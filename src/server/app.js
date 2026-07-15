const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const incidenciasRoutes = require('./routes/incidencias');
const rssRoutes = require('./routes/rss');
const configRoutes = require('./routes/config');
const db = require('./config/database');
const { buildCategoryMeta, slugifyTipo } = require('./utils/tipoRoutes');
const { isAdminEnabled } = require('./admin/activation');
const { bootstrapAdminIfNeeded } = require('./admin/service');
const { getAppSettings } = require('./admin/settings');
const { getSessionSecret, mountAdmin } = require('./admin/panel');

const DIST_INDEX_PATH = path.join(__dirname, '..', '..', 'dist', 'index.html');

function getTrustProxySetting(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'false' || normalized === '0') {
    return false;
  }
  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }
  return value;
}

function getAllowedCorsOrigins(baseUrl) {
  const origins = new Set();
  try {
    origins.add(new URL(baseUrl).origin);
  } catch (_error) {
    // BASE_URL se valida tambien en la comprobacion de despliegue.
  }
  String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => origins.add(item));
  return origins;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function upsertMetaTag(html, attrName, attrValue, content) {
  const escapedContent = escapeHtml(content);
  const pattern = new RegExp(`<meta\\s+${attrName}="${attrValue}"\\s+content="[^"]*">`, 'i');
  const replacement = `<meta ${attrName}="${attrValue}" content="${escapedContent}">`;

  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }

  return html.replace('</head>', `    ${replacement}\n</head>`);
}

function injectCategoryMeta(html, meta) {
  let nextHtml = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  nextHtml = upsertMetaTag(nextHtml, 'name', 'description', meta.description);
  nextHtml = upsertMetaTag(nextHtml, 'property', 'og:type', 'website');
  nextHtml = upsertMetaTag(nextHtml, 'property', 'og:title', meta.title);
  nextHtml = upsertMetaTag(nextHtml, 'property', 'og:description', meta.description);
  nextHtml = upsertMetaTag(nextHtml, 'property', 'og:url', meta.url);
  if (meta.image) {
    nextHtml = upsertMetaTag(nextHtml, 'property', 'og:image', meta.image);
    nextHtml = upsertMetaTag(nextHtml, 'property', 'og:image:secure_url', meta.image);
  }
  if (meta.imageAlt) {
    nextHtml = upsertMetaTag(nextHtml, 'property', 'og:image:alt', meta.imageAlt);
  }
  nextHtml = upsertMetaTag(nextHtml, 'name', 'twitter:title', meta.title);
  nextHtml = upsertMetaTag(nextHtml, 'name', 'twitter:description', meta.description);
  nextHtml = upsertMetaTag(nextHtml, 'name', 'twitter:url', meta.url);
  nextHtml = upsertMetaTag(nextHtml, 'name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary');
  if (meta.image) {
    nextHtml = upsertMetaTag(nextHtml, 'name', 'twitter:image', meta.image);
  }
  if (meta.imageAlt) {
    nextHtml = upsertMetaTag(nextHtml, 'name', 'twitter:image:alt', meta.imageAlt);
  }

  const canonicalTag = `<link rel="canonical" href="${escapeHtml(meta.url)}">`;
  if (/<link\s+rel="canonical"/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*">/i, canonicalTag);
  } else {
    nextHtml = nextHtml.replace('</head>', `    ${canonicalTag}\n</head>`);
  }

  return nextHtml;
}

function injectAppSettings(html, settings, baseUrl) {
  const title = `${settings.APP_NAME} - ${settings.APP_DESCRIPTION}`;
  let nextHtml = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  nextHtml = upsertMetaTag(nextHtml, 'name', 'description', settings.APP_DESCRIPTION);
  nextHtml = upsertMetaTag(nextHtml, 'property', 'og:title', settings.APP_NAME);
  nextHtml = upsertMetaTag(nextHtml, 'property', 'og:description', settings.APP_DESCRIPTION);
  nextHtml = upsertMetaTag(nextHtml, 'property', 'og:image', new URL(settings.APP_FAVICON_PATH, baseUrl).href);
  nextHtml = upsertMetaTag(nextHtml, 'name', 'twitter:title', settings.APP_NAME);
  nextHtml = upsertMetaTag(nextHtml, 'name', 'twitter:description', settings.APP_DESCRIPTION);
  nextHtml = upsertMetaTag(nextHtml, 'name', 'theme-color', settings.APP_PRIMARY_COLOR);
  nextHtml = nextHtml.replace(/<link\s+rel="icon"\s+href="[^"]*"[^>]*>/i, `<link rel="icon" href="${escapeHtml(settings.APP_FAVICON_PATH)}" type="image/png">`);
  nextHtml = nextHtml.replace(/<link\s+rel="apple-touch-icon"\s+href="[^"]*"[^>]*>/i, `<link rel="apple-touch-icon" href="${escapeHtml(settings.APP_FAVICON_PATH)}">`);
  return nextHtml;
}

function buildIncidenciaMeta(incidencia, baseUrl, appName) {
  const imagePath = incidencia.ruta_imagen ? `/uploads/${incidencia.ruta_imagen}` : '';
  const image = imagePath ? new URL(imagePath, baseUrl).href : '';
  const descripcion = incidencia.descripcion
    ? incidencia.descripcion.slice(0, 220)
    : `Detalles de la incidencia ${incidencia.id} en ${appName}`;
  const direccionBase = [
    incidencia.road || incidencia.neighbourhood || incidencia.suburb || '',
    incidencia.house_number || ''
  ].join(' ').trim();
  const municipio = incidencia.city || incidencia.town || incidencia.village || '';
  const locationText = [direccionBase, municipio].filter(Boolean).join(', ');
  const titleBase = incidencia.tipo || `Incidencia ${incidencia.id}`;
  const title = locationText
    ? `${titleBase} en ${locationText} | ${appName}`
    : `${titleBase} | ${appName}`;

  return {
    title,
    description: descripcion,
    url: new URL(`/i/${incidencia.id}`, baseUrl).href,
    image,
    imageAlt: image ? `Imagen de la incidencia ${incidencia.id}` : ''
  };
}

async function createApp({ logger = console } = {}) {
  await db.ready;
  await getAppSettings({ refresh: true });
  const adminEnabled = isAdminEnabled();
  if (adminEnabled) {
    if (process.env.NODE_ENV === 'production') {
      getSessionSecret(logger);
    }
    await bootstrapAdminIfNeeded(logger);
  }

  const app = express();
  app.disable('x-powered-by');
  const PORT = process.env.PORT || 5050;
  const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

  app.set('trust proxy', getTrustProxySetting(process.env.TRUST_PROXY));
  const allowedCorsOrigins = getAllowedCorsOrigins(BASE_URL);
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || allowedCorsOrigins.has(origin));
    }
  }));
  app.use(express.json());

  if (adminEnabled) {
    app.use('/admin-assets/mdi', express.static(path.join(__dirname, '..', '..', 'node_modules', '@mdi', 'font')));
    app.use('/admin-assets/leaflet', express.static(path.join(__dirname, '..', '..', 'node_modules', 'leaflet', 'dist')));
  }
  const uploadsDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(__dirname, '..', '..', 'uploads');
  app.use('/uploads', (req, res, next) => {
    if (!/\.(?:jpe?g|png|webp)$/i.test(path.extname(req.path))) {
      res.status(404).send('No encontrado');
      return;
    }
    next();
  });
  app.use('/uploads', express.static(uploadsDir, {
    dotfiles: 'deny',
    fallthrough: false,
    immutable: true,
    maxAge: '30d',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));
  app.get('/manifest.json', async (_req, res, next) => {
    try {
      const settings = await getAppSettings();
      res.json({
        name: settings.APP_NAME,
        short_name: settings.APP_NAME.slice(0, 24),
        description: settings.APP_DESCRIPTION,
        start_url: '/',
        display: 'standalone',
        background_color: settings.APP_BACKGROUND_COLOR,
        theme_color: settings.APP_PRIMARY_COLOR,
        icons: [192, 512].map((size) => ({ src: settings.APP_FAVICON_PATH, sizes: `${size}x${size}`, type: 'image/png' }))
      });
    } catch (error) {
      next(error);
    }
  });
  app.use(express.static(path.join(__dirname, '..', '..', 'dist'), { index: false }));

  if (adminEnabled) {
    await mountAdmin(app, logger, { baseUrl: BASE_URL });
  } else {
    app.use('/admin', (_req, res) => res.status(404).send('No encontrado'));
    app.use('/admin-assets', (_req, res) => res.status(404).send('No encontrado'));
  }

  app.use('/api/incidencias', incidenciasRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/rss', rssRoutes);

  function renderIncidenciaMeta(req, res) {
    const incidenciaId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(incidenciaId) || incidenciaId <= 0) {
      res.sendFile(DIST_INDEX_PATH);
      return;
    }

    const sql = `
      SELECT i.id, t.nombre AS tipo, i.descripcion,
             img.ruta_imagen,
             json_extract(i.direccion_json, '$.road') AS road,
             json_extract(i.direccion_json, '$.house_number') AS house_number,
             json_extract(i.direccion_json, '$.neighbourhood') AS neighbourhood,
             json_extract(i.direccion_json, '$.suburb') AS suburb,
             json_extract(i.direccion_json, '$.city') AS city,
             json_extract(i.direccion_json, '$.town') AS town,
             json_extract(i.direccion_json, '$.village') AS village
      FROM incidencias i
      JOIN tipos_incidencias t ON i.tipo_id = t.id
      LEFT JOIN imagenes_incidencias img
        ON img.id = (
          SELECT id
          FROM imagenes_incidencias
          WHERE incidencia_id = i.id
          ORDER BY id ASC
          LIMIT 1
        )
      WHERE i.id = ?
    `;

    db.get(sql, [incidenciaId], async (err, incidencia) => {
      if (err || !incidencia) {
        if (err) {
          logger.error('Error al obtener la incidencia para meta dinámico:', err);
        }
        res.sendFile(DIST_INDEX_PATH);
        return;
      }

      try {
        const settings = await getAppSettings();
        const html = injectAppSettings(fs.readFileSync(DIST_INDEX_PATH, 'utf8'), settings, BASE_URL);
        res.send(injectCategoryMeta(html, buildIncidenciaMeta(incidencia, BASE_URL, settings.APP_NAME)));
      } catch (readError) {
        logger.error('Error al leer index.html para meta de incidencia:', readError);
        res.sendFile(DIST_INDEX_PATH);
      }
    });
  }

  app.get('/tipo/:id/:slug?', (req, res) => {
    const tipoId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(tipoId) || tipoId <= 0) {
      res.sendFile(DIST_INDEX_PATH);
      return;
    }

    db.get('SELECT id, nombre FROM tipos_incidencias WHERE id = ?', [tipoId], async (err, tipo) => {
      if (err || !tipo) {
        if (err) {
          logger.error('Error al obtener el tipo para meta dinámico:', err);
        }
        res.sendFile(DIST_INDEX_PATH);
        return;
      }

      try {
        const settings = await getAppSettings();
        const categoryMeta = buildCategoryMeta({
          appName: settings.APP_NAME,
          appDescription: settings.APP_DESCRIPTION,
          baseUrl: BASE_URL,
          tipo
        });
        const html = injectAppSettings(fs.readFileSync(DIST_INDEX_PATH, 'utf8'), settings, BASE_URL);
        const canonicalSlug = slugifyTipo(tipo.nombre);
        const finalMeta = {
          ...categoryMeta,
          url: new URL(canonicalSlug ? `/tipo/${tipo.id}/${canonicalSlug}` : `/tipo/${tipo.id}`, BASE_URL).href
        };
        res.send(injectCategoryMeta(html, finalMeta));
      } catch (readError) {
        logger.error('Error al leer index.html para meta dinámico:', readError);
        res.sendFile(DIST_INDEX_PATH);
      }
    });
  });

  app.get('/i/:id', renderIncidenciaMeta);
  app.get('/incidencia/:id', renderIncidenciaMeta);
  app.get('*', async (_req, res, next) => {
    try {
      const settings = await getAppSettings();
      const html = injectAppSettings(fs.readFileSync(DIST_INDEX_PATH, 'utf8'), settings, BASE_URL);
      res.send(html);
    } catch (error) {
      next(error);
    }
  });

  app.use((error, req, res, _next) => {
    const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
    if (status >= 500) {
      logger.error('Error no controlado en la aplicacion:', {
        message: error?.message,
        method: req.method,
        path: req.originalUrl
      });
    }
    if (res.headersSent) {
      return;
    }
    res.status(status).send(status === 404 ? 'No encontrado' : 'Error interno del servidor');
  });

  return app;
}

module.exports = {
  createApp,
  injectAppSettings
};
