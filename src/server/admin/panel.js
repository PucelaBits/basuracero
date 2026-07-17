const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const sharp = require('sharp');
const { all, get, run } = require('../utils/dbAsync');
const {
  PASSWORD_MIN_LENGTH,
  authenticateAdmin,
  changeAdminPassword,
  changeIncidenciaTipo,
  clearInadequateReports,
  clearSolutionReports,
  createTipo,
  createAdminUser,
  deleteIncidencia,
  deleteIncidenciaImage,
  deleteInadequateReport,
  deleteSolutionReport,
  deleteTipoIfUnused,
  executeOldSolvable,
  forcePasswordReset,
  getAdminAuditEntries,
  getAdminDashboardData,
  getAdminById,
  getAdminIncidenciasList,
  getAdminExternalReportsList,
  getAdminUsersList,
  getIncidenciaDetail,
  getInadequateReportedIncidencias,
  getMissingLocationIncidencias,
  getTipoSummary,
  mergeTipos,
  moderateInadequateIncidencias,
  previewOldSolvable,
  processMissingLocationIncidencias,
  renameTipo,
  setAdminActiveState,
  updateAdminUser,
  updateIncidencia,
  updateIncidenciaState
} = require('./service');
const {
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
} = require('./html');
const { SETTING_DEFINITIONS, getAppSettings, updateAppSettings, updateAppSettingsSection } = require('./settings');
const { getInstalledRelease, getUpdateStatus, resetUpdateStatusCache } = require('./updateChecker');

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', '..', '..', 'uploads');
const brandingUploadsDir = path.join(uploadsDir, 'branding');
const allowedBrandImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const uploadBrandImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 1, parts: 3 },
  fileFilter: (_req, file, callback) => {
    if (!allowedBrandImageTypes.has(String(file.mimetype || '').toLowerCase())) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }
    callback(null, true);
  }
});

async function saveBrandImage(file, kind) {
  if (!file?.buffer || !['logo', 'favicon'].includes(kind)) {
    throw new Error('Imagen no válida.');
  }
  await fs.promises.mkdir(brandingUploadsDir, { recursive: true });
  const filename = `${kind}-${crypto.randomUUID()}.png`;
  const destination = path.join(brandingUploadsDir, filename);
  const image = sharp(file.buffer, { failOn: 'error', limitInputPixels: 25_000_000 }).rotate();
  if (kind === 'favicon') {
    image.resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true });
  } else {
    image.resize(1200, 600, { fit: 'inside', withoutEnlargement: true });
  }
  try {
    await image.png({ compressionLevel: 9 }).toFile(destination);
  } catch (error) {
    await fs.promises.unlink(destination).catch(() => {});
    throw error;
  }
  return `/uploads/branding/${filename}`;
}

class SQLiteSessionStore extends session.Store {
  constructor(logger = console) {
    super();
    this.logger = logger;
    run('DELETE FROM admin_sessions WHERE expired <= ?', [Date.now()])
      .catch((error) => logger.error('No se pudieron purgar sesiones expiradas:', error));
  }

  get(sid, callback) {
    get('SELECT sess, expired FROM admin_sessions WHERE sid = ?', [sid])
      .then(async (row) => {
        if (!row || Number(row.expired) <= Date.now()) {
          if (row) {
            await run('DELETE FROM admin_sessions WHERE sid = ?', [sid]);
          }
          callback(null, null);
          return;
        }
        callback(null, JSON.parse(row.sess));
      })
      .catch(callback);
  }

  set(sid, sessionData, callback = () => {}) {
    const expiresAt = sessionData?.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + (sessionData?.cookie?.originalMaxAge || 1000 * 60 * 60 * 8);
    run(
      `INSERT INTO admin_sessions (sid, expired, sess)
       VALUES (?, ?, ?)
       ON CONFLICT(sid) DO UPDATE SET expired = excluded.expired, sess = excluded.sess`,
      [sid, expiresAt, JSON.stringify(sessionData)]
    ).then(() => callback()).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    run('DELETE FROM admin_sessions WHERE sid = ?', [sid])
      .then(() => callback())
      .catch(callback);
  }

  touch(sid, sessionData, callback = () => {}) {
    this.set(sid, sessionData, callback);
  }
}

function getSessionSecret(logger = console) {
  if (process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === 'production' && Buffer.byteLength(process.env.SESSION_SECRET, 'utf8') < 32) {
      throw new Error('SESSION_SECRET debe tener al menos 32 caracteres en produccion.');
    }
    return process.env.SESSION_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET es obligatorio en produccion.');
  }

  logger.warn('SESSION_SECRET no esta definido. Se usara un secreto temporal solo para desarrollo.');
  return 'dev-admin-session-secret';
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true' || value === '1' || value === 'on';
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toActionNotice(error) {
  return {
    type: 'error',
    message: error.message || 'No se pudo completar la accion.'
  };
}

