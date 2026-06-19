#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_URL = 'https://plank-assistant.pages.dev/';
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 15 * 1000;

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const [key, inlineValue] = arg.slice(2).split('=', 2);
    args[key] = inlineValue ?? argv[i + 1];
    if (inlineValue === undefined) i += 1;
  }
  return args;
}

function normalizeVersion(version) {
  const value = String(version || packageJson.version).trim();
  return value.startsWith('v') ? value : `v${value}`;
}

function resolveUrl(baseUrl, path) {
  return new URL(path, baseUrl).toString();
}

function parseVersion(html) {
  return html.match(/id=["']versionBadge["'][^>]*>\s*(v[0-9.]+)\s*</)?.[1] ?? null;
}

function parseAsset(html, pattern) {
  return html.match(pattern)?.[1] ?? null;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        ...(options.headers ?? {})
      }
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function contentTypeIncludes(contentType, expected) {
  return expected.some(item => contentType.toLowerCase().includes(item));
}

async function headContentType(url) {
  const response = await fetchWithTimeout(url, { method: 'HEAD' });
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type') ?? ''
  };
}

async function checkDeployment({ baseUrl, expectedVersion }) {
  const response = await fetchWithTimeout(`${baseUrl}?verify=${Date.now()}`);
  const html = await response.text();
  const server = response.headers.get('server') ?? '';
  const version = parseVersion(html);
  const manifestPath = parseAsset(
    html,
    /<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)["']/i
  );
  const scriptPath = parseAsset(
    html,
    /<script[^>]+src=["']([^"']*\/assets\/index-[^"']+\.js)["']/i
  );

  const manifest = manifestPath
    ? await headContentType(resolveUrl(baseUrl, manifestPath))
    : { ok: false, status: 0, contentType: '' };
  const serviceWorker = await headContentType(resolveUrl(baseUrl, '/sw.js'));
  const mainScript = scriptPath
    ? await headContentType(resolveUrl(baseUrl, scriptPath))
    : { ok: false, status: 0, contentType: '' };

  const failures = [];
  if (!response.ok) failures.push(`homepage returned HTTP ${response.status}`);
  if (version !== expectedVersion) {
    failures.push(`expected ${expectedVersion}, got ${version || 'missing'}`);
  }
  if (server.toLowerCase() !== 'cloudflare') {
    failures.push(`expected Cloudflare server header, got ${server || 'missing'}`);
  }
  if (!manifest.ok || !contentTypeIncludes(manifest.contentType, ['application/json', 'application/manifest+json'])) {
    failures.push(`manifest content-type is ${manifest.contentType || `HTTP ${manifest.status}`}`);
  }
  if (!serviceWorker.ok || !contentTypeIncludes(serviceWorker.contentType, ['javascript', 'application/x-javascript'])) {
    failures.push(`service worker content-type is ${serviceWorker.contentType || `HTTP ${serviceWorker.status}`}`);
  }
  if (!mainScript.ok || !contentTypeIncludes(mainScript.contentType, ['javascript', 'application/x-javascript'])) {
    failures.push(`main script content-type is ${mainScript.contentType || `HTTP ${mainScript.status}`}`);
  }

  return {
    ok: failures.length === 0,
    failures,
    server,
    version,
    manifestContentType: manifest.contentType,
    serviceWorkerContentType: serviceWorker.contentType,
    mainScriptContentType: mainScript.contentType,
    scriptPath: scriptPath ?? 'missing'
  };
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.url ?? process.env.CLOUDFLARE_PAGES_URL ?? DEFAULT_URL;
const expectedVersion = normalizeVersion(args.version ?? process.env.EXPECTED_VERSION);
const timeoutMs = Number(args['timeout-ms'] ?? process.env.VERIFY_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
const intervalMs = Number(args['interval-ms'] ?? process.env.VERIFY_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
const deadline = Date.now() + timeoutMs;

let attempt = 0;
let lastFailures = [];

while (Date.now() <= deadline) {
  attempt += 1;

  try {
    const result = await checkDeployment({ baseUrl, expectedVersion });
    const timestamp = new Date().toISOString();
    console.log(
      `${timestamp} attempt=${attempt} version=${result.version ?? 'missing'} ` +
        `script=${result.scriptPath} server=${result.server || 'missing'} ` +
        `manifest=${result.manifestContentType || 'missing'} ` +
        `sw=${result.serviceWorkerContentType || 'missing'} ` +
        `mainScript=${result.mainScriptContentType || 'missing'}`
    );

    if (result.ok) {
      console.log(`Cloudflare Pages deployment verified for ${expectedVersion}.`);
      process.exit(0);
    }

    lastFailures = result.failures;
  } catch (error) {
    lastFailures = [error instanceof Error ? error.message : String(error)];
    console.log(`${new Date().toISOString()} attempt=${attempt} error=${lastFailures[0]}`);
  }

  await sleep(intervalMs);
}

console.error(`Timed out waiting for Cloudflare Pages deployment: ${lastFailures.join('; ')}`);
process.exit(1);
