const { getSpecificErrorMessage } = require('../../src/server/utils/errorMessages');

describe('mensajes de error de subida', () => {
  it('devuelve un mensaje accionable cuando falla el formulario multipart', () => {
    expect(getSpecificErrorMessage('file', 'upload')).toBe(
      'No se ha podido completar la subida de la imagen. Comprueba tu conexión y vuelve a intentarlo.'
    );
  });
});