function buildForbiddenPage({ currentAdmin = null, csrfToken = '', message }) {
  return renderLayout({
    title: 'Solicitud no valida',
    currentAdmin,
    csrfToken,
    notice: { type: 'error', message },
    body: `
      <h1>Solicitud no valida</h1>
      <p>No hemos podido verificar esta accion. Recarga la pagina y vuelve a intentarlo.</p>
    `
  });
}

function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  return req.session.csrfToken;
}

function rotateCsrfToken(req) {
  req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve) => {
    if (!req.session) {
      resolve();
      return;
    }

    req.session.destroy(() => resolve());
  });
}

function getAllowedOrigin(baseUrl) {
  try {
    return new URL(baseUrl).origin;
  } catch (_error) {
    return null;
  }
}

async function renderCategoriasResponse(res, currentAdmin, notice, csrfToken, status = 200) {
  const categorias = await getTipoSummary();
  res.status(status).send(renderCategoriasPage({
    currentAdmin,
    notice,
    categorias,
    csrfToken
  }));
}

function createSessionMiddleware(logger = console) {
  const sessionSecret = getSessionSecret(logger);
  const maxAge = parsePositiveInt(process.env.ADMIN_SESSION_MAX_AGE_MS, 1000 * 60 * 60 * 8);
  return session({
    secret: sessionSecret,
    name: 'basuracero_admin',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/admin',
      maxAge
    },
    store: new SQLiteSessionStore(logger)
  });
}

