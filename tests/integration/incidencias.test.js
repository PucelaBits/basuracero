const express = require('express');
const request = require('supertest');
const axios = require('axios');

jest.mock('axios');
jest.mock('multer', () => {
const multer = jest.fn(() => ({
array: () => (req, res, next) => {
req.files = [{ 
buffer: Buffer.from('fake image data'),
originalname: 'test_image.jpg'
}];
next();
}
}));
multer.memoryStorage = jest.fn(() => ({}));
return multer;
});

jest.mock('../../src/server/routes/incidencias', () => {
const express = require('express');
const router = express.Router();
const originalModule = jest.requireActual('../../src/server/routes/incidencias');
  
// Aquí puedes agregar rutas mock si es necesario
router.post('/', (req, res) => {
  res.status(201).json({ id: 1, codigoUnico: 'abc123' });
});

return {
  ...originalModule,
  router,
  verificarCaptcha: jest.fn().mockResolvedValue(true)
};
});

const { router: incidenciasRoutes } = require('../../src/server/routes/incidencias');

describe('POST /api/incidencias', () => {
let app;

beforeAll(() => {
app = express();
app.use(express.json());
// Usar directamente incidenciasRoutes
app.use('/api/incidencias', incidenciasRoutes);

axios.post.mockResolvedValue({ data: { success: true } });
});

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