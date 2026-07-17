const packageJson = require('../../package.json');
const packageLock = require('../../package-lock.json');

describe('politica de versionado', () => {
  it('mantiene package.json y package-lock.json fuera del versionado de releases', () => {
    expect(packageJson.version).toBe('2.3.3');
    expect(packageLock.version).toBe('2.3.3');
    expect(packageLock.packages[''].version).toBe('2.3.3');
  });
});
