const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const incidenciasRoutes = require('./routes/incidencias');
const rssRoutes = require('./routes/rss');
const db = require('./config/database');
const { buildCategoryMeta, slugifyTipo } = require('./utils/tipoRoutes');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 5050;
const DIST_INDEX_PATH = path.join(__dirname, '..', '..', 'dist', 'index.html');
const APP_NAME = process.env.APP_NAME || 'Basura Cero';
const APP_DESCRIPTION = process.env.APP_DESCRIPTION || 'Sistema colaborativo de incidencias urbanas';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// Servir archivos estáticos de la aplicación Vue
app.use(express.static(path.join(__dirname, '..', '..', 'dist')));

app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/rss', rssRoutes);

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

function buildIncidenciaMeta(incidencia) {
  const imagePath = incidencia.ruta_imagen ? `/uploads/${incidencia.ruta_imagen}` : '';
  const image = imagePath ? new URL(imagePath, BASE_URL).href : '';
  const descripcion = incidencia.descripcion
    ? incidencia.descripcion.slice(0, 220)
    : `Detalles de la incidencia ${incidencia.id} en ${APP_NAME}`;
  const direccionBase = [
    incidencia.road || incidencia.neighbourhood || incidencia.suburb || '',
    incidencia.house_number || ''
  ].join(' ').trim();
  const municipio = incidencia.city || incidencia.town || incidencia.village || '';
  const locationText = [direccionBase, municipio].filter(Boolean).join(', ');
  const titleBase = incidencia.tipo || `Incidencia ${incidencia.id}`;
  const title = locationText
    ? `${titleBase} en ${locationText} | ${APP_NAME}`
    : `${titleBase} | ${APP_NAME}`;

  return {
    title,
    description: descripcion,
    url: new URL(`/i/${incidencia.id}`, BASE_URL).href,
    image,
    imageAlt: image ? `Imagen de la incidencia ${incidencia.id}` : ''
  };
}

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

  db.get(sql, [incidenciaId], (err, incidencia) => {
    if (err) {
      console.error('Error al obtener la incidencia para meta dinámico:', err);
      res.sendFile(DIST_INDEX_PATH);
      return;
    }

    if (!incidencia) {
      res.sendFile(DIST_INDEX_PATH);
      return;
    }

    try {
      const html = fs.readFileSync(DIST_INDEX_PATH, 'utf8');
      res.send(injectCategoryMeta(html, buildIncidenciaMeta(incidencia)));
    } catch (readError) {
      console.error('Error al leer index.html para meta de incidencia:', readError);
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

  db.get('SELECT id, nombre FROM tipos_incidencias WHERE id = ?', [tipoId], (err, tipo) => {
    if (err) {
      console.error('Error al obtener el tipo para meta dinámico:', err);
      res.sendFile(DIST_INDEX_PATH);
      return;
    }

    if (!tipo) {
      res.sendFile(DIST_INDEX_PATH);
      return;
    }

    const categoryMeta = buildCategoryMeta({
      appName: APP_NAME,
      appDescription: APP_DESCRIPTION,
      baseUrl: BASE_URL,
      tipo
    });

    try {
      const html = fs.readFileSync(DIST_INDEX_PATH, 'utf8');
      const canonicalSlug = slugifyTipo(tipo.nombre);
      const finalMeta = {
        ...categoryMeta,
        url: new URL(canonicalSlug ? `/tipo/${tipo.id}/${canonicalSlug}` : `/tipo/${tipo.id}`, BASE_URL).href
      };
      res.send(injectCategoryMeta(html, finalMeta));
    } catch (readError) {
      console.error('Error al leer index.html para meta dinámico:', readError);
      res.sendFile(DIST_INDEX_PATH);
    }
  });
});

app.get('/i/:id', renderIncidenciaMeta);
app.get('/incidencia/:id', renderIncidenciaMeta);

// Manejar todas las demás rutas y servir index.html
app.get('*', (req, res) => {
  res.sendFile(DIST_INDEX_PATH);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
