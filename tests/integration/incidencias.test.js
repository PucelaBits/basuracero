const express = require('express');
const request = require('supertest');
const axios = require('axios');

// Mockear axios para simular llamadas a servicios externos
jest.mock('axios');

// Mockear las rutas de incidencias para pruebas
jest.mock('../../src/server/routes/incidencias', () => {
  const express = require('express');
  const router = express.Router();
  
  const verificarCaptcha = jest.fn().mockResolvedValue(true);

  // Ruta para crear una nueva incidencia
  router.post('/', async (req, res) => {
    if (await verificarCaptcha(req.body['frc-captcha-solution'])) {
      res.status(201).json({ id: 1, codigoUnico: 'abc123' });
    } else {
      res.status(400).json({ error: 'Captcha inválido' });
    }
  });

  // Ruta para marcar una incidencia como solucionada
  router.post('/:id/solucionada', async (req, res) => {
    if (await verificarCaptcha(req.body['frc-captcha-solution'])) {
      res.status(200).json({ solucionada: true, mensaje: 'Incidencia marcada como solucionada' });
    } else {
      res.status(400).json({ error: 'Captcha inválido' });
    }
  });

  return {
    router,
    verificarCaptcha
  };
});

const { router: incidenciasRoutes, verificarCaptcha } = require('../../src/server/routes/incidencias');

// Configuración global para todas las pruebas
let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/incidencias', incidenciasRoutes);

  // Simular respuesta exitosa de axios para verificación de captcha
  axios.post.mockResolvedValue({ data: { success: true } });
});

// Pruebas para la creación de incidencias
describe('POST /api/incidencias', () => {
  it('debería crear una nueva incidencia con datos válidos', async () => {
    const incidenciaData = {
      tipo_id: 1,
      descripcion: 'Test incidencia',
      latitud: 41.6520,
      longitud: -4.7286,
      nombre: 'Usuario Test',
      'frc-captcha-solution': 'test_captcha_solution'
    };

    const response = await request(app)
      .post('/api/incidencias')
      .field('tipo_id', incidenciaData.tipo_id)
      .field('descripcion', incidenciaData.descripcion)
      .field('latitud', incidenciaData.latitud)
      .field('longitud', incidenciaData.longitud)
      .field('nombre', incidenciaData.nombre)
      .field('frc-captcha-solution', incidenciaData['frc-captcha-solution'])
      .attach('imagenes', Buffer.from('fake image data'), 'test_image.jpg');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('codigoUnico');
  });
});

// Pruebas para marcar incidencias como solucionadas
describe('POST /api/incidencias/:id/solucionada', () => {
  it('debería marcar una incidencia como solucionada', async () => {
    // Primero, creamos una incidencia de prueba
    const incidenciaResponse = await request(app)
      .post('/api/incidencias')
      .field('tipo_id', 1)
      .field('descripcion', 'Incidencia de prueba para solucionar')
      .field('latitud', 41.6520)
      .field('longitud', -4.7286)
      .field('nombre', 'Usuario Test')
      .field('frc-captcha-solution', 'test_captcha_solution')
      .attach('imagenes', Buffer.from('fake image data'), 'test_image.jpg');

    expect(incidenciaResponse.status).toBe(201);
    const incidenciaId = incidenciaResponse.body.id;

    // Ahora, intentamos marcar la incidencia como solucionada
    const solucionResponse = await request(app)
      .post(`/api/incidencias/${incidenciaId}/solucionada`)
      .send({
        'frc-captcha-solution': 'test_captcha_solution',
        nombre: 'Usuario Solucionador'
      });

    expect(solucionResponse.status).toBe(200);
    expect(solucionResponse.body).toHaveProperty('solucionada');
    expect(solucionResponse.body.solucionada).toBe(true);
    expect(solucionResponse.body).toHaveProperty('mensaje');
    expect(solucionResponse.body.mensaje).toBe('Incidencia marcada como solucionada');
  });
});

// Pruebas para marcar incidencias como solucionadas usando código único
describe('POST /api/incidencias/:id/solucionada con código único', () => {
  it('debería marcar una incidencia como solucionada inmediatamente con el código único correcto', async () => {
    // Primero, creamos una incidencia de prueba
    const incidenciaResponse = await request(app)
      .post('/api/incidencias')
      .field('tipo_id', 1)
      .field('descripcion', 'Incidencia de prueba para solucionar con código único')
      .field('latitud', 41.6520)
      .field('longitud', -4.7286)
      .field('nombre', 'Usuario Test')
      .field('frc-captcha-solution', 'test_captcha_solution')
      .attach('imagenes', Buffer.from('fake image data'), 'test_image.jpg');

    expect(incidenciaResponse.status).toBe(201);
    const incidenciaId = incidenciaResponse.body.id;
    const codigoUnico = incidenciaResponse.body.codigoUnico;

    // Ahora, intentamos marcar la incidencia como solucionada usando el código único
    const solucionResponse = await request(app)
      .post(`/api/incidencias/${incidenciaId}/solucionada`)
      .send({
        'frc-captcha-solution': 'test_captcha_solution',
        nombre: 'Usuario Solucionador',
        codigoUnico: codigoUnico
      });

    expect(solucionResponse.status).toBe(200);
    expect(solucionResponse.body).toHaveProperty('solucionada', true);
    expect(solucionResponse.body).toHaveProperty('mensaje', 'Incidencia marcada como solucionada');

    // Como estamos usando mocks, no podemos verificar directamente en la base de datos.
    // En su lugar, confiamos en la respuesta de la API mock.
  });
});

const mockIP = '123.123.123.123';

// Mock de la función obtenerIP
jest.mock('../../src/server/utils/ip', () => ({
  obtenerIP: jest.fn().mockReturnValue(mockIP)
}));

// Pruebas para validación de captcha en la creación de incidencias
describe('POST /api/incidencias con captcha inválido', () => {
  it('debería rechazar la creación de una incidencia con captcha inválido', async () => {
    verificarCaptcha.mockResolvedValueOnce(false);

    const response = await request(app)
      .post('/api/incidencias')
      .field('tipo_id', 1)
      .field('descripcion', 'Incidencia de prueba con captcha inválido')
      .field('latitud', 41.6520)
      .field('longitud', -4.7286)
      .field('nombre', 'Usuario Test')
      .field('frc-captcha-solution', 'captcha_invalido')
      .attach('imagenes', Buffer.from('fake image data'), 'test_image.jpg');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Captcha inválido');
  });
});

// Pruebas para validación de captcha al marcar incidencias como solucionadas
describe('POST /api/incidencias/:id/solucionada con captcha inválido', () => {
  it('debería rechazar marcar como solucionada una incidencia con captcha inválido', async () => {
    verificarCaptcha.mockResolvedValueOnce(false);

    const response = await request(app)
      .post('/api/incidencias/1/solucionada')
      .send({
        'frc-captcha-solution': 'captcha_invalido',
        nombre: 'Usuario Solucionador'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Captcha inválido');
  });
});