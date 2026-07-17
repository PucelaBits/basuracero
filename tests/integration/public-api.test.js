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
  let incidenciaId;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-public-api-'));
    uploadsDir = path.join(tempDir, 'uploads');
    process.env.NODE_ENV = 'test';
    process.env.SQLITE_DB_PATH = path.join(tempDir, 'incidencias.sqlite');
    process.env.UPLOADS_DIR = uploadsDir;
    process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters';
    process.env.EXTERNAL_REPORT_FINGERPRINT_SECRET = '';
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
    expect(fs.existsSync(path.join(tempDir, '.external-report-fingerprint-secret'))).toBe(true);
  });

  afterAll((done) => {
    delete process.env.SQLITE_DB_PATH;
    delete process.env.UPLOADS_DIR;
    delete process.env.SESSION_SECRET;
    delete process.env.EXTERNAL_REPORT_FINGERPRINT_SECRET;
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
    incidenciaId = response.body.id;
    const image = await dbAsync.get(
      'SELECT ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?',
      [response.body.id]
    );
    expect(image.ruta_imagen).toMatch(/^[0-9a-f-]+\.jpg$/);
    expect(fs.existsSync(path.join(uploadsDir, image.ruta_imagen))).toBe(true);
  });

  it('registra una sola apertura externa por incidencia y huella, y expone solo agregados', async () => {
    const first = await request(app)
      .post(`/api/incidencias/${incidenciaId}/external-report`)
      .set('User-Agent', 'Test Browser')
      .send({ channel: 'whatsapp' });
    const repeated = await request(app)
      .post(`/api/incidencias/${incidenciaId}/external-report`)
      .set('User-Agent', 'Test Browser')
      .send({ channel: 'whatsapp' });

    expect(first.status).toBe(201);
    expect(first.body).toEqual({ recorded: true, eventType: 'redirect_opened' });
    expect(repeated.status).toBe(200);
    expect(repeated.body).toEqual({ recorded: false, eventType: 'redirect_opened' });

    const stored = await dbAsync.get(
      'SELECT COUNT(*) AS total, reporter_fingerprint FROM external_report_events WHERE incidencia_id = ?',
      [incidenciaId]
    );
    expect(stored.total).toBe(1);
    expect(stored.reporter_fingerprint).toMatch(/^[a-f0-9]{64}$/);

    await dbAsync.run(
      `INSERT INTO external_report_imports
        (incidencia_id, channel, event_type, source, total)
       VALUES (?, 'whatsapp', 'redirect_opened', 'matomo', 7)`,
      [incidenciaId]
    );

    const ranking = await request(app).get('/api/incidencias/reportes-externos/ranking?channel=whatsapp');
    expect(ranking.status).toBe(200);
    expect(ranking.body.ranking).toEqual(expect.arrayContaining([
      expect.objectContaining({ incidenciaId, total: 8, channel: 'whatsapp', url: `/i/${incidenciaId}` })
    ]));
    expect(JSON.stringify(ranking.body)).not.toContain('reporter_fingerprint');

    const detail = await request(app).get(`/api/incidencias/${incidenciaId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.avisos_externos).toBe(8);
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
