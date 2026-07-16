const fs = require('fs');
const path = require('path');

describe('Configuración runtime del cliente', () => {
  const componentsDir = path.join(__dirname, '..', '..', 'src', 'client', 'components');

  it('no deja CAPTCHA ni centro del mapa fijados en el bundle', () => {
    const componentSources = fs.readdirSync(componentsDir)
      .filter((filename) => filename.endsWith('.vue'))
      .map((filename) => fs.readFileSync(path.join(componentsDir, filename), 'utf8'))
      .join('\n');

    expect(componentSources).not.toContain('import.meta.env.VITE_FRIENDLYCAPTCHA');
    expect(componentSources).not.toContain('import.meta.env.VITE_MAPA_CENTRO');
    expect(componentSources).not.toContain('v-html="instruccionesRegistro"');
    expect(componentSources).not.toContain('import.meta.env.VITE_APP_NAME');
    expect(componentSources).not.toContain('import.meta.env.VITE_APP_SOCIAL_LINKS');
    expect(componentSources).not.toContain('import.meta.env.VITE_DISTANCIA_MAXIMA_CERCANAS');
    expect(componentSources).not.toContain('import.meta.env.VITE_SEARCH_REGION');
    expect(componentSources).not.toContain('import.meta.env.VITE_TEXTO_BOTON_RESOLVER');
    expect(componentSources).not.toContain('import.meta.env.VITE_TEXTO_ESTADO_SOLUCIONADO');

    const dataManagement = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'client', 'composables', 'useGestionDatos.js'),
      'utf8'
    );
    expect(dataManagement).not.toContain('import.meta.env.VITE_APP_NAME');
  });
});
