import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'artifacts', 'performance-remediation');
const base = (process.env.PERF_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
];

const publicRoutes = [
  { path: '/', expectStatus: 200, screenshot: 'home' },
  { path: '/login', expectStatus: 200, screenshot: 'login' },
  { path: '/shop', expectStatus: 200, screenshot: 'shop' },
  { path: '/shop/missing-store', expectStatus: 404, screenshot: 'shop-missing', heading: 'No encontramos este negocio' },
];

const privateRedirects = ['/inicio', '/adoptions', '/community', '/hogares-de-transito'];
const prefetchWatch = ['/', '/shop'];
const blockedHosts = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const blockedText = ['material-symbols-rounded', 'Material Symbols'];
const privatePrefetchPaths = ['/inicio', '/map', '/provider'];

function isBlockedFont(url) {
  return blockedHosts.some((host) => url.includes(host));
}

function isSessionRequest(url) {
  return url.includes('/api/auth/session');
}

function pathnameOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function isPrivatePrefetch(url) {
  const pathname = pathnameOf(url);
  return privatePrefetchPaths.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isLoginChunk(url) {
  return /\/_next\/static\/chunks\/app\/login/.test(pathnameOf(url));
}

function isExpected404(route, url, status) {
  if (status !== 404) return false;
  const pathname = pathnameOf(url);
  return route.path === '/shop/missing-store' && (pathname === '/shop/missing-store' || pathname.startsWith('/shop/missing-store'));
}

function isExpectedRedirect(pathname) {
  return privateRedirects.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const report = [];

  try {
    for (const viewport of viewports) {
      for (const route of publicRoutes) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const consoleErrors = [];
        const unexpected401 = [];
        const unexpected404 = [];
        const sessionCalls = [];
        const fontCalls = [];
        const privatePrefetch = [];
        const loginChunks = [];

        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('pageerror', (error) => {
          consoleErrors.push(error.message);
        });
        page.on('response', (response) => {
          const url = response.url();
          const status = response.status();
          if (isSessionRequest(url)) sessionCalls.push(url);
          if (isBlockedFont(url)) fontCalls.push(url);
          if (status === 401) unexpected401.push({ url, status });
          if (status === 404 && !isExpected404(route, url, status)) unexpected404.push({ url, status });
        });
        page.on('request', (request) => {
          const url = request.url();
          if (prefetchWatch.includes(route.path) && isPrivatePrefetch(url)) privatePrefetch.push(url);
          if (prefetchWatch.includes(route.path) && isLoginChunk(url)) loginChunks.push(url);
        });

        const response = await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const status = response?.status() ?? 0;
        const heading = await page.locator('h1').first().textContent().catch(() => '');
        const overlay = await page.locator('nextjs-portal, [data-nextjs-dialog], #__next-build-error').count();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        const bodyText = await page.locator('body').innerText();
        const html = await page.content();
        const screenshotPath = path.join(outDir, `${route.screenshot}-${viewport.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const entry = {
          viewport: viewport.name,
          route: route.path,
          status,
          finalUrl: page.url(),
          heading: heading?.trim() || null,
          screenshot: screenshotPath,
          consoleErrors,
          sessionCalls,
          fontCalls,
          unexpected401,
          unexpected404,
          privatePrefetch,
          loginChunks,
          overlay,
          overflow,
        };
        report.push(entry);

        if (status !== route.expectStatus) {
          failures.push(`${viewport.name} ${route.path} expected ${route.expectStatus}, got ${status}`);
        }
        if (route.heading && !heading?.includes(route.heading) && !bodyText.includes(route.heading)) {
          failures.push(`${viewport.name} ${route.path} missing heading "${route.heading}"`);
        }
        if (consoleErrors.length) failures.push(`${viewport.name} ${route.path} console errors: ${consoleErrors.join(' | ')}`);
        if (sessionCalls.length) failures.push(`${viewport.name} ${route.path} requested /api/auth/session`);
        if (fontCalls.length) failures.push(`${viewport.name} ${route.path} requested Google Fonts`);
        if (blockedText.some((token) => html.includes(token))) {
          failures.push(`${viewport.name} ${route.path} still references Material Symbols`);
        }
        if (unexpected401.length) failures.push(`${viewport.name} ${route.path} unexpected 401`);
        if (unexpected404.length) failures.push(`${viewport.name} ${route.path} unexpected 404: ${unexpected404.map((item) => item.url).join(', ')}`);
        if (overlay > 0) failures.push(`${viewport.name} ${route.path} Next.js overlay visible`);
        if (overflow) failures.push(`${viewport.name} ${route.path} horizontal overflow`);
        if (privatePrefetch.length) failures.push(`${viewport.name} ${route.path} prefetched private route: ${privatePrefetch.join(', ')}`);
        if (loginChunks.length) failures.push(`${viewport.name} ${route.path} downloaded login chunks via prefetch`);

        await page.close();
      }

      for (const route of privateRedirects) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
        const status = response?.status() ?? 0;
        const finalUrl = page.url();
        const redirectedToLogin = finalUrl.includes('/login?callbackUrl=');
        report.push({
          viewport: viewport.name,
          route,
          status,
          finalUrl,
          redirectedToLogin,
        });
        if (!redirectedToLogin) {
          failures.push(`${viewport.name} ${route} did not redirect to login`);
        }
        if (!isExpectedRedirect(route)) {
          failures.push(`${viewport.name} ${route} is not a known private route`);
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(outDir, 'visual-qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ base, failures, report }, null, 2));
  console.log(JSON.stringify({ reportPath, failures }, null, 2));

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
