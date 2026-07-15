const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

jest.mock('axios');

describe('Panel admin', () => {
  let app;
  let agent;
  let service;
  let dbAsync;
  let db;
  let logger;
  let tempPassword;

  function extractCsrfToken(html) {
    const match = html.match(/name="_csrf" value="([^"]+)"/);
    return match ? match[1] : null;
  }

  function getSessionCookie(response) {
    return response.headers['set-cookie']?.find((item) => item.startsWith('basuracero_admin=')) || null;
  }

  function getSessionIdFromCookie(cookieHeader) {
    const match = cookieHeader?.match(/basuracero_admin=([^;]+)/);
    return match ? match[1] : null;
  }

  async function fetchCsrf(pathname) {
    const response = await agent.get(pathname);
    return {
      response,
      csrf: extractCsrfToken(response.text)
    };
  }

  async function postWithCsrf(pathname, data, csrfPath = pathname) {
    const { csrf } = await fetchCsrf(csrfPath);
    return agent
      .post(pathname)
      .type('form')
      .send({ ...data, _csrf: csrf });
  }

  async function loadFreshApp({ nodeEnv = 'test' } = {}) {
    jest.resetModules();

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-admin-'));
    process.env.SQLITE_DB_PATH = path.join(tempDir, 'incidencias.sqlite');
    process.env.UPLOADS_DIR = path.join(tempDir, 'uploads');
    process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters';
    process.env.ADMIN_ENABLED = 'true';
    process.env.NODE_ENV = nodeEnv;
    if (nodeEnv === 'production') {
      process.env.ADMIN_BOOTSTRAP_PASSWORD = 'BootstrapProduccionSegura123';
      process.env.TRUST_PROXY = '1';
    } else {
      delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
      delete process.env.TRUST_PROXY;
    }
    process.env.ADMIN_LOGIN_RATE_LIMIT_MAX = '2';
    process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS = '60000';

    logger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn()
    };

    const appModule = require('../../src/server/app');
    service = require('../../src/server/admin/service');
    dbAsync = require('../../src/server/utils/dbAsync');
    db = require('../../src/server/config/database');
    app = await appModule.createApp({ logger });
    agent = request.agent(app);

    tempPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || logger.warn.mock.calls
      .map(([message]) => message)
      .find((message) => typeof message === 'string' && message.startsWith('Contraseña temporal admin:'))
      ?.split(': ')
      ?.at(1);
  }

  beforeAll(async () => {
    await loadFreshApp();
  });

  afterAll((done) => {
    delete process.env.SQLITE_DB_PATH;
    delete process.env.UPLOADS_DIR;
    delete process.env.SESSION_SECRET;
    delete process.env.NODE_ENV;
    delete process.env.ADMIN_LOGIN_RATE_LIMIT_MAX;
    delete process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
    delete process.env.ADMIN_ENABLED;
    delete process.env.TRUST_PROXY;
    if (db && typeof db.close === 'function') {
      db.close(() => done());
      return;
    }
    done();
  });

  it('crea el admin bootstrap con cambio obligatorio de contraseña', async () => {
    const admin = await service.getAdminByUsername('admin');
    const tipos = await dbAsync.all('SELECT nombre, icono FROM tipos_incidencias ORDER BY id ASC');

    expect(admin).toBeTruthy();
    expect(admin.mustChangePassword).toBe(true);
    expect(admin.isActive).toBe(true);
    expect(tempPassword).toBeTruthy();
    expect(tipos.length).toBeGreaterThan(0);
    expect(tipos.find((tipo) => tipo.nombre === 'Basura u objetos abandonados')?.icono).toBe('mdi-trash-can');
  });

  it('no crea un segundo admin al volver a ejecutar el bootstrap', async () => {
    const firstRun = await service.bootstrapAdminIfNeeded(logger);
    const adminsBefore = await dbAsync.all('SELECT id FROM admin_users');
    const secondRun = await service.bootstrapAdminIfNeeded(logger);
    const adminsAfter = await dbAsync.all('SELECT id FROM admin_users');

    expect(firstRun.created).toBe(false);
    expect(secondRun.created).toBe(false);
    expect(adminsBefore).toHaveLength(1);
    expect(adminsAfter).toHaveLength(1);
  });

  it('protege las paginas administrativas sin sesion', async () => {
    const response = await agent.get('/admin/incidencias');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/admin/login');
  });

  it('bloquea login con credenciales incorrectas', async () => {
    const { csrf } = await fetchCsrf('/admin/login');
    const response = await agent
      .post('/admin/login')
      .type('form')
      .send({ username: 'admin', password: 'incorrecta', _csrf: csrf });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/admin/login?error=1');
  });

  it('obliga a cambiar la contraseña temporal tras el login', async () => {
    const loginPage = await agent.get('/admin/login');
    const initialSessionId = getSessionIdFromCookie(getSessionCookie(loginPage));
    const csrf = extractCsrfToken(loginPage.text);
    const loginResponse = await agent
      .post('/admin/login')
      .type('form')
      .send({ username: 'admin', password: tempPassword, _csrf: csrf });

    expect(loginResponse.status).toBe(302);
    expect(loginResponse.headers.location).toBe('/admin/change-password');
    const authenticatedSessionId = getSessionIdFromCookie(getSessionCookie(loginResponse));
    expect(authenticatedSessionId).not.toBe(initialSessionId);

    const changeForm = await agent.get('/admin/change-password');
    expect(changeForm.status).toBe(200);
    expect(changeForm.text).toContain('Cambiar contraseña');

    const changeCsrf = extractCsrfToken(changeForm.text);
    const saveResponse = await agent
      .post('/admin/change-password')
      .type('form')
      .send({
        password: 'NuevaContrasenaSegura123',
        passwordConfirm: 'NuevaContrasenaSegura123',
        _csrf: changeCsrf
      });

    expect(saveResponse.status).toBe(302);
    expect(saveResponse.headers.location).toBe('/admin?passwordChanged=1');
    expect(getSessionIdFromCookie(getSessionCookie(saveResponse))).not.toBe(authenticatedSessionId);

    const panelResponse = await agent.get('/admin?passwordChanged=1');
    expect(panelResponse.status).toBe(200);
    expect(panelResponse.text).toContain('Panel de control');
    expect(panelResponse.text).toContain('Contraseña actualizada correctamente.');
    expect(panelResponse.text).toContain('Incidencias recientes');
    expect(panelResponse.text).toContain('Categorias');
  });

  it('muestra fotos recientes y accesos amigables en la portada del panel', async () => {
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Contenedor desbordado junto al parque', 41.65, -4.72, 'Vecina', 'activa', 'Centro', 'Calle Mayor 1']
    );
    await dbAsync.run(
      'INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)',
      [incidencia.lastID, 'foto-prueba.jpg']
    );

    const response = await agent.get('/admin');

    expect(response.status).toBe(200);
    expect(response.text).toContain('/admin/incidencias');
    expect(response.text).toContain('Contenedor desbordado junto al parque');
    expect(response.text).toContain('Categorias');
    expect(response.text).not.toContain('IncidenciaEntity');
  });

  it('convierte las rutas tecnicas heredadas en 404', async () => {
    const adminRedirect = await agent.get('/admin/resources/administradores/actions/list');
    const categoriasRedirect = await agent.get('/admin/resources/tipos-incidencia/actions/list');
    const auditoriaRedirect = await agent.get('/admin/resources/auditoria-admin/actions/list');
    const incidenciaRecordRedirect = await agent.get('/admin/resources/incidencias/records/1/show');
    const reportesSolucionRedirect = await agent.get('/admin/resources/reportes-solucion/actions/list');
    const reportesInadecuadosRedirect = await agent.get('/admin/resources/reportes-inadecuados/actions/list');
    const dashboardRoute = await agent.get('/admin/pages/dashboard');

    expect(adminRedirect.status).toBe(404);
    expect(categoriasRedirect.status).toBe(404);
    expect(auditoriaRedirect.status).toBe(404);
    expect(incidenciaRecordRedirect.status).toBe(404);
    expect(reportesSolucionRedirect.status).toBe(404);
    expect(reportesInadecuadosRedirect.status).toBe(404);
    expect(dashboardRoute.status).toBe(404);
  });

  it('muestra paginas propias de administradores, categorias y auditoria en espanol', async () => {
    const adminPage = await agent.get('/admin/administradores');
    expect(adminPage.status).toBe(200);
    expect(adminPage.text).toContain('Administradores');
    expect(adminPage.text).toContain('Nuevo administrador');
    expect(adminPage.text).not.toContain('AdminJS');
    expect(adminPage.text).not.toContain('List');

    const categoriasPage = await agent.get('/admin/categorias');
    expect(categoriasPage.status).toBe(200);
    expect(categoriasPage.text).toContain('Categorias');
    expect(categoriasPage.text).toContain('Fusionar categorias');
    expect(categoriasPage.text).not.toContain('>Filter<');

    const auditoriaPage = await agent.get('/admin/auditoria');
    expect(auditoriaPage.status).toBe(200);
    expect(auditoriaPage.text).toContain('Auditoria');
    expect(auditoriaPage.text).toContain('Actividad reciente');
    expect(auditoriaPage.text).not.toContain('Dashboard');
  });

  it('permite crear y actualizar administradores desde el panel propio', async () => {
    const createResponse = await postWithCsrf('/admin/administradores/create', {
        username: 'operador-panel',
        password: 'ClaveSeguraOperador123',
        mustChangePassword: '1',
        isActive: '1'
      }, '/admin/administradores');

    expect(createResponse.status).toBe(302);
    expect(createResponse.headers.location).toContain('/admin/administradores?message=');

    const created = await dbAsync.get(
      'SELECT username, must_change_password, is_active, password_hash FROM admin_users WHERE username = ?',
      ['operador-panel']
    );
    expect(created).toBeTruthy();
    expect(created.must_change_password).toBe(1);
    expect(created.is_active).toBe(1);
    expect(created.password_hash).not.toBe('ClaveSeguraOperador123');

    const updateResponse = await postWithCsrf(
      '/admin/administradores/2/update',
      { username: 'operador-renombrado' },
      '/admin/administradores'
    );

    expect(updateResponse.status).toBe(302);
    expect(updateResponse.headers.location).toContain('/admin/administradores?message=');

    const updated = await dbAsync.get('SELECT username FROM admin_users WHERE id = 2');
    expect(updated.username).toBe('operador-renombrado');
  });

  it('permite crear, actualizar icono, renombrar y borrar categorias sin incidencias desde el panel propio', async () => {
    const createResponse = await postWithCsrf(
      '/admin/categorias/create',
      { nombre: 'Categoria temporal panel', icono: 'mdi-water' },
      '/admin/categorias'
    );

    expect(createResponse.status).toBe(200);
    expect(createResponse.text).toContain('Categoria creada');
    expect(createResponse.text).toContain('Categoria temporal panel');

    const created = await dbAsync.get(
      'SELECT id, nombre, icono FROM tipos_incidencias WHERE nombre = ?',
      ['Categoria temporal panel']
    );
    expect(created).toBeTruthy();
    expect(created.icono).toBe('mdi-water');

    const renameResponse = await postWithCsrf(
      `/admin/categorias/${created.id}/rename`,
      { nombre: 'Categoria temporal renombrada', icono: 'mdi-lightbulb-off' },
      '/admin/categorias'
    );

    expect(renameResponse.status).toBe(200);
    expect(renameResponse.text).toContain('Categoria actualizada');
    expect(renameResponse.text).toContain('Categoria temporal renombrada');

    const renamed = await dbAsync.get('SELECT nombre, icono FROM tipos_incidencias WHERE id = ?', [created.id]);
    expect(renamed.nombre).toBe('Categoria temporal renombrada');
    expect(renamed.icono).toBe('mdi-lightbulb-off');

    const deleteResponse = await postWithCsrf(
      `/admin/categorias/${created.id}/delete`,
      {},
      '/admin/categorias'
    );

    expect(deleteResponse.status).toBe(302);
    expect(deleteResponse.headers.location).toContain('/admin/categorias?message=');

    const deleted = await dbAsync.get('SELECT id FROM tipos_incidencias WHERE id = ?', [created.id]);
    expect(deleted).toBeUndefined();
  });

  it('muestra un selector visual de iconos en categorias', async () => {
    const response = await agent.get('/admin/categorias');

    expect(response.status).toBe(200);
    expect(response.text).toContain('/admin-assets/mdi/css/materialdesignicons.min.css');
    expect(response.text).toContain('Nueva categoria');
    expect(response.text).toContain('data-open-category-create');
    expect(response.text).toContain('Buscar icono');
    expect(response.text).toContain('mdi-trash-can');
    expect(response.text).toContain('mdi-ab-testing');
    expect(response.text).toContain('Iconos recomendados');
    expect(response.text).toContain('Ver todos');
    expect(response.text).toContain('data-recommended-icons');
    expect(response.text).not.toContain('Nombre claro, icono reconocible y guardado en un solo paso.');
    expect(response.text).not.toContain('Categoria operativa');
  });

  it('permite actualizar identidad y apariencia desde configuracion', async () => {
    const page = await agent.get('/admin/configuracion');
    expect(page.status).toBe(200);
    expect(page.text).toContain('Identidad');
    expect(page.text).toContain('Apariencia');
    expect(page.text).toContain('Reporte por WhatsApp');
    expect(page.text).toContain('Enviar la incidencia directamente');
    expect(page.text).toContain('Subir logotipo');
    expect(page.text).toContain('Subir icono');
    expect(page.text).toContain('Logotipo actual');
    expect(page.text).toContain('Cabecera pública');
    expect(page.text).toContain('settings-preview-header');
    expect(page.text).not.toContain('settings-preview-brand');
    expect(page.text).toContain('https://app.friendlycaptcha.eu/');
    expect(page.text).toContain('Obtener claves ↗');
    expect(page.text).toContain('rel="noopener noreferrer"');
    expect(page.text).not.toContain('Ruta del logotipo');
    expect(page.text).not.toContain('SESSION_SECRET');

    const response = await agent
      .post('/admin/configuracion')
      .type('form')
      .send({
        _csrf: extractCsrfToken(page.text),
        APP_NAME: 'Basura Cero Test',
        APP_SUBTITLE: 'Barrio',
        APP_DESCRIPTION: 'Descripcion publica de prueba',
        APP_LOGO_PATH: '/img/default/logo.png',
        APP_FAVICON_PATH: '/img/default/favicon.png',
        APP_PRIMARY_COLOR: '#334455',
        APP_SECONDARY_COLOR: '#667788',
        APP_BACKGROUND_COLOR: '#ffffff',
        APP_SUCCESS_COLOR: '#228844',
        APP_ERROR_COLOR: '#aa3344',
        APP_WARNING_COLOR: '#cc8800',
        APP_INFO_COLOR: '#3366aa',
        VITE_INSTRUCCIONES_REGISTRO: 'Comprueba la ubicacion antes de enviar.',
        WHATSAPP_SHARE_ENABLED: 'true',
        WHATSAPP_SHARE_PHONE: '34600100100',
        WHATSAPP_REQUIRE_ACTIVATION: 'false',
        FRIENDLYCAPTCHA_ENABLED: 'false',
        FRIENDLYCAPTCHA_SITEKEY: '',
        FRIENDLYCAPTCHA_SECRET: '',
        ANALYTICS_PROVIDER: 'none',
        MATOMO_URL: '',
        MATOMO_SITE_ID: '',
        GA_ID: '',
        CIUDAD_LAT_MIN: '41.54',
        CIUDAD_LAT_MAX: '41.72',
        CIUDAD_LON_MIN: '-4.89',
        CIUDAD_LON_MAX: '-4.64',
        MAPA_CENTRO_LAT: '41.65',
        MAPA_CENTRO_LON: '-4.72',
        MAPA_ZOOM_INICIAL: '13'
      });
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/admin/configuracion?saved=1');

    const config = await agent.get('/api/config');
    expect(config.body.APP_NAME).toBe('Basura Cero Test');
    expect(config.body.APP_PRIMARY_COLOR).toBe('#334455');
    expect(config.body.VITE_INSTRUCCIONES_REGISTRO).toContain('ubicacion');
    expect(config.body.WHATSAPP_SHARE_ENABLED).toBe('true');
    expect(config.body.WHATSAPP_SHARE_PHONE).toBe('34600100100');
    expect(config.body.WHATSAPP_REQUIRE_ACTIVATION).toBe('false');
  });

  it('impide activar servicios externos con una configuración incompleta', async () => {
    const settingsService = require('../../src/server/admin/settings');
    const current = await settingsService.getAppSettings();

    await expect(settingsService.updateAppSettings({
      ...current,
      FRIENDLYCAPTCHA_ENABLED: 'true',
      FRIENDLYCAPTCHA_SITEKEY: '',
      FRIENDLYCAPTCHA_SECRET: ''
    }, 1)).rejects.toThrow('sitekey y la clave secreta');

    await expect(settingsService.updateAppSettings({
      ...current,
      ANALYTICS_PROVIDER: 'matomo',
      MATOMO_URL: '',
      MATOMO_SITE_ID: ''
    }, 1)).rejects.toThrow('URL y el Site ID');

    await expect(settingsService.updateAppSettings({
      ...current,
      ANALYTICS_PROVIDER: 'google',
      GA_ID: ''
    }, 1)).rejects.toThrow('ID de medición');
  });

  it('permite subir imagenes de marca protegidas por CSRF y valida el formato', async () => {
    const page = await agent.get('/admin/configuracion');
    const csrf = extractCsrfToken(page.text);
    const sharp = require('sharp');
    const png = await sharp({
      create: { width: 32, height: 32, channels: 4, background: '#334455' }
    }).png().toBuffer();

    const uploaded = await agent
      .post('/admin/configuracion/branding/logo')
      .set('x-csrf-token', csrf)
      .attach('image', png, { filename: 'logo.png', contentType: 'image/png' });

    expect(uploaded.status).toBe(201);
    expect(uploaded.body.path).toMatch(/^\/uploads\/branding\/logo-[a-f0-9-]+\.png$/);
    expect(fs.existsSync(path.join(process.env.UPLOADS_DIR, uploaded.body.path.replace('/uploads/', '')))).toBe(true);

    const invalid = await agent
      .post('/admin/configuracion/branding/favicon')
      .set('x-csrf-token', csrf)
      .attach('image', Buffer.from('<html></html>'), { filename: 'favicon.html', contentType: 'text/html' });
    expect(invalid.status).toBe(400);

    const missingCsrf = await agent
      .post('/admin/configuracion/branding/logo')
      .attach('image', png, { filename: 'logo.png', contentType: 'image/png' });
    expect(missingCsrf.status).toBe(403);
  });

  it('muestra una ficha propia de incidencia editable con imagen y acciones utiles', async () => {
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Bolsa acumulada en la esquina', 41.65, -4.72, 'Vecino', 'activa', 'Centro', 'Calle Sol 3']
    );
    await dbAsync.run(
      'INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)',
      [incidencia.lastID, 'detalle-incidencia.jpg']
    );

    const response = await agent.get(`/admin/incidencias/${incidencia.lastID}`);

    expect(response.status).toBe(200);
    expect(response.text).toContain('Incidencia #');
    expect(response.text).toContain('/uploads/detalle-incidencia.jpg');
    expect(response.text).toContain('Editar incidencia');
    expect(response.text).toContain('Guardar cambios');
    expect(response.text).toContain('Panel');
    expect(response.text).toContain('name="descripcion"');
    expect(response.text).toContain('name="tipoId"');
    expect(response.text).toContain('name="estado"');
    expect(response.text).toContain('name="fecha"');
    expect(response.text).toContain('type="date"');
    expect(response.text).toContain('data-open-photo-modal');
    expect(response.text).toContain(`/admin/incidencias/${incidencia.lastID}/imagenes/`);
  });

  it('permite editar una incidencia desde su ficha', async () => {
    const tipoNuevo = await dbAsync.run(
      `INSERT INTO tipos_incidencias (nombre) VALUES (?)`,
      ['Limpieza viaria']
    );
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Texto inicial', 41.65, -4.72, 'Avisante', 'activa', 'Centro', 'Calle Inicial 1']
    );

    const response = await postWithCsrf(`/admin/incidencias/${incidencia.lastID}`, {
        descripcion: 'Texto actualizado desde ficha',
        tipoId: String(tipoNuevo.lastID),
        estado: 'solucionada',
        nombre: 'Operador',
        fecha: '2026-06-12',
        barrio: 'Parquesol',
        direccion: 'Calle Editada 99'
      }, `/admin/incidencias/${incidencia.lastID}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain(`/admin/incidencias/${incidencia.lastID}?message=`);

    const updated = await dbAsync.get(
      `SELECT descripcion, tipo_id, estado, nombre, barrio, direccion, fecha, fecha_solucion
       FROM incidencias
       WHERE id = ?`,
      [incidencia.lastID]
    );

    expect(updated.descripcion).toBe('Texto actualizado desde ficha');
    expect(updated.tipo_id).toBe(tipoNuevo.lastID);
    expect(updated.estado).toBe('solucionada');
    expect(updated.nombre).toBe('Operador');
    expect(updated.barrio).toBe('Parquesol');
    expect(updated.direccion).toBe('Calle Editada 99');
    expect(updated.fecha.startsWith('2026-06-12')).toBe(true);
    expect(updated.fecha_solucion).toBeTruthy();
  });

  it('permite borrar fotos individuales desde la ficha', async () => {
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Incidencia con fotos', 41.65, -4.72, 'Vecina', 'activa', 'Centro', 'Calle Foto 1']
    );
    const image = await dbAsync.run(
      'INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)',
      [incidencia.lastID, 'foto-borrable.jpg']
    );

    const detail = await agent.get(`/admin/incidencias/${incidencia.lastID}`);
    expect(detail.status).toBe(200);
    expect(detail.text).toContain(`/admin/incidencias/${incidencia.lastID}/imagenes/${image.lastID}/delete`);

    const deleteResponse = await postWithCsrf(
      `/admin/incidencias/${incidencia.lastID}/imagenes/${image.lastID}/delete`,
      {},
      `/admin/incidencias/${incidencia.lastID}`
    );

    expect(deleteResponse.status).toBe(302);
    expect(deleteResponse.headers.location).toContain(`/admin/incidencias/${incidencia.lastID}?message=`);

    const remaining = await dbAsync.get(
      'SELECT COUNT(*) AS total FROM imagenes_incidencias WHERE id = ?',
      [image.lastID]
    );
    expect(remaining.total).toBe(0);
  });

  it('lista y permite borrar reportes individuales desde la ficha', async () => {
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Incidencia con reportes', 41.65, -4.72, 'Vecina', 'activa', 'Centro', 'Calle Reportes 1']
    );
    const solucion = await dbAsync.run(
      `INSERT INTO reportes_solucion (incidencia_id, ip, fecha, usuario) VALUES (?, ?, datetime('now', 'localtime'), ?)`,
      [incidencia.lastID, '127.0.0.1', 'Pepe']
    );
    const inadecuado = await dbAsync.run(
      `INSERT INTO reportes_inadecuado (incidencia_id, ip, fecha) VALUES (?, ?, datetime('now', 'localtime'))`,
      [incidencia.lastID, '127.0.0.2']
    );

    const detail = await agent.get(`/admin/incidencias/${incidencia.lastID}`);
    expect(detail.status).toBe(200);
    expect(detail.text).toContain('Reportes de solucion');
    expect(detail.text).toContain('Reportes inadecuados');
    expect(detail.text).toContain('Pepe');

    const deleteSolution = await postWithCsrf(
      `/admin/incidencias/${incidencia.lastID}/reportes-solucion/${solucion.lastID}/delete`,
      {},
      `/admin/incidencias/${incidencia.lastID}`
    );
    expect(deleteSolution.status).toBe(302);

    const solutionCount = await dbAsync.get('SELECT COUNT(*) AS total FROM reportes_solucion WHERE id = ?', [solucion.lastID]);
    expect(solutionCount.total).toBe(0);

    const deleteInadequate = await postWithCsrf(
      `/admin/incidencias/${incidencia.lastID}/reportes-inadecuados/${inadecuado.lastID}/delete`,
      {},
      `/admin/incidencias/${incidencia.lastID}`
    );
    expect(deleteInadequate.status).toBe(302);

    const inadequateCount = await dbAsync.get('SELECT COUNT(*) AS total FROM reportes_inadecuado WHERE id = ?', [inadecuado.lastID]);
    expect(inadequateCount.total).toBe(0);
  });

  it('permite borrar definitivamente una incidencia con confirmacion explicita', async () => {
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Incidencia a eliminar', 41.65, -4.72, 'Vecino', 'activa', 'Centro', 'Calle Final 9']
    );
    await dbAsync.run(
      `INSERT INTO reportes_solucion (incidencia_id, ip, fecha, usuario) VALUES (?, ?, datetime('now', 'localtime'), ?)`,
      [incidencia.lastID, '127.0.0.1', 'Borrar']
    );
    await dbAsync.run(
      `INSERT INTO reportes_inadecuado (incidencia_id, ip, fecha) VALUES (?, ?, datetime('now', 'localtime'))`,
      [incidencia.lastID, '127.0.0.2']
    );
    await dbAsync.run(
      'INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)',
      [incidencia.lastID, 'a-eliminar.jpg']
    );

    const rejected = await postWithCsrf(
      `/admin/incidencias/${incidencia.lastID}/delete`,
      { confirmationText: 'NO' },
      `/admin/incidencias/${incidencia.lastID}`
    );
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Escribe ELIMINAR para confirmar');

    const accepted = await postWithCsrf(
      `/admin/incidencias/${incidencia.lastID}/delete`,
      { confirmationText: 'ELIMINAR' },
      `/admin/incidencias/${incidencia.lastID}`
    );
    expect(accepted.status).toBe(302);
    expect(accepted.headers.location).toContain('/admin/incidencias?message=');

    const remainingIncidencia = await dbAsync.get('SELECT id FROM incidencias WHERE id = ?', [incidencia.lastID]);
    const remainingSolution = await dbAsync.get('SELECT COUNT(*) AS total FROM reportes_solucion WHERE incidencia_id = ?', [incidencia.lastID]);
    const remainingInadequate = await dbAsync.get('SELECT COUNT(*) AS total FROM reportes_inadecuado WHERE incidencia_id = ?', [incidencia.lastID]);
    const remainingImages = await dbAsync.get('SELECT COUNT(*) AS total FROM imagenes_incidencias WHERE incidencia_id = ?', [incidencia.lastID]);

    expect(remainingIncidencia).toBeUndefined();
    expect(remainingSolution.total).toBe(0);
    expect(remainingInadequate.total).toBe(0);
    expect(remainingImages.total).toBe(0);
  });

  it('muestra el listado propio y las rutas tecnicas del listado ya no existen', async () => {
    const tipo = await dbAsync.run('INSERT INTO tipos_incidencias (nombre) VALUES (?)', ['Enseres']);
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [tipo.lastID, 'Colchon junto al contenedor', 41.65, -4.72, 'Vecina', 'activa', 'Delicias', 'Calle Luna 4']
    );
    await dbAsync.run(
      'INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)',
      [incidencia.lastID, 'listado-propio.jpg']
    );

    const redirected = await agent.get('/admin/resources/incidencias');
    expect(redirected.status).toBe(404);

    const response = await agent.get('/admin/incidencias');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<h1>Incidencias</h1>');
    expect(response.text).toContain('Enseres');
    expect(response.text).toContain('Accion masiva');
    expect(response.text).toContain('Foto');
    expect(response.text).toContain('sortBy=fecha');
    expect(response.text).toContain('ops-mobile-check');
    expect(response.text).toContain('Ver ficha');
    expect(response.text).not.toContain('tipo_id');
    expect(response.text).not.toContain('Filter');
    expect(response.text).not.toContain('/actions/list');
  });

  it('permite acciones masivas sobre varias incidencias seleccionadas', async () => {
    const first = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Primera incidencia masiva', 41.65, -4.72, 'Vecina', 'activa', 'Centro', 'Calle A']
    );
    const second = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Segunda incidencia masiva', 41.65, -4.72, 'Vecino', 'activa', 'Centro', 'Calle B']
    );

    const response = await postWithCsrf('/admin/incidencias/bulk', {
        bulkAction: 'solucionada',
        selectedIds: [String(first.lastID), String(second.lastID)]
      }, '/admin/incidencias');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('/admin/incidencias?message=');

    const rows = await dbAsync.all('SELECT estado FROM incidencias WHERE id IN (?, ?) ORDER BY id ASC', [first.lastID, second.lastID]);
    expect(rows.map((row) => row.estado)).toEqual(['solucionada', 'solucionada']);
  });

  it('permite cambiar la categoria en lote desde el listado', async () => {
    const tipoNuevo = await dbAsync.run(
      'INSERT INTO tipos_incidencias (nombre) VALUES (?)',
      ['Parques y jardines']
    );
    const first = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Cambio tipo lote A', 41.65, -4.72, 'Vecina', 'activa', 'Centro', 'Calle Uno']
    );
    const second = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Cambio tipo lote B', 41.65, -4.72, 'Vecino', 'activa', 'Centro', 'Calle Dos']
    );

    const response = await postWithCsrf('/admin/incidencias/bulk', {
        bulkAction: 'changeTipo',
        bulkTipoId: String(tipoNuevo.lastID),
        selectedIds: [String(first.lastID), String(second.lastID)]
      }, '/admin/incidencias');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('/admin/incidencias?message=');

    const rows = await dbAsync.all(
      'SELECT tipo_id FROM incidencias WHERE id IN (?, ?) ORDER BY id ASC',
      [first.lastID, second.lastID]
    );
    expect(rows.map((row) => row.tipo_id)).toEqual([tipoNuevo.lastID, tipoNuevo.lastID]);
  });

  it('rechaza acciones masivas desconocidas sin modificar incidencias', async () => {
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (tipo_id, descripcion, latitud, longitud, nombre, fecha, estado)
       VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?)`,
      [1, 'No debe cambiar', 41.65, -4.72, 'Vecina', 'activa']
    );

    const response = await postWithCsrf('/admin/incidencias/bulk', {
      bulkAction: 'accion-inventada',
      selectedIds: String(incidencia.lastID)
    }, '/admin/incidencias');

    expect(response.status).toBe(400);
    const row = await dbAsync.get('SELECT estado FROM incidencias WHERE id = ?', [incidencia.lastID]);
    expect(row.estado).toBe('activa');
  });

  it('crea admins adicionales con hash y puede forzar reseteo', async () => {
    const created = await service.createAdminUser({
      username: 'gestor',
      password: 'OtraContrasenaSegura123',
      mustChangePassword: false,
      isActive: true
    }, 1);

    const raw = await service.getAdminByUsername('gestor', { includePasswordHash: true });
    expect(created.username).toBe('gestor');
    expect(raw.password_hash).not.toBe('OtraContrasenaSegura123');

    await dbAsync.run(
      'INSERT INTO admin_sessions (sid, expired, sess) VALUES (?, ?, ?)',
      ['gestor-session', Date.now() + 60_000, JSON.stringify({ adminUserId: created.id, cookie: {} })]
    );
    await dbAsync.run(
      'INSERT INTO admin_sessions (sid, expired, sess) VALUES (?, ?, ?)',
      ['other-admin-session', Date.now() + 60_000, JSON.stringify({ adminUserId: 1, cookie: {} })]
    );

    const updated = await service.forcePasswordReset(created.id, 1);
    const gestorSession = await dbAsync.get('SELECT sid FROM admin_sessions WHERE sid = ?', ['gestor-session']);
    const otherSession = await dbAsync.get('SELECT sid FROM admin_sessions WHERE sid = ?', ['other-admin-session']);
    expect(updated.mustChangePassword).toBe(true);
    expect(gestorSession).toBeUndefined();
    expect(otherSession.sid).toBe('other-admin-session');
  });

  it('invalida las sesiones anteriores al cambiar una contraseña', async () => {
    const created = await service.createAdminUser({
      username: 'gestor-sesiones',
      password: 'ContrasenaInicialSegura123',
      mustChangePassword: false,
      isActive: true
    }, 1);
    await dbAsync.run(
      'INSERT INTO admin_sessions (sid, expired, sess) VALUES (?, ?, ?)',
      ['password-session', Date.now() + 60_000, JSON.stringify({ adminUserId: created.id, cookie: {} })]
    );

    await service.changeAdminPassword(created.id, 'ContrasenaRenovadaSegura123', 1);

    const previousSession = await dbAsync.get('SELECT sid FROM admin_sessions WHERE sid = ?', ['password-session']);
    expect(previousSession).toBeUndefined();
  });

  it('impide desactivar el ultimo admin activo', async () => {
    const extraAdmins = await dbAsync.all('SELECT id FROM admin_users WHERE id != 1 AND is_active = 1');
    for (const adminRow of extraAdmins) {
      await service.setAdminActiveState(adminRow.id, false, 1);
    }

    await expect(service.setAdminActiveState(1, false, 1)).rejects.toThrow('ultimo administrador activo');
  });

  it('registra auditoria al cambiar estado y tipo de incidencias', async () => {
    const tipoDestino = await dbAsync.run(
      `INSERT INTO tipos_incidencias (nombre) VALUES (?)`,
      ['Nuevo tipo']
    );
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime', '-100 days'), ?)`,
      [1, 'Incidencia de prueba', 41.65, -4.72, 'Admin', 'activa']
    );

    await service.changeIncidenciaTipo(incidencia.lastID, tipoDestino.lastID, 1);
    await service.updateIncidenciaState(incidencia.lastID, 'solucionada', 1);
    await service.clearSolutionReports(incidencia.lastID, 1);

    const auditRows = await dbAsync.all(
      `SELECT action FROM admin_audit_log WHERE entity_type = 'incidencia' ORDER BY id ASC`
    );

    expect(auditRows.map((row) => row.action)).toEqual(
      expect.arrayContaining(['change_incidencia_tipo', 'set_incidencia_solucionada', 'clear_solution_reports'])
    );
  });

  it('no borra tipos con incidencias y permite fusionarlos', async () => {
    const tipoOrigen = await dbAsync.run('INSERT INTO tipos_incidencias (nombre) VALUES (?)', ['Tipo origen']);
    const tipoDestino = await dbAsync.run('INSERT INTO tipos_incidencias (nombre) VALUES (?)', ['Tipo destino']);

    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?)`,
      [tipoOrigen.lastID, 'Para fusion', 41.65, -4.72, 'Admin', 'activa']
    );

    await expect(service.deleteTipoIfUnused(tipoOrigen.lastID, 1)).rejects.toThrow('incidencias asociadas');

    const mergeResult = await service.mergeTipos(tipoOrigen.lastID, tipoDestino.lastID, 1);
    const updated = await dbAsync.get('SELECT tipo_id FROM incidencias WHERE id = ?', [incidencia.lastID]);

    expect(mergeResult.affectedIncidencias).toBe(1);
    expect(updated.tipo_id).toBe(tipoDestino.lastID);
  });

  it('previsualiza y ejecuta incidencias antiguas solucionables sin tocar otras', async () => {
    const candidate = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime', '-120 days'), ?)`,
      [1, 'Candidata', 41.65, -4.72, 'Admin', 'activa']
    );
    const fresh = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime', '-2 days'), ?)`,
      [1, 'Reciente', 41.65, -4.72, 'Admin', 'activa']
    );

    await dbAsync.run(
      `INSERT INTO reportes_solucion (incidencia_id, ip, fecha, usuario) VALUES (?, ?, datetime('now', 'localtime'), ?)`,
      [candidate.lastID, '127.0.0.1', 'Vecino']
    );

    const preview = await service.previewOldSolvable({ days: 90, votes: 1 });
    expect(preview.map((row) => row.id)).toContain(candidate.lastID);
    expect(preview.map((row) => row.id)).not.toContain(fresh.lastID);

    const executed = await service.executeOldSolvable({ days: 90, votes: 1 }, 1);
    const candidateRow = await dbAsync.get('SELECT estado FROM incidencias WHERE id = ?', [candidate.lastID]);
    const freshRow = await dbAsync.get('SELECT estado FROM incidencias WHERE id = ?', [fresh.lastID]);

    expect(executed).toHaveLength(1);
    expect(candidateRow.estado).toBe('solucionada');
    expect(freshRow.estado).toBe('activa');
  });

  it('muestra y resuelve moderacion de reportes inadecuados desde mantenimiento', async () => {
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)`,
      [1, 'Incidencia moderacion spam', 41.65, -4.72, 'Vecina', 'activa', 'Centro', 'Calle Moderacion 1']
    );
    await dbAsync.run(
      `INSERT INTO reportes_inadecuado (incidencia_id, ip, fecha) VALUES (?, ?, datetime('now', 'localtime'))`,
      [incidencia.lastID, '127.0.0.30']
    );

    const page = await agent.get('/admin/maintenance');
    expect(page.status).toBe(200);
    expect(page.text).toContain('Moderacion de reportes inadecuados');
    expect(page.text).toContain('Incidencia moderacion spam');

    const clearResponse = await postWithCsrf(
      '/admin/maintenance/clear-inadequate-reports',
      { incidenciaId: String(incidencia.lastID) },
      '/admin/maintenance'
    );
    expect(clearResponse.status).toBe(302);

    let reports = await dbAsync.get(
      'SELECT COUNT(*) AS total FROM reportes_inadecuado WHERE incidencia_id = ?',
      [incidencia.lastID]
    );
    expect(reports.total).toBe(0);

    await dbAsync.run(
      `INSERT INTO reportes_inadecuado (incidencia_id, ip, fecha) VALUES (?, ?, datetime('now', 'localtime'))`,
      [incidencia.lastID, '127.0.0.31']
    );

    const spamResponse = await postWithCsrf(
      '/admin/maintenance/mark-spam',
      { incidenciaId: String(incidencia.lastID) },
      '/admin/maintenance'
    );
    expect(spamResponse.status).toBe(302);

    const updated = await dbAsync.get(
      'SELECT estado, fecha_spam FROM incidencias WHERE id = ?',
      [incidencia.lastID]
    );
    expect(updated.estado).toBe('spam');
    expect(updated.fecha_spam).toBeTruthy();
  });

  it('previsualiza y procesa incidencias con ubicacion incompleta desde mantenimiento', async () => {
    const incidencia = await dbAsync.run(
      `INSERT INTO incidencias (
        tipo_id, descripcion, latitud, longitud, nombre, fecha, estado, barrio, direccion, direccion_json
      ) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?, ?)`,
      [1, 'Incidencia sin ubicacion completa', 41.65, -4.72, 'Vecino', 'activa', '', '', null]
    );

    const page = await agent.get('/admin/maintenance');
    expect(page.status).toBe(200);
    expect(page.text).toContain('Ubicacion pendiente');
    expect(page.text).toContain('Incidencia sin ubicacion completa');

    const updatedRows = await service.processMissingLocationIncidencias(
      100,
      1,
      async () => ({
        direccion: 'Calle Geocodificada 123, Valladolid',
        barrio: 'Parquesol',
        direccion_json: JSON.stringify({
          suburb: 'Parquesol',
          city: 'Valladolid'
        })
      })
    );
    expect(updatedRows.length).toBeGreaterThan(0);

    const updated = await dbAsync.get(
      'SELECT barrio, direccion, direccion_json FROM incidencias WHERE id = ?',
      [incidencia.lastID]
    );
    expect(updated.barrio).toBe('Parquesol');
    expect(updated.direccion).toBe('Calle Geocodificada 123, Valladolid');
    expect(updated.direccion_json).toContain('"suburb":"Parquesol"');
  });

  it('limita intentos repetidos de login fallido', async () => {
    await loadFreshApp();

    let loginPage = await agent.get('/admin/login');
    await agent.post('/admin/login').type('form').send({ username: 'admin', password: 'mala-1', _csrf: extractCsrfToken(loginPage.text) });
    loginPage = await agent.get('/admin/login');
    await agent.post('/admin/login').type('form').send({ username: 'admin', password: 'mala-2', _csrf: extractCsrfToken(loginPage.text) });
    loginPage = await agent.get('/admin/login');

    const blocked = await agent
      .post('/admin/login')
      .type('form')
      .send({ username: 'admin', password: 'mala-3', _csrf: extractCsrfToken(loginPage.text) });

    expect(blocked.status).toBe(429);
    expect(blocked.text).toContain('Demasiados intentos de acceso');
  });

  it('rechaza login sin csrf y ofrece un formulario nuevo', async () => {
    const response = await agent
      .post('/admin/login')
      .type('form')
      .send({ username: 'admin', password: 'incorrecta' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/admin/login?sessionExpired=1');

    const retryPage = await agent.get(response.headers.location);
    expect(retryPage.status).toBe(200);
    expect(retryPage.text).toContain('La sesión ha caducado');
    expect(extractCsrfToken(retryPage.text)).toHaveLength(64);
  });

  it('bloquea acciones autenticadas sin csrf y con token de otra sesion', async () => {
    await loadFreshApp();

    let loginPage = await agent.get('/admin/login');
    let loginResponse = await agent
      .post('/admin/login')
      .type('form')
      .send({ username: 'admin', password: tempPassword, _csrf: extractCsrfToken(loginPage.text) });
    expect(loginResponse.status).toBe(302);

    let changePasswordPage = await agent.get('/admin/change-password');
    let changePasswordResponse = await agent
      .post('/admin/change-password')
      .type('form')
      .send({
        password: 'NuevaContrasenaSegura123',
        passwordConfirm: 'NuevaContrasenaSegura123',
        _csrf: extractCsrfToken(changePasswordPage.text)
      });
    expect(changePasswordResponse.status).toBe(302);

    const noToken = await agent
      .post('/admin/administradores/create')
      .type('form')
      .send({ username: 'intruso', password: 'ClaveSegura123456', mustChangePassword: '0', isActive: '1' });

    expect(noToken.status).toBe(403);

    const secondAgent = request.agent(app);
    const otherLogin = await secondAgent.get('/admin/login');
    const otherCsrf = extractCsrfToken(otherLogin.text);
    const otherLoginResponse = await secondAgent
      .post('/admin/login')
      .type('form')
      .send({ username: 'admin', password: 'NuevaContrasenaSegura123', _csrf: otherCsrf });
    expect(otherLoginResponse.status).toBe(302);

    const crossSession = await agent
      .post('/admin/administradores/create')
      .type('form')
      .send({
        username: 'intruso-2',
        password: 'ClaveSegura123456',
        mustChangePassword: '0',
        isActive: '1',
        _csrf: extractCsrfToken((await secondAgent.get('/admin/administradores')).text)
      });

    expect(crossSession.status).toBe(403);
  });

  it('invalida sesiones persistidas cuando han expirado', async () => {
    const stored = await dbAsync.get('SELECT COUNT(*) AS total FROM admin_sessions');
    expect(stored.total).toBeGreaterThan(0);
    await dbAsync.run('UPDATE admin_sessions SET expired = 0');

    const response = await agent.get('/admin');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/admin/login');
  });

  it('expone la cookie admin endurecida', async () => {
    await loadFreshApp({ nodeEnv: 'production' });

    const loginPage = await agent.get('/admin/login').set('X-Forwarded-Proto', 'https');
    const cookie = getSessionCookie(loginPage);

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/admin');
    expect(cookie).toContain('Secure');
    expect(loginPage.headers['cache-control']).toBe('no-store');
    expect(loginPage.headers['x-frame-options']).toBe('DENY');
    expect(logger.warn.mock.calls.flat().join(' ')).not.toContain('BootstrapProduccionSegura123');

    await loadFreshApp();
  });

  it('rechaza origenes externos en POST de produccion', async () => {
    await loadFreshApp({ nodeEnv: 'production' });
    const loginPage = await agent.get('/admin/login').set('X-Forwarded-Proto', 'https');
    const response = await agent
      .post('/admin/login')
      .set('Origin', 'https://evil.example')
      .type('form')
      .send({
        username: 'admin',
        password: tempPassword,
        _csrf: extractCsrfToken(loginPage.text)
      });

    expect(response.status).toBe(403);
    expect(response.text).toContain('Origen de la solicitud no permitido');
    await loadFreshApp();
  });

  it('exige un SESSION_SECRET robusto en produccion', () => {
    const previousEnv = process.env.NODE_ENV;
    const previousSecret = process.env.SESSION_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    const { getSessionSecret } = require('../../src/server/admin/panel');
    expect(() => getSessionSecret(logger)).toThrow('SESSION_SECRET es obligatorio');
    process.env.NODE_ENV = previousEnv;
    process.env.SESSION_SECRET = previousSecret;
  });

  it('elimina admin-ops de la superficie publica', async () => {
    const response = await agent.get('/admin-ops');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<!DOCTYPE html>');
  });

  it('no sirve formatos activos o ejecutables desde uploads', async () => {
    fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.UPLOADS_DIR, 'contenido.svg'), '<svg onload="alert(1)"></svg>');
    fs.writeFileSync(path.join(process.env.UPLOADS_DIR, 'contenido.html'), '<script>alert(1)</script>');

    const [svg, html] = await Promise.all([
      agent.get('/uploads/contenido.svg'),
      agent.get('/uploads/contenido.html')
    ]);

    expect(svg.status).toBe(404);
    expect(html.status).toBe(404);
  });
});