function createAdminAuthRouter(logger = console, { baseUrl } = {}) {
  const router = express.Router();
  const allowedOrigin = getAllowedOrigin(baseUrl);
  router.use(express.urlencoded({ extended: false }));
  router.use((_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://*.basemaps.cartocdn.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'",
      'Referrer-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });
    next();
  });

  router.get('/session-status', async (req, res, next) => {
    try {
      const admin = req.session?.adminUserId
        ? await getAdminById(req.session.adminUserId)
        : null;
      res.json({ authenticated: Boolean(admin?.isActive) });
    } catch (error) {
      next(error);
    }
  });

  const loginLimiter = rateLimit({
    windowMs: parsePositiveInt(process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parsePositiveInt(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX, 5),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) => {
      const location = String(res.getHeader('location') || '');
      if (location.includes('/admin/login?error=1')) {
        return false;
      }
      return res.statusCode < 400;
    },
    handler: (req, res) => {
      res.status(429).send(renderLoginPage({
        csrfToken: ensureCsrfToken(req),
        notice: {
          type: 'error',
          message: 'Demasiados intentos de acceso. Espera unos minutos antes de volver a intentarlo.'
        }
      }));
    }
  });
  const loginPageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.use(async (req, _res, next) => {
    ensureCsrfToken(req);

    if (!req.session?.adminUserId) {
      req.currentAdmin = null;
      next();
      return;
    }

    try {
      const admin = await getAdminById(req.session.adminUserId);
      if (!admin || !admin.isActive) {
        await destroySession(req);
        next();
        return;
      }

      req.currentAdmin = admin;
      next();
    } catch (error) {
      next(error);
    }
  });

  router.use((req, res, next) => {
    if (req.method !== 'POST') {
      next();
      return;
    }

    if (process.env.NODE_ENV !== 'production' || !allowedOrigin) {
      next();
      return;
    }

    const originHeader = req.get('origin');
    const refererHeader = req.get('referer');
    const normalizedOriginHeader = String(originHeader || '').trim().toLowerCase();
    const sourceHeader = normalizedOriginHeader && normalizedOriginHeader !== 'null'
      ? originHeader
      : refererHeader;
    const hasVerifiableSourceHeader = Boolean(sourceHeader);
    let requestOrigin = null;

    try {
      if (sourceHeader) {
        requestOrigin = new URL(sourceHeader).origin;
      }
    } catch (_error) {
      requestOrigin = null;
    }

    if (hasVerifiableSourceHeader && requestOrigin !== allowedOrigin) {
      res.status(403).send(buildForbiddenPage({
        currentAdmin: req.currentAdmin,
        csrfToken: req.session?.csrfToken || '',
        message: 'Origen de la solicitud no permitido.'
      }));
      return;
    }

    next();
  });

  router.use((req, res, next) => {
    if (req.method !== 'POST') {
      next();
      return;
    }

    const sessionToken = req.session?.csrfToken;
    const requestToken = req.body?._csrf || req.get('x-csrf-token');
    const sessionBuffer = Buffer.from(String(sessionToken || ''), 'utf8');
    const requestBuffer = Buffer.from(String(requestToken || ''), 'utf8');
    const tokensMatch = sessionBuffer.length > 0 &&
      sessionBuffer.length === requestBuffer.length &&
      crypto.timingSafeEqual(sessionBuffer, requestBuffer);
    if (!tokensMatch) {
      if (req.path === '/login' && !req.currentAdmin) {
        rotateCsrfToken(req);
        res.redirect('/admin/login?sessionExpired=1');
        return;
      }
      res.status(403).send(buildForbiddenPage({
        currentAdmin: req.currentAdmin,
        csrfToken: req.session?.csrfToken || '',
        message: 'No hemos podido verificar la solicitud.'
      }));
      return;
    }

    next();
  });

  router.get('/login', loginPageLimiter, (req, res) => {
    if (req.currentAdmin) {
      res.redirect('/admin');
      return;
    }
    res.send(renderLoginPage({
      csrfToken: req.session.csrfToken,
      notice: req.query.sessionExpired
        ? { type: 'error', message: 'La sesión ha caducado. Vuelve a introducir tus credenciales.' }
        : req.query.error
          ? { type: 'error', message: 'Credenciales inválidas.' }
          : null
    }));
  });

  router.post('/login', loginLimiter, async (req, res) => {
    try {
      const username = String(req.body.username || '').slice(0, 128);
      const password = String(req.body.password || '').slice(0, 256);
      const admin = await authenticateAdmin(username, password);
      if (!admin) {
        res.redirect('/admin/login?error=1');
        return;
      }

      await regenerateSession(req);
      req.session.adminUserId = admin.id;
      rotateCsrfToken(req);
      res.redirect(admin.mustChangePassword ? '/admin/change-password' : '/admin');
    } catch (error) {
      logger.error('Error al autenticar admin:', error);
      res.redirect('/admin/login?error=1');
    }
  });

  router.post('/logout', async (req, res) => {
    await destroySession(req);
    res.clearCookie('basuracero_admin', { path: '/admin' });
    res.redirect('/admin/login');
  });

  router.get('/change-password', (req, res) => {
    if (!req.currentAdmin) {
      res.redirect('/admin/login');
      return;
    }
    if (req.query.saved && !req.currentAdmin.mustChangePassword) {
      res.redirect('/admin?credentialsChanged=1');
      return;
    }
    res.send(renderChangePasswordPage({
      currentAdmin: req.currentAdmin,
      notice: null,
      minLength: PASSWORD_MIN_LENGTH,
      csrfToken: req.session.csrfToken
    }));
  });

  router.post('/change-password', async (req, res) => {
    if (!req.currentAdmin) {
      res.redirect('/admin/login');
      return;
    }

    try {
      if (req.body.password !== req.body.passwordConfirm) {
        res.status(400).send(renderChangePasswordPage({
          currentAdmin: req.currentAdmin,
          notice: { type: 'error', message: 'Las contraseñas no coinciden.' },
          minLength: PASSWORD_MIN_LENGTH,
          csrfToken: req.session.csrfToken
        }));
        return;
      }

      const adminId = req.currentAdmin.id;
      await changeAdminPassword(adminId, req.body.password, adminId);
      await regenerateSession(req);
      req.session.adminUserId = adminId;
      rotateCsrfToken(req);
      res.redirect('/admin?credentialsChanged=1');
    } catch (error) {
      res.status(400).send(renderChangePasswordPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        minLength: PASSWORD_MIN_LENGTH,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.use((req, res, next) => {
    if (!req.currentAdmin) {
      res.redirect('/admin/login');
      return;
    }

    next();
  });

  router.use((req, res, next) => {
    const allowedPaths = new Set(['/change-password', '/logout']);
    if (req.currentAdmin.mustChangePassword && !allowedPaths.has(req.path)) {
      res.redirect('/admin/change-password');
      return;
    }

    next();
  });

  router.use(async (req, _res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    try {
      const settings = await getAppSettings();
      req.currentAdmin.updateStatus = await getUpdateStatus({ logger, channel: settings.UPDATE_CHANNEL });
    } catch (error) {
      logger.warn(`No se ha podido cargar el indicador de actualizaciones: ${error.message}`);
    }
    next();
  });

  router.get(['/pages/dashboard', '/resources/:resource(*)'], (_req, res) => {
    res.status(404).send('Not found');
  });

  async function renderAdminHome(req, res, next) {
    try {
      const settings = await getAppSettings();
      const [dashboard, updateStatus] = await Promise.all([
        getAdminDashboardData(),
        getUpdateStatus({ logger, channel: settings.UPDATE_CHANNEL })
      ]);
      res.send(renderDashboardPage({
        currentAdmin: req.currentAdmin,
        notice: req.query.credentialsChanged
          ? { type: 'success', message: 'Contraseña actualizada correctamente.' }
          : null,
        dashboard,
        updateStatus,
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  }

  router.get('/', renderAdminHome);
  router.get('/home', renderAdminHome);

  router.get('/updates', async (req, res, next) => {
    try {
      const settings = await getAppSettings();
      const updateStatus = await getUpdateStatus({ logger, channel: settings.UPDATE_CHANNEL });
      res.send(renderUpdatesPage({
        currentAdmin: req.currentAdmin,
        notice: req.query.saved
          ? { type: 'success', message: 'Canal de actualizaciones guardado.' }
          : req.query.check === 'current'
            ? { type: 'success', message: 'Comprobación completada. Ya tienes instalada la última versión disponible.' }
            : req.query.check === 'available'
              ? { type: 'success', message: 'Comprobación completada. Hay una actualización disponible.' }
              : req.query.check === 'error'
                ? { type: 'error', message: 'No se han podido comprobar las actualizaciones. Inténtalo de nuevo más tarde.' }
                : null,
        channel: settings.UPDATE_CHANNEL,
        installedRelease: getInstalledRelease(),
        updateStatus,
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/updates/channel', async (req, res) => {
    try {
      await updateAppSettingsSection('updates', req.body, req.currentAdmin.id);
      resetUpdateStatusCache();
      res.redirect('/admin/updates?saved=1');
    } catch (error) {
      const settings = await getAppSettings();
      res.status(400).send(renderUpdatesPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        channel: settings.UPDATE_CHANNEL,
        installedRelease: getInstalledRelease(),
        updateStatus: { checked: false, updateAvailable: false },
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.post('/updates/check', async (req, res) => {
    try {
      const settings = await getAppSettings();
      resetUpdateStatusCache();
      const updateStatus = await getUpdateStatus({ logger, channel: settings.UPDATE_CHANNEL });
      if (!updateStatus.checked) {
        res.redirect('/admin/updates?check=error');
        return;
      }
      res.redirect(updateStatus.updateAvailable
        ? '/admin/updates?check=available'
        : '/admin/updates?check=current');
    } catch (error) {
      logger.error('Error al comprobar actualizaciones:', error);
      res.redirect('/admin/updates?check=error');
    }
  });

  router.get('/administradores', async (req, res, next) => {
    try {
      const admins = await getAdminUsersList();
      res.send(renderAdminUsersPage({
        currentAdmin: req.currentAdmin,
        notice: req.query.message ? { type: 'success', message: String(req.query.message) } : null,
        admins,
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/configuracion', async (req, res, next) => {
    try {
      const settings = await getAppSettings();
      res.send(renderSettingsPage({
        currentAdmin: req.currentAdmin,
        notice: req.query.saved ? { type: 'success', message: 'Configuración actualizada.' } : null,
        settings: {
          ...settings,
          FRIENDLYCAPTCHA_SECRET: '',
          FRIENDLYCAPTCHA_SECRET_CONFIGURED: Boolean(settings.FRIENDLYCAPTCHA_SECRET)
        },
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/configuracion', async (req, res) => {
    const wantsJson = req.get('accept')?.includes('application/json');
    try {
      const section = String(req.body._section || '');
      if (section) {
        await updateAppSettingsSection(section, req.body, req.currentAdmin.id);
      } else {
        const submittedSettingKeys = Object.keys(req.body).filter((key) => SETTING_DEFINITIONS[key]);
        await updateAppSettings(req.body, req.currentAdmin.id, { keys: submittedSettingKeys });
      }
      if (wantsJson) {
        res.json({ ok: true, section: section || 'all', message: 'Cambios guardados.' });
        return;
      }
      res.redirect('/admin/configuracion?saved=1');
    } catch (error) {
      if (wantsJson) {
        res.status(400).json({ error: toActionNotice(error).message });
        return;
      }
      const persistedSettings = await getAppSettings();
      res.status(400).send(renderSettingsPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        settings: {
          ...persistedSettings,
          ...req.body,
          FRIENDLYCAPTCHA_SECRET: '',
          FRIENDLYCAPTCHA_SECRET_CONFIGURED: Boolean(persistedSettings.FRIENDLYCAPTCHA_SECRET)
        },
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.post('/configuracion/branding/:kind', (req, res) => {
    const kind = String(req.params.kind || '');
    if (!['logo', 'favicon'].includes(kind)) {
      res.status(404).json({ error: 'Tipo de imagen no permitido.' });
      return;
    }
    uploadBrandImage.single('image')(req, res, async (uploadError) => {
      if (uploadError) {
        const status = uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        res.status(status).json({
          error: status === 413
            ? 'La imagen supera el límite de 2 MB.'
            : 'Usa una imagen PNG, JPG o WebP válida.'
        });
        return;
      }
      try {
        const assetPath = await saveBrandImage(req.file, kind);
        res.status(201).json({ path: assetPath });
      } catch (_error) {
        res.status(400).json({ error: 'No se ha podido procesar la imagen.' });
      }
    });
  });

  router.post('/administradores/create', async (req, res) => {
    try {
      await createAdminUser({
        username: req.body.username,
        password: req.body.password,
        mustChangePassword: parseBoolean(req.body.mustChangePassword),
        isActive: parseBoolean(req.body.isActive)
      }, req.currentAdmin.id);
      res.redirect('/admin/administradores?message=' + encodeURIComponent('Administrador creado'));
    } catch (error) {
      const admins = await getAdminUsersList();
      res.status(400).send(renderAdminUsersPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        admins,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.post('/administradores/:id/update', async (req, res) => {
    try {
      await updateAdminUser(req.params.id, { username: req.body.username }, req.currentAdmin.id);
      res.redirect('/admin/administradores?message=' + encodeURIComponent('Administrador actualizado'));
    } catch (error) {
      const admins = await getAdminUsersList();
      res.status(400).send(renderAdminUsersPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        admins,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.post('/administradores/:id/toggle-active', async (req, res) => {
    try {
      await setAdminActiveState(req.params.id, parseBoolean(req.body.isActive), req.currentAdmin.id);
      res.redirect('/admin/administradores?message=' + encodeURIComponent('Estado de administrador actualizado'));
    } catch (error) {
      const admins = await getAdminUsersList();
      res.status(400).send(renderAdminUsersPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        admins,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.post('/administradores/:id/force-reset', async (req, res) => {
    try {
      await forcePasswordReset(req.params.id, req.currentAdmin.id);
      res.redirect('/admin/administradores?message=' + encodeURIComponent('Cambio de contraseña forzado'));
    } catch (error) {
      const admins = await getAdminUsersList();
      res.status(400).send(renderAdminUsersPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        admins,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.get('/categorias', async (req, res, next) => {
    try {
      await renderCategoriasResponse(
        res,
        req.currentAdmin,
        req.query.message ? { type: 'success', message: String(req.query.message) } : null,
        req.session.csrfToken
      );
    } catch (error) {
      next(error);
    }
  });

  router.post('/categorias/create', async (req, res) => {
    try {
      await createTipo(req.body.nombre, req.body.icono, req.currentAdmin.id);
      await renderCategoriasResponse(res, req.currentAdmin, { type: 'success', message: 'Categoria creada' }, req.session.csrfToken);
    } catch (error) {
      await renderCategoriasResponse(res, req.currentAdmin, toActionNotice(error), req.session.csrfToken, 400);
    }
  });

  router.post('/categorias/:id/rename', async (req, res) => {
    try {
      await renameTipo(req.params.id, req.body.nombre, req.body.icono, req.currentAdmin.id);
      await renderCategoriasResponse(res, req.currentAdmin, { type: 'success', message: 'Categoria actualizada' }, req.session.csrfToken);
    } catch (error) {
      await renderCategoriasResponse(res, req.currentAdmin, toActionNotice(error), req.session.csrfToken, 400);
    }
  });

  router.post('/categorias/:id/delete', async (req, res) => {
    try {
      await deleteTipoIfUnused(req.params.id, req.currentAdmin.id);
      res.redirect('/admin/categorias?message=' + encodeURIComponent('Categoria eliminada'));
    } catch (error) {
      const categorias = await getTipoSummary();
      res.status(400).send(renderCategoriasPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        categorias,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.post('/categorias/merge', async (req, res) => {
    try {
      const result = await mergeTipos(req.body.sourceTipoId, req.body.targetTipoId, req.currentAdmin.id);
      res.redirect('/admin/categorias?message=' + encodeURIComponent(`Fusionadas ${result.affectedIncidencias} incidencias`));
    } catch (error) {
      const categorias = await getTipoSummary();
      res.status(400).send(renderCategoriasPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        categorias,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.get('/auditoria', async (req, res, next) => {
    try {
      const entries = await getAdminAuditEntries();
      res.send(renderAuditPage({
        currentAdmin: req.currentAdmin,
        notice: req.query.message ? { type: 'success', message: String(req.query.message) } : null,
        entries,
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/incidencias', async (req, res, next) => {
    try {
      const filters = {
        search: String(req.query.search || '').trim(),
        estado: String(req.query.estado || '').trim(),
        tipoId: String(req.query.tipoId || '').trim(),
        sortBy: String(req.query.sortBy || 'fecha').trim(),
        sortDir: String(req.query.sortDir || 'desc').trim()
      };
      const [incidencias, tipos] = await Promise.all([
        getAdminIncidenciasList(filters),
        all('SELECT id, nombre, icono FROM tipos_incidencias ORDER BY nombre COLLATE NOCASE ASC')
      ]);

      res.send(renderIncidenciasListPage({
        currentAdmin: req.currentAdmin,
        notice: req.query.message ? { type: 'success', message: String(req.query.message) } : null,
        incidencias,
        tipos,
        filters,
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/avisos-ayuntamiento', async (req, res, next) => {
    try {
      const filters = {
        search: String(req.query.search || '').trim(),
        estado: String(req.query.estado || '').trim(),
        tipoId: String(req.query.tipoId || '').trim(),
        sortBy: String(req.query.sortBy || 'avisos').trim(),
        sortDir: String(req.query.sortDir || 'desc').trim()
      };
      const [reports, tipos] = await Promise.all([
        getAdminExternalReportsList(filters),
        all('SELECT id, nombre, icono FROM tipos_incidencias ORDER BY nombre COLLATE NOCASE ASC')
      ]);
      res.send(renderExternalReportsPage({
        currentAdmin: req.currentAdmin,
        notice: req.query.message ? { type: 'success', message: String(req.query.message) } : null,
        reports,
        tipos,
        filters,
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/incidencias/bulk', async (req, res, next) => {
    try {
      const rawSelectedIds = Array.isArray(req.body.selectedIds)
        ? req.body.selectedIds
        : req.body.selectedIds ? [req.body.selectedIds] : [];
      const parsedSelectedIds = rawSelectedIds.map((value) => Number.parseInt(value, 10));
      const hasInvalidId = parsedSelectedIds.some((value) => !Number.isInteger(value) || value <= 0);
      const selectedIds = [...new Set(parsedSelectedIds.filter((value) => Number.isInteger(value) && value > 0))];
      const bulkAction = String(req.body.bulkAction || '').trim();

      if (!selectedIds.length) {
        res.redirect('/admin/incidencias?message=' + encodeURIComponent('Selecciona al menos una incidencia'));
        return;
      }

      if (!bulkAction) {
        res.redirect('/admin/incidencias?message=' + encodeURIComponent('Selecciona una accion masiva'));
        return;
      }

      const allowedBulkActions = new Set(['activa', 'solucionada', 'spam', 'changeTipo', 'clearSolutionReports']);
      if (!allowedBulkActions.has(bulkAction) || selectedIds.length > 100 || hasInvalidId) {
        res.status(400).send(buildForbiddenPage({
          currentAdmin: req.currentAdmin,
          csrfToken: req.session.csrfToken,
          message: 'La seleccion o la accion masiva no es valida.'
        }));
        return;
      }

      const placeholders = selectedIds.map(() => '?').join(',');
      const existing = await get(`SELECT COUNT(*) AS total FROM incidencias WHERE id IN (${placeholders})`, selectedIds);
      if (Number(existing?.total) !== selectedIds.length) {
        res.status(400).send(buildForbiddenPage({
          currentAdmin: req.currentAdmin,
          csrfToken: req.session.csrfToken,
          message: 'Alguna incidencia seleccionada ya no existe.'
        }));
        return;
      }

      if (bulkAction === 'changeTipo') {
        const targetTipo = await get('SELECT id FROM tipos_incidencias WHERE id = ?', [req.body.bulkTipoId]);
        if (!targetTipo) {
          res.redirect('/admin/incidencias?message=' + encodeURIComponent('Selecciona una categoria de destino valida'));
          return;
        }
      }

      await run('BEGIN');
      try {
        for (const incidenciaId of selectedIds) {
          if (bulkAction === 'clearSolutionReports') {
            await clearSolutionReports(incidenciaId, req.currentAdmin.id);
          } else if (bulkAction === 'changeTipo') {
            await changeIncidenciaTipo(incidenciaId, req.body.bulkTipoId, req.currentAdmin.id);
          } else {
            await updateIncidenciaState(incidenciaId, bulkAction, req.currentAdmin.id);
          }
        }
        await run('COMMIT');
      } catch (error) {
        await run('ROLLBACK').catch(() => {});
        throw error;
      }

      res.redirect('/admin/incidencias?message=' + encodeURIComponent(`Actualizadas ${selectedIds.length} incidencias`));
    } catch (error) {
      next(error);
    }
  });

  router.get('/incidencias/:id', async (req, res, next) => {
    try {
      const incidencia = await getIncidenciaDetail(req.params.id);
      if (!incidencia) {
        res.status(404).send(renderDashboardPage({
          currentAdmin: req.currentAdmin,
          notice: { type: 'error', message: 'Incidencia no encontrada.' },
          dashboard: await getAdminDashboardData(),
          csrfToken: req.session.csrfToken
        }));
        return;
      }

      const tipos = await all('SELECT id, nombre, icono FROM tipos_incidencias ORDER BY nombre COLLATE NOCASE ASC');
      res.send(renderIncidenciaDetailPage({
        currentAdmin: req.currentAdmin,
        notice: req.query.message ? { type: 'success', message: req.query.message } : null,
        incidencia,
        tipos,
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/incidencias/:id/state', async (req, res, next) => {
    try {
      await updateIncidenciaState(req.params.id, req.body.state, req.currentAdmin.id);
      res.redirect(`/admin/incidencias/${req.params.id}?message=${encodeURIComponent('Estado actualizado')}`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/incidencias/:id', async (req, res) => {
    try {
      await updateIncidencia(req.params.id, req.body, req.currentAdmin.id);
      res.redirect(`/admin/incidencias/${req.params.id}?message=${encodeURIComponent('Incidencia actualizada correctamente')}`);
    } catch (error) {
      const incidencia = await getIncidenciaDetail(req.params.id);
      const tipos = await all('SELECT id, nombre, icono FROM tipos_incidencias ORDER BY nombre COLLATE NOCASE ASC');
      res.status(400).send(renderIncidenciaDetailPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        incidencia,
        tipos,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.post('/incidencias/:id/imagenes/:imageId/delete', async (req, res) => {
    try {
      await deleteIncidenciaImage(req.params.id, req.params.imageId, req.currentAdmin.id);
      res.redirect(`/admin/incidencias/${req.params.id}?message=${encodeURIComponent('Foto eliminada')}`);
    } catch (error) {
      const incidencia = await getIncidenciaDetail(req.params.id);
      const tipos = await all('SELECT id, nombre, icono FROM tipos_incidencias ORDER BY nombre COLLATE NOCASE ASC');
      res.status(400).send(renderIncidenciaDetailPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        incidencia,
        tipos,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.post('/incidencias/:id/tipo', async (req, res, next) => {
    try {
      await changeIncidenciaTipo(req.params.id, req.body.tipoId, req.currentAdmin.id);
      res.redirect(`/admin/incidencias/${req.params.id}?message=${encodeURIComponent('Categoria actualizada')}`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/incidencias/:id/clear-solution-reports', async (req, res, next) => {
    try {
      await clearSolutionReports(req.params.id, req.currentAdmin.id);
      res.redirect(`/admin/incidencias/${req.params.id}?message=${encodeURIComponent('Reportes de solucion limpiados')}`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/incidencias/:id/reportes-solucion/:reportId/delete', async (req, res, next) => {
    try {
      await deleteSolutionReport(req.params.reportId, req.currentAdmin.id);
      res.redirect(`/admin/incidencias/${req.params.id}?message=${encodeURIComponent('Reporte de solucion eliminado')}`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/incidencias/:id/reportes-inadecuados/:reportId/delete', async (req, res, next) => {
    try {
      await deleteInadequateReport(req.params.reportId, req.currentAdmin.id);
      res.redirect(`/admin/incidencias/${req.params.id}?message=${encodeURIComponent('Reporte inadecuado eliminado')}`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/incidencias/:id/delete', async (req, res) => {
    try {
      await deleteIncidencia(req.params.id, req.currentAdmin.id, req.body.confirmationText);
      res.redirect('/admin/incidencias?message=' + encodeURIComponent('Incidencia eliminada definitivamente'));
    } catch (error) {
      const incidencia = await getIncidenciaDetail(req.params.id);
      const tipos = await all('SELECT id, nombre, icono FROM tipos_incidencias ORDER BY nombre COLLATE NOCASE ASC');
      res.status(400).send(renderIncidenciaDetailPage({
        currentAdmin: req.currentAdmin,
        notice: toActionNotice(error),
        incidencia,
        tipos,
        csrfToken: req.session.csrfToken
      }));
    }
  });

  router.get('/maintenance', async (req, res, next) => {
    try {
      const tipos = await all('SELECT id, nombre, icono FROM tipos_incidencias ORDER BY nombre COLLATE NOCASE ASC');
      const appSettings = await getAppSettings();
      const oldSolvableCriteria = req.session.oldSolvableCriteria || {
        days: Number.parseInt(appSettings.DIAS_PARA_CONSIDERAR_ANTIGUA, 10) || 14,
        votes: Number.parseInt(appSettings.REPORTES_PARA_SOLUCIONAR_ANTIGUA, 10) || 2
      };
      const [preview, inadequateIncidencias, missingLocationIncidencias] = await Promise.all([
        previewOldSolvable(oldSolvableCriteria),
        getInadequateReportedIncidencias(),
        getMissingLocationIncidencias(100)
      ]);
      res.send(renderMaintenancePage({
        currentAdmin: req.currentAdmin,
        missingLocationIncidencias,
        notice: req.query.message ? { type: 'success', message: req.query.message } : null,
        inadequateIncidencias,
        oldSolvableCriteria,
        preview,
        tipos,
        csrfToken: req.session.csrfToken
      }));
    } catch (error) {
      next(error);
    }
  });

  async function renderMaintenanceError(req, res, error) {
    const tipos = await all('SELECT id, nombre, icono FROM tipos_incidencias ORDER BY nombre COLLATE NOCASE ASC');
    const appSettings = await getAppSettings();
    const oldSolvableCriteria = req.session.oldSolvableCriteria || {
      days: Number.parseInt(appSettings.DIAS_PARA_CONSIDERAR_ANTIGUA, 10) || 14,
      votes: Number.parseInt(appSettings.REPORTES_PARA_SOLUCIONAR_ANTIGUA, 10) || 2
    };
    const [preview, inadequateIncidencias, missingLocationIncidencias] = await Promise.all([
      previewOldSolvable(oldSolvableCriteria),
      getInadequateReportedIncidencias(),
      getMissingLocationIncidencias(100)
    ]);
    res.status(400).send(renderMaintenancePage({
      currentAdmin: req.currentAdmin,
      missingLocationIncidencias,
      inadequateIncidencias,
      notice: toActionNotice(error),
      oldSolvableCriteria,
      preview,
      tipos,
      csrfToken: req.session.csrfToken
    }));
  }

  router.post('/maintenance/merge-tipos', async (req, res) => {
    try {
      await mergeTipos(req.body.sourceTipoId, req.body.targetTipoId, req.currentAdmin.id);
      res.redirect('/admin/maintenance?message=Tipos%20fusionados');
    } catch (error) {
      await renderMaintenanceError(req, res, error);
    }
  });

  router.post('/maintenance/clear-solution-reports', async (req, res) => {
    try {
      await clearSolutionReports(req.body.incidenciaId, req.currentAdmin.id);
      res.redirect('/admin/maintenance?message=Reportes%20limpiados');
    } catch (error) {
      await renderMaintenanceError(req, res, error);
    }
  });

  router.post('/maintenance/clear-inadequate-reports', async (req, res) => {
    try {
      await clearInadequateReports(req.body.incidenciaId, req.currentAdmin.id);
      res.redirect('/admin/maintenance?message=Reportes%20inadecuados%20limpiados');
    } catch (error) {
      await renderMaintenanceError(req, res, error);
    }
  });

  router.post('/maintenance/moderate-inadequate-reports', async (req, res) => {
    try {
      const result = await moderateInadequateIncidencias({
        action: req.body.action,
        incidenciaIds: req.body.incidenciaIds
      }, req.currentAdmin.id);
      const message = result.action === 'delete'
        ? `${result.total} ${result.total === 1 ? 'incidencia eliminada' : 'incidencias eliminadas'}`
        : `Reportes limpiados en ${result.total} ${result.total === 1 ? 'incidencia' : 'incidencias'}`;
      res.redirect(`/admin/maintenance?message=${encodeURIComponent(message)}`);
    } catch (error) {
      await renderMaintenanceError(req, res, error);
    }
  });

  router.post('/maintenance/mark-spam', async (req, res) => {
    try {
      await updateIncidenciaState(req.body.incidenciaId, 'spam', req.currentAdmin.id);
      res.redirect('/admin/maintenance?message=Incidencia%20marcada%20como%20spam');
    } catch (error) {
      await renderMaintenanceError(req, res, error);
    }
  });

  router.post('/maintenance/preview-old-solvable', async (req, res) => {
    try {
      const days = Number.parseInt(req.body.days, 10);
      const votes = Number.parseInt(req.body.votes, 10);
      await previewOldSolvable({ days, votes });
      req.session.oldSolvableCriteria = { days, votes };
      res.redirect('/admin/maintenance?message=Criterios%20actualizados');
    } catch (error) {
      await renderMaintenanceError(req, res, error);
    }
  });

  router.post('/maintenance/run-old-solvable', async (req, res) => {
    try {
      const days = Number.parseInt(req.body.days, 10);
      const votes = Number.parseInt(req.body.votes, 10);
      const scope = req.body.scope === 'all' ? 'all' : 'selected';
      const incidenciaIds = scope === 'all' ? undefined : req.body.incidenciaIds;
      const updated = await executeOldSolvable({ days, votes, incidenciaIds }, req.currentAdmin.id);
      req.session.oldSolvableCriteria = { days, votes };
      res.redirect(`/admin/maintenance?message=${encodeURIComponent(`Se han actualizado ${updated.length} incidencias`)}`);
    } catch (error) {
      await renderMaintenanceError(req, res, error);
    }
  });

  router.post('/maintenance/process-missing-location', async (req, res) => {
    try {
      const updated = await processMissingLocationIncidencias(100, req.currentAdmin.id);
      res.redirect(`/admin/maintenance?message=${encodeURIComponent(`Ubicacion completada en ${updated.length} incidencias`)}`);
    } catch (error) {
      await renderMaintenanceError(req, res, error);
    }
  });

  return router;
}

async function mountAdmin(app, logger = console, { baseUrl } = {}) {
  const sessionMiddleware = createSessionMiddleware(logger);
  const authRouter = createAdminAuthRouter(logger, { baseUrl });
  app.use('/admin', sessionMiddleware, authRouter);
}

module.exports = {
  getSessionSecret,
  mountAdmin
};
