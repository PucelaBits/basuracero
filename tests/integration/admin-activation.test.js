const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('Activacion del panel administrativo', () => {
  const activation = require('../../src/server/admin/activation');

  afterEach(() => {
    delete process.env.ADMIN_ENABLED;
  });

  it('activa por defecto una instalacion realmente nueva', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-new-install-'));
    const env = { SQLITE_DB_PATH: path.join(tempDir, 'incidencias.sqlite') };

    const result = activation.prepareAdminActivation(env);

    expect(result.databaseAlreadyExists).toBe(false);
    expect(result.adminEnabled).toBe(true);
    expect(fs.existsSync(activation.getAdminMarkerPath(env))).toBe(true);
  });

  it('mantiene desactivado el panel al detectar una base existente sin marcador', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-upgrade-'));
    const databasePath = path.join(tempDir, 'incidencias.sqlite');
    fs.writeFileSync(databasePath, 'base existente');
    const env = { SQLITE_DB_PATH: databasePath };

    const result = activation.prepareAdminActivation(env);

    expect(result.databaseAlreadyExists).toBe(true);
    expect(result.adminEnabled).toBe(false);
    expect(fs.existsSync(activation.getAdminMarkerPath(env))).toBe(false);
  });

  it('permite activar explicitamente una instalacion existente', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-enable-admin-'));
    const databasePath = path.join(tempDir, 'incidencias.sqlite');
    fs.writeFileSync(databasePath, 'base existente');
    const env = { SQLITE_DB_PATH: databasePath };

    activation.enableAdmin(env);

    expect(activation.isAdminEnabled(env)).toBe(true);
  });

  it('permite activar con Docker sin exigir Node en el servidor anfitrion', () => {
    const script = fs.readFileSync(path.join(__dirname, '../../scripts/enable_admin.sh'), 'utf8');

    expect(script).not.toMatch(/command_name in docker node/);
    expect(script).toContain('node_image="${ADMIN_ACTIVATION_NODE_IMAGE:-node:22-slim}"');
    expect(script).toContain('docker run --rm');
  });
});

describe('Aplicacion con panel desactivado', () => {
  let db;

  afterAll((done) => {
    delete process.env.ADMIN_ENABLED;
    delete process.env.SQLITE_DB_PATH;
    delete process.env.NODE_ENV;
    delete process.env.SESSION_SECRET;
    if (db) {
      db.close(() => done());
      return;
    }
    done();
  });

  it('no expone rutas admin ni exige SESSION_SECRET en una actualizacion', async () => {
    jest.resetModules();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-disabled-admin-'));
    const databasePath = path.join(tempDir, 'incidencias.sqlite');
    fs.writeFileSync(databasePath, '');
    process.env.SQLITE_DB_PATH = databasePath;
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    delete process.env.ADMIN_ENABLED;

    const { createApp } = require('../../src/server/app');
    db = require('../../src/server/config/database');
    const app = await createApp({ logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } });

    const [adminResponse, publicResponse] = await Promise.all([
      request(app).get('/admin/login'),
      request(app).get('/api/incidencias/tipos')
    ]);
    expect(adminResponse.status).toBe(404);
    expect(publicResponse.status).toBe(200);
  });
});
