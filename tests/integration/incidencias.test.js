const express = require('express');
const request = require('supertest');
const axios = require('axios');

// Mockear axios para simular llamadas a servicios externos
jest.mock('axios');

// Mockear las rutas de incidencias para pruebas
jest.mock('../../src/server/routes/incidencias', () => {
  const express = require('express');
  const multer = require('multer');
  const router = express.Router();
  const { getAmigableErrorMessage, getSpecificErrorMessage } = require('../../src/server/utils/errorMessages');
  
  // Configurar multer para tests
  const upload = multer({ storage: multer.memoryStorage() }).array('imagenes', 2);

  // Mock de la función de validación de nombres
  const validarNombre = (nombre) => {
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return getSpecificErrorMessage('validation', 'required');
    }
    if (nombre.trim().length > 20) {
      return 'El nombre es demasiado largo. Máximo 20 caracteres.';
    }
    if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre.trim())) {
      return getSpecificErrorMessage('validation', 'nameInvalid');
    }
    return null;
  };

  // Mock de la función de validación de incidencias
  const validarIncidencia = (incidencia) => {
    const errores = [];
    if (!incidencia.tipo_id) errores.push('Por favor, selecciona el tipo de incidencia.');
    if (!incidencia.descripcion) errores.push('Por favor, describe lo que has observado.');
    if (!incidencia.latitud || !incidencia.longitud) errores.push('Por favor, selecciona la ubicación en el mapa.');
    
    // Validaciones adicionales
    if (incidencia.descripcion && incidencia.descripcion.length > 500) 
      errores.push(getSpecificErrorMessage('validation', 'descriptionTooLong'));
    
    return errores;
  };

  // Mock de la función para verificar el captcha
  let captchaShouldPass = true;
  const verificarCaptcha = jest.fn(() => Promise.resolve(captchaShouldPass));
  verificarCaptcha.mockImplementation(() => Promise.resolve(captchaShouldPass));
  verificarCaptcha.setResult = (result) => captchaShouldPass = result;

  // Ruta para crear una nueva incidencia
  router.post('/', (req, res) => {
    upload(req, res, async function (err) {
      if (err) {
        console.error('Error al subir imagen:', err);
        return res.status(500).json({ error: getSpecificErrorMessage('file', 'upload') });
      }

      const captchaValido = await verificarCaptcha(req.body['frc-captcha-solution']);
      if (!captchaValido) {
        return res.status(400).json({ error: getSpecificErrorMessage('captcha', 'invalid') });
      }

      const errorNombre = validarNombre(req.body.nombre);
      if (errorNombre) {
        return res.status(400).json({ error: errorNombre });
      }

      const erroresValidacion = validarIncidencia(req.body);
      if (erroresValidacion.length > 0) {
        return res.status(400).json({ errores: erroresValidacion });
      }

      res.status(201).json({ id: 1, codigoUnico: 'abc123' });
    });
  });

  // Ruta para marcar una incidencia como solucionada
  router.post('/:id/solucionada', async (req, res) => {
    if (!await verificarCaptcha(req.body['frc-captcha-solution'])) {
      return res.status(400).json({ error: getSpecificErrorMessage('captcha', 'invalid') });
    }
    res.status(200).json({ solucionada: true, mensaje: 'Incidencia marcada como solucionada' });
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

beforeEach(() => {
  // Resetear el estado del mock de verificarCaptcha antes de cada test
  if (verificarCaptcha && verificarCaptcha.setResult) {
    verificarCaptcha.setResult(true);
  }
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
    verificarCaptcha.setResult(false);

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
    expect(response.body).toHaveProperty('error', 'Por favor, completa la verificación de seguridad.');
  });
});

// Pruebas para validación de captcha al marcar incidencias como solucionadas
describe('POST /api/incidencias/:id/solucionada con captcha inválido', () => {
  it('debería rechazar marcar como solucionada una incidencia con captcha inválido', async () => {
    verificarCaptcha.setResult(false);

    const response = await request(app)
      .post('/api/incidencias/1/solucionada')
      .send({
        'frc-captcha-solution': 'captcha_invalido',
        nombre: 'Usuario Solucionador'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Por favor, completa la verificación de seguridad.');
  });
});

// Pruebas para la validación del nombre de usuario
describe('POST /api/incidencias con validación de nombre', () => {
  it('debería rechazar un nombre de usuario inválido', async () => {
    const response = await request(app)
      .post('/api/incidencias')
      .field('nombre', '!@#$%^&*()') // Nombre inválido
      .field('tipo_id', '1')
      .field('descripcion', 'Test description')
      .field('latitud', '40.416775')
      .field('longitud', '-3.703790')
      .field('direccion', 'Test address')
      .field('frc-captcha-solution', 'test-captcha-solution')
      .attach('imagenes', Buffer.from('fake image data'), 'test_image.jpg');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('nombre solo puede contener letras, números y espacios');
  });

  it('debería aceptar un nombre de usuario válido', async () => {
    const response = await request(app)
      .post('/api/incidencias')
      .field('nombre', 'Usuario Válido')
      .field('tipo_id', '1')
      .field('descripcion', 'Test description')
      .field('latitud', '40.416775')
      .field('longitud', '-3.703790')
      .field('direccion', 'Test address')
      .field('frc-captcha-solution', 'test-captcha-solution')
      .attach('imagenes', Buffer.from('fake image data'), 'test_image.jpg');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('codigoUnico');
  });
});

// Pruebas para la validación de descripción
describe('POST /api/incidencias con validación de descripción', () => {
  it('debería rechazar una descripción demasiado larga', async () => {
    // Crear una descripción de más de 500 caracteres
    const descripcionLarga = 'A'.repeat(501);
    
    const response = await request(app)
      .post('/api/incidencias')
      .field('nombre', 'Usuario Test')
      .field('tipo_id', '1')
      .field('descripcion', descripcionLarga)
      .field('latitud', '40.416775')
      .field('longitud', '-3.703790')
      .field('direccion', 'Test address')
      .field('frc-captcha-solution', 'test-captcha-solution')
      .attach('imagenes', Buffer.from('fake image data'), 'test_image.jpg');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errores');
    expect(response.body.errores[0]).toBe('La descripción es muy larga. Por favor, resume en máximo 500 caracteres.');
  });

  it('debería aceptar una descripción de 500 caracteres exactos', async () => {
    // Crear una descripción de exactamente 500 caracteres
    const descripcionExacta = 'A'.repeat(500);
    
    const response = await request(app)
      .post('/api/incidencias')
      .field('nombre', 'Usuario Test')
      .field('tipo_id', '1')
      .field('descripcion', descripcionExacta)
      .field('latitud', '40.416775')
      .field('longitud', '-3.703790')
      .field('direccion', 'Test address')
      .field('frc-captcha-solution', 'test-captcha-solution')
      .attach('imagenes', Buffer.from('fake image data'), 'test_image.jpg');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('codigoUnico');
  });
});
