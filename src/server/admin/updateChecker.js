const fs = require('fs');
const path = require('path');

const DEFAULT_REPOSITORY = 'PucelaBits/basuracero';
const DEFAULT_BRANCH = 'main';
const SUCCESS_CACHE_MS = 6 * 60 * 60 * 1000;
const ERROR_CACHE_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 2500;
const LOCAL_RELEASE_PATH = path.join(__dirname, '..', '..', '..', 'release.json');

let cache = null;

function parseStableVersion(value) {
  const match = String(value || '').trim().match(/^(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const leftParts = parseStableVersion(left);
  const rightParts = parseStableVersion(right);
  if (!leftParts || !rightParts) return null;
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}

function normalizeRelease(value) {
  if (!value || !parseStableVersion(value.version)) return null;
  const version = String(value.version);
  const ref = String(value.ref || '').trim();
  if (ref !== `v${version}`) return null;
  const title = String(value.title || '').trim().slice(0, 120);
  const notes = Array.isArray(value.notes)
    ? value.notes.map((note) => String(note || '').trim().slice(0, 240)).filter(Boolean).slice(0, 8)
    : [];
  const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(String(value.publishedAt || ''))
    ? String(value.publishedAt)
    : null;
  const url = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/.*)?$/.test(String(value.url || ''))
    ? String(value.url)
    : null;
  return { version, ref, title, notes, publishedAt, url };
}

function readLocalRelease(releasePath = LOCAL_RELEASE_PATH) {
  try {
    return normalizeRelease(JSON.parse(fs.readFileSync(releasePath, 'utf8')));
  } catch (_error) {
    return null;
  }
}

function getUpdateTarget(env) {
  const repository = String(env.APP_UPDATE_REPOSITORY || DEFAULT_REPOSITORY).trim();
  const branch = String(env.APP_UPDATE_BRANCH || DEFAULT_BRANCH).trim();
  const branchSegments = branch.split('/');
  const validBranch = branchSegments.every((segment) => segment && segment !== '.' && segment !== '..' && /^[A-Za-z0-9._-]+$/.test(segment));
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !validBranch) {
    return null;
  }
  return { repository, branch };
}

function isCommitSha(value) {
  return /^[a-f0-9]{40}$/i.test(String(value || '').trim());
}

async function getUpdateStatus({ env = process.env, fetchImpl = global.fetch, logger = console, now = Date.now, localRelease, channel } = {}) {
  if (env.NODE_ENV === 'test' && localRelease === undefined) {
    return { checked: false, updateAvailable: false };
  }
  const installedRelease = localRelease === undefined ? readLocalRelease() : normalizeRelease(localRelease);
  const selectedChannel = channel || env.APP_UPDATE_CHANNEL || 'stable';
  const currentSha = String(env.APP_GIT_SHA || '').trim().toLowerCase();
  const target = getUpdateTarget(env);
  if (!installedRelease || !target || !['stable', 'beta'].includes(selectedChannel) || typeof fetchImpl !== 'function') {
    return { checked: false, updateAvailable: false };
  }
  if (selectedChannel === 'beta' && !isCommitSha(currentSha)) {
    return { checked: false, updateAvailable: false };
  }

  const cacheKey = `${selectedChannel}:${installedRelease.version}:${currentSha}:${target.repository}:${target.branch}`;
  const currentTime = now();
  if (cache?.key === cacheKey && cache.expiresAt > currentTime) {
    return cache.result;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  timeout.unref?.();

  try {
    const [owner, repository] = target.repository.split('/');
    const encodedBranch = target.branch.split('/').map(encodeURIComponent).join('/');
    let response;
    if (selectedChannel === 'beta') {
      response = await fetchImpl(`https://api.github.com/repos/${target.repository}/commits/${encodeURIComponent(target.branch)}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'basuracero-update-checker',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
    } else {
      response = await fetchImpl(
        `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${encodedBranch}/release.json`,
        { signal: controller.signal, headers: { Accept: 'application/json' } }
      );
    }
    if (!response.ok) {
      throw new Error(`GitHub respondio con HTTP ${response.status}`);
    }

    let result;
    if (selectedChannel === 'beta') {
      const payload = await response.json();
      const latestSha = String(payload?.sha || '').trim().toLowerCase();
      if (!isCommitSha(latestSha)) throw new Error('GitHub no devolvio una revision valida');
      const commitTitle = String(payload?.commit?.message || '').split('\n')[0].trim().slice(0, 240);
      result = {
        checked: true,
        channel: 'beta',
        updateAvailable: latestSha !== currentSha,
        currentSha,
        latestSha,
        release: {
          version: latestSha.slice(0, 7),
          title: 'Cambios recientes del canal beta',
          notes: commitTitle ? [commitTitle] : [],
          url: `https://github.com/${target.repository}/compare/${currentSha}...${latestSha}`
        }
      };
    } else {
      const latestRelease = normalizeRelease(await response.json());
      if (!latestRelease) throw new Error('El manifiesto remoto de version no es valido');
      result = {
        checked: true,
        channel: 'stable',
        updateAvailable: compareVersions(latestRelease.version, installedRelease.version) > 0,
        currentVersion: installedRelease.version,
        latestVersion: latestRelease.version,
        release: latestRelease
      };
    }
    cache = { key: cacheKey, expiresAt: currentTime + SUCCESS_CACHE_MS, result };
    return result;
  } catch (error) {
    logger.warn?.(`No se ha podido comprobar si hay actualizaciones: ${error.message}`);
    const result = { checked: false, updateAvailable: false };
    cache = { key: cacheKey, expiresAt: currentTime + ERROR_CACHE_MS, result };
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function resetUpdateStatusCache() {
  cache = null;
}

module.exports = {
  compareVersions,
  getUpdateStatus,
  normalizeRelease,
  resetUpdateStatusCache
};
