const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

describe('API publica real', () => {
  let app;
  let db;
  let dbAsync;
  let tempDir;
  let uploadsDir;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-public-api-'));
    uploadsDir = path.join(tempDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.SQLITE_DB_PATH = path.join(tempDir, 'incidencias.sqlite');
    process.env.UPLOADS_DIR = uploadsDir;
    process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters';
    process.env.friendlycaptcha_enabled = 'false';
    process.env.CIUDAD_LAT_MIN = '41.54';
    process.env.CIUDAD_LAT_MAX = '41.72';
    process.env.CIUDAD_LON_MIN = '-4.89';
    process.env.CIUDAD_LON_MAX = '-4.64';

    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const { createApp } = require('../../src/server/app');
    db = require('../../src/server/config/database');
    dbAsync = require('../../src/server/utils/dbAsync');
    app = await createApp({ logger });
  });

  afterAll((done) => {
    delete process.env.SQLITE_DB_PATH;
    delete process.env.UPLOADS_DIR;
    delete process.env.SESSION_SECRET;
    delete process.env.friendlycaptcha_enabled;
    delete process.env.CIUDAD_LAT_MIN;
    delete process.env.CIUDAD_LAT_MAX;
    delete process.env.CIUDAD_LON_MIN;
    delete process.env.CIUDAD_LON_MAX;
    db.close(() => done());
  });

  it('mantiene disponibles el listado y los tipos publicos', async () => {
    const [list, tipos, config] = await Promise.all([
      request(app).get('/api/incidencias'),
      request(app).get('/api/incidencias/tipos'),
      request(app).get('/api/config')
    ]);

    expect(list.status).toBe(200);
    expect(list.body).toHaveProperty('incidencias');
    expect(tipos.status).toBe(200);
    expect(tipos.body.length).toBeGreaterThan(0);
    expect(tipos.body[0]).toHaveProperty('icono');
    expect(config.status).toBe(200);
    expect(config.body).toHaveProperty('APP_NAME');
    expect(config.headers['cache-control']).toContain('no-store');
  });

  it('crea una incidencia con imagen validada y la persiste', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    const response = await request(app)
      .post('/api/incidencias')
      .field('tipo_id', '1')
      .field('descripcion', 'Incidencia publica real')
      .field('latitud', '41.652')
      .field('longitud', '-4.728')
      .field('nombre', 'Vecina Test')
      .attach('imagenes', png, { filename: 'evidencia.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.id).toBeTruthy();
    const image = await dbAsync.get(
      'SELECT ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?',
      [response.body.id]
    );
    expect(image.ruta_imagen).toMatch(/^[0-9a-f-]+\.jpg$/);
    expect(fs.existsSync(path.join(uploadsDir, image.ruta_imagen))).toBe(true);
  });

  it('rechaza archivos que no son imagen antes de crear datos', async () => {
    const before = await dbAsync.get('SELECT COUNT(*) AS total FROM incidencias');
    const response = await request(app)
      .post('/api/incidencias')
      .field('tipo_id', '1')
      .field('descripcion', 'Archivo no valido')
      .field('latitud', '41.652')
      .field('longitud', '-4.728')
      .field('nombre', 'Vecina Test')
      .attach('imagenes', Buffer.from('no es una imagen'), { filename: 'ataque.txt', contentType: 'text/plain' });
    const after = await dbAsync.get('SELECT COUNT(*) AS total FROM incidencias');

    expect(response.status).toBe(400);
    expect(after.total).toBe(before.total);
  });
});
