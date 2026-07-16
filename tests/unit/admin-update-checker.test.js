const ORIGINAL_ENV = process.env;

describe('Comprobacion de actualizaciones del panel', () => {
  let checker;

  function githubRelease(version, { title = `Version ${version}`, body = '', ...extra } = {}) {
    return {
      tag_name: `v${version}`,
      name: title,
      body,
      draft: false,
      prerelease: false,
      published_at: '2026-08-01T10:00:00Z',
      html_url: `https://github.com/PucelaBits/basuracero/releases/tag/v${version}`,
      ...extra
    };
  }

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    checker = require('../../src/server/admin/updateChecker');
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('compara versiones estables por major, minor y patch', () => {
    expect(checker.compareVersions('2.0.0', '1.99.99')).toBe(1);
    expect(checker.compareVersions('1.4.1', '1.4.0')).toBe(1);
    expect(checker.compareVersions('1.4.0', '1.4.0')).toBe(0);
    expect(checker.compareVersions('1.3.9', '1.4.0')).toBe(-1);
    expect(checker.compareVersions('latest', '1.0.0')).toBeNull();
  });

  it('no consulta GitHub si la instalacion no tiene una version valida', async () => {
    const fetchImpl = jest.fn();
    const result = await checker.getUpdateStatus({ localRelease: {}, fetchImpl });

    expect(result.updateAvailable).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('detecta una version nueva, incluye sus novedades y conserva el resultado en cache', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => githubRelease('1.1.0', {
        title: 'Mejoras de mantenimiento',
        body: '- Nuevo asistente\n- Correcciones de seguridad'
      })
    });
    const options = {
      localRelease: { version: '1.0.0', ref: 'v1.0.0' },
      fetchImpl,
      now: () => 1000
    };

    const first = await checker.getUpdateStatus(options);
    const second = await checker.getUpdateStatus({ ...options, now: () => 2000 });

    expect(first.updateAvailable).toBe(true);
    expect(first.latestVersion).toBe('1.1.0');
    expect(first.release.notes).toEqual(['Nuevo asistente', 'Correcciones de seguridad']);
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.github.com/repos/PucelaBits/basuracero/releases/latest',
      expect.objectContaining({ signal: expect.any(Object) })
    );
  });

  it('no avisa por cambios en Git mientras no se publique otra Release', async () => {
    const result = await checker.getUpdateStatus({
      localRelease: { version: '1.0.0', ref: 'v1.0.0' },
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => githubRelease('1.0.0', { body: '- Cien commits todavia no publicados' })
      })
    });

    expect(result.checked).toBe(true);
    expect(result.updateAvailable).toBe(false);
  });

  it('falla de forma silenciosa para el dashboard si GitHub no responde', async () => {
    const logger = { warn: jest.fn() };
    const result = await checker.getUpdateStatus({
      localRelease: { version: '1.0.0', ref: 'v1.0.0' },
      fetchImpl: jest.fn().mockRejectedValue(new Error('sin red')),
      logger
    });

    expect(result).toEqual({ checked: false, updateAvailable: false });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('sin red'));
  });

  it('en beta avisa cuando cambia el commit aunque la version estable no cambie', async () => {
    const currentSha = 'a'.repeat(40);
    const latestSha = 'b'.repeat(40);
    const result = await checker.getUpdateStatus({
      channel: 'beta',
      env: { APP_GIT_SHA: currentSha },
      localRelease: { version: '1.0.0', ref: 'v1.0.0' },
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sha: latestSha,
          commit: { message: 'Nuevo cambio experimental\n\nDetalle' }
        })
      })
    });

    expect(result.channel).toBe('beta');
    expect(result.updateAvailable).toBe(true);
    expect(result.release.version).toBe('bbbbbbb');
    expect(result.release.notes).toEqual(['Nuevo cambio experimental']);
  });

  it('permite vaciar la cache para comprobar de nuevo inmediatamente', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubRelease('2.0.1', { body: '- Primera comprobación' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => githubRelease('2.0.2', { body: '- Segunda comprobación' })
      });
    const options = {
      localRelease: { version: '2.0.0', ref: 'v2.0.0' },
      fetchImpl,
      now: () => 1000
    };

    const first = await checker.getUpdateStatus(options);
    checker.resetUpdateStatusCache();
    const second = await checker.getUpdateStatus(options);

    expect(first.latestVersion).toBe('2.0.1');
    expect(second.latestVersion).toBe('2.0.2');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('usa exclusivamente APP_VERSION como version instalada', () => {
    expect(checker.getInstalledRelease({ APP_VERSION: 'v3.4.5' })).toEqual({
      version: '3.4.5',
      ref: 'v3.4.5',
      url: 'https://github.com/PucelaBits/basuracero/releases/tag/v3.4.5'
    });
  });

  it('muestra la version y sus novedades como aviso operativo', () => {
    const { renderDashboardPage } = require('../../src/server/admin/html');
    const html = renderDashboardPage({
      currentAdmin: { username: 'admin' },
      csrfToken: 'test-token',
      dashboard: {
        stats: { total: 0, activas: 0, pendientesRevision: 0, solucionadas: 0, spam: 0 },
        recentWithPhoto: [],
        byTipo: []
      },
      updateStatus: {
        updateAvailable: true,
        currentVersion: '1.0.0',
        release: {
          version: '1.1.0',
          title: 'Mejoras de mantenimiento',
          notes: ['Nuevo asistente', 'Correcciones de seguridad'],
          url: 'https://github.com/PucelaBits/basuracero/releases/tag/v1.1.0'
        }
      }
    });

    expect(html).toContain('Tienes la versión 1.0.0. La versión 1.1.0 está disponible.');
    expect(html).not.toContain('Mejoras de mantenimiento');
    expect(html).toContain('Correcciones de seguridad');
    expect(html).toContain('./scripts/upgrade.sh');
    expect(html).toContain('class="dashboard-update-link"');
    expect(html).toContain('Ver novedades en GitHub');
  });
});
