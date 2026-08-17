/**
 * Visual QA for the performance remediation.
 *
 * Required environment:
 *   PERF_BASE_URL   default http://127.0.0.1:3000
 *   QA_STORE_SLUG   public store with at least one bookable service
 *                   (optional only if /api/stores already returns one)
 *   QA_EMAIL        local/preview user
 *   QA_PASSWORD     local/preview password
 *
 * Credentials are never written to artifacts or logs.
 */
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

const blockedHosts = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const blockedText = ['material-symbols-rounded', 'Material Symbols'];
const privatePrefetchPaths = ['/inicio', '/map', '/provider'];

function pathnameOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function isSessionRequest(url) {
  return pathnameOf(url) === '/api/auth/session';
}

function isPetMineRequest(url) {
  return pathnameOf(url) === '/api/pet/mine';
}

function isViewerRequest(url) {
  return /\/api\/stores\/[^/]+\/viewer$/.test(pathnameOf(url));
}

function isBlockedFont(url) {
  return blockedHosts.some((host) => url.includes(host));
}

function isPrivatePrefetch(url) {
  const pathname = pathnameOf(url);
  return privatePrefetchPaths.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function screenshotName(route, viewport, authenticated) {
  const stem = route === '/'
    ? 'home'
    : route.replace(/^\//, '').replaceAll('/', '-').replaceAll('[', '').replaceAll(']', '');
  const suffix = authenticated ? 'auth' : 'anon';
  return `${stem}-${suffix}-${viewport}.png`;
}

function createCollector(routePath, expectStatus) {
  const consoleErrors = [];
  const pageErrors = [];
  const unexpected401 = [];
  const unexpected404 = [];
  const sessionCalls = [];
  const fontCalls = [];
  const privatePrefetch = [];
  const petMineCalls = [];
  const viewerCalls = [];

  function attach(page) {
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (expectStatus === 404 && /404 \(Not Found\)/.test(text)) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      if (isSessionRequest(url)) sessionCalls.push(pathnameOf(url));
      if (isBlockedFont(url)) fontCalls.push(url);
      if (isPetMineRequest(url)) petMineCalls.push({ url: pathnameOf(url), status });
      if (isViewerRequest(url)) viewerCalls.push({ url: pathnameOf(url), status });
      if (status === 401) unexpected401.push({ url: pathnameOf(url), status });
      if (status === 404) {
        const pathname = pathnameOf(url);
        const expectedMissing = expectStatus === 404 && pathname === '/shop/missing-store';
        if (!expectedMissing) unexpected404.push({ url: pathname, status });
      }
    });
    page.on('request', (request) => {
      const url = request.url();
      if (isPrivatePrefetch(url) && !routePath.startsWith('/inicio') && routePath !== '/map' && routePath !== '/provider') {
        if (['/', '/shop'].includes(routePath) || routePath.startsWith('/shop/')) {
          privatePrefetch.push(pathnameOf(url));
        }
      }
    });
  }

  return {
    attach,
    snapshot() {
      return {
        consoleErrors: [...consoleErrors],
        pageErrors: [...pageErrors],
        unexpected401: [...unexpected401],
        unexpected404: [...unexpected404],
        sessionCalls: [...sessionCalls],
        fontCalls: [...fontCalls],
        privatePrefetch: [...privatePrefetch],
        petMineCalls: [...petMineCalls],
        viewerCalls: [...viewerCalls],
      };
    },
  };
}

function emptyChecks() {
  return {
    status: false,
    finalUrl: false,
    console: false,
    pageerror: false,
    unexpected401: false,
    unexpected404: false,
    overlay: false,
    overflow: false,
    googleFonts: false,
    materialSymbols: false,
    lucide: false,
    accessibleControls: false,
    screenshot: false,
  };
}

async function commonPageSignals(page) {
  const overlay = await page.locator('nextjs-portal, [data-nextjs-dialog], #__next-build-error').count();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const html = await page.content();
  const lucideCount = await page.locator('svg.lucide').count();
  const interactive = await page.locator('a[href], button, [role="button"]').count();
  return { overlay, overflow, html, lucideCount, interactive };
}

function evaluateCommon({
  route,
  viewport,
  authenticated,
  expectedStatus,
  expectedUrlIncludes,
  status,
  finalUrl,
  collector,
  overlay,
  overflow,
  html,
  lucideCount,
  interactive,
  extra = {},
}) {
  const checks = {
    ...emptyChecks(),
    status: status === expectedStatus,
    finalUrl: expectedUrlIncludes.every((part) => finalUrl.includes(part)),
    console: collector.consoleErrors.length === 0,
    pageerror: collector.pageErrors.length === 0,
    unexpected401: collector.unexpected401.length === 0,
    unexpected404: collector.unexpected404.length === 0,
    overlay: overlay === 0,
    overflow: overflow === false,
    googleFonts: collector.fontCalls.length === 0,
    materialSymbols: !blockedText.some((token) => html.includes(token)),
    lucide: lucideCount > 0,
    accessibleControls: interactive > 0,
    screenshot: true,
    ...extra,
  };

  const failures = [];
  const labels = {
    status: `${viewport} ${route} expected status ${expectedStatus}, got ${status}`,
    finalUrl: `${viewport} ${route} unexpected URL ${finalUrl}`,
    console: `${viewport} ${route} console errors: ${collector.consoleErrors.join(' | ')}`,
    pageerror: `${viewport} ${route} pageerror: ${collector.pageErrors.join(' | ')}`,
    unexpected401: `${viewport} ${route} unexpected 401`,
    unexpected404: `${viewport} ${route} unexpected 404: ${collector.unexpected404.map((item) => item.url).join(', ')}`,
    overlay: `${viewport} ${route} Next.js overlay visible`,
    overflow: `${viewport} ${route} horizontal overflow`,
    googleFonts: `${viewport} ${route} requested Google Fonts`,
    materialSymbols: `${viewport} ${route} still references Material Symbols`,
    lucide: `${viewport} ${route} did not render Lucide icons`,
    accessibleControls: `${viewport} ${route} missing accessible controls`,
    screenshot: `${viewport} ${route} screenshot missing`,
    noSession: `${viewport} ${route} requested /api/auth/session`,
    noPrivatePrefetch: `${viewport} ${route} prefetched private route: ${collector.privatePrefetch.join(', ')}`,
    viewer200: `${viewport} ${route} viewer was not 200`,
    noViewer401: `${viewport} ${route} viewer returned 401`,
    publicContent: `${viewport} ${route} missing public store content`,
    islands: `${viewport} ${route} interactive islands did not mount`,
    callbackUrl: `${viewport} ${route} booking did not preserve callbackUrl`,
    noPetMine: `${viewport} ${route} requested /api/pet/mine before authenticated booking`,
  };

  for (const [key, ok] of Object.entries(checks)) {
    if (!ok) failures.push(labels[key] || `${viewport} ${route} check failed: ${key}`);
  }

  return { checks, failures };
}

async function resolveStoreSlug() {
  if (process.env.QA_STORE_SLUG?.trim()) {
    return process.env.QA_STORE_SLUG.trim();
  }

  const response = await fetch(`${base}/api/stores?sortBy=recommended`);
  if (!response.ok) {
    throw new Error(`No se pudo leer /api/stores (${response.status}). Definí QA_STORE_SLUG.`);
  }
  const payload = await response.json();
  const slug = payload?.stores?.find((store) => store.slug && store.services?.length)?.slug
    || payload?.stores?.find((store) => store.slug)?.slug
    || null;
  return slug;
}

async function requireFixtures(storeSlug) {
  const missing = [];
  if (!storeSlug) {
    missing.push('QA_STORE_SLUG: no hay un negocio público existente. Publicá uno en el entorno local/preview o definí QA_STORE_SLUG.');
  }
  if (!process.env.QA_EMAIL?.trim() || !process.env.QA_PASSWORD) {
    missing.push('QA_EMAIL y QA_PASSWORD: no hay sesión local/preview segura. No se usa ni modifica la base productiva.');
  }
  if (missing.length > 0) {
    const message = [
      'QA visual incompleto: faltan fixtures obligatorios. No se omite ninguna ruta.',
      ...missing.map((item) => `- ${item}`),
    ].join('\n');
    console.error(message);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'visual-qa-report.json'), JSON.stringify({
      base,
      passed: false,
      skipped: false,
      failures: [message],
      matrix: [],
    }, null, 2));
    process.exitCode = 1;
    return false;
  }
  return true;
}

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(process.env.QA_EMAIL.trim());
  await page.locator('#password').fill(process.env.QA_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
  if (!page.url().includes('/inicio')) {
    throw new Error('El login local/preview no llegó a /inicio. Revisá QA_EMAIL y QA_PASSWORD sin compartirlos.');
  }
}

async function captureRoute({
  context,
  viewport,
  route,
  authenticated,
  expectedStatus,
  expectedUrlIncludes,
  heading,
  screenshot,
  extraEvaluate,
}) {
  const page = await context.newPage();
  const collector = createCollector(route, expectedStatus);
  collector.attach(page);

  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const status = response?.status() ?? 0;
  const finalUrl = page.url();
  const headingText = (await page.locator('h1').first().textContent().catch(() => ''))?.trim() || '';
  const bodyText = await page.locator('body').innerText();
  const signals = await commonPageSignals(page);
  const extra = extraEvaluate ? await extraEvaluate(page, collector) : {};

  const screenshotPath = path.join(outDir, screenshot);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.close();

  const collected = collector.snapshot();
  const { checks, failures } = evaluateCommon({
    route,
    viewport: viewport.name,
    authenticated,
    expectedStatus,
    expectedUrlIncludes,
    status,
    finalUrl,
    collector: collected,
    overlay: signals.overlay,
    overflow: signals.overflow,
    html: signals.html,
    lucideCount: signals.lucideCount,
    interactive: signals.interactive,
    extra: {
      ...(heading ? { heading: headingText.includes(heading) || bodyText.includes(heading) } : {}),
      ...Object.fromEntries(
        Object.entries(extra).filter(([key]) => key !== 'failures' && key !== 'details')
      ),
    },
  });

  return {
    matrixRow: {
      route,
      viewport: viewport.name,
      authenticated,
      skipped: false,
      status,
      expectedStatus,
      finalUrl,
      heading: headingText || null,
      screenshot: screenshotPath,
      checks,
      details: extra.details || {},
      passed: failures.length === 0 && !(extra.failures || []).length,
    },
    failures: [...failures, ...(extra.failures || [])],
  };
}

async function evaluateStoreDetail(page, collector, { slug, authenticated }) {
  const extraFailures = [];
  const collected = collector.snapshot();
  const heading = (await page.locator('h1').first().textContent().catch(() => ''))?.trim() || '';
  const experience = await page.getByText('Tu experiencia').count();
  const bookButton = page.getByRole('button', { name: 'Reservar' });
  const bookCount = await bookButton.count();
  const viewerOk = collected.viewerCalls.some((call) => call.status === 200);
  const viewer401 = collected.viewerCalls.some((call) => call.status === 401);
  const petMineBefore = collected.petMineCalls.length > 0;

  let callbackUrlOk = !authenticated;
  if (!authenticated && bookCount > 0) {
    await bookButton.first().click();
    await page.waitForURL(/\/login\?callbackUrl=/, { timeout: 10_000 });
    const callback = new URL(page.url()).searchParams.get('callbackUrl') || '';
    callbackUrlOk = callback === `/shop/${slug}` || callback === encodeURIComponent(`/shop/${slug}`);
    if (!callbackUrlOk) {
      extraFailures.push(`booking callbackUrl was ${callback || '(empty)'}`);
    }
  } else if (!authenticated && bookCount === 0) {
    extraFailures.push(`QA_STORE_SLUG=${slug} no tiene servicios reservables; no se puede verificar callbackUrl`);
  }

  if (authenticated && bookCount > 0 && petMineBefore) {
    extraFailures.push('/api/pet/mine se solicitó al cargar el detalle autenticado');
  }

  const emptyServices = await page.getByText('Este negocio todavía no publicó servicios reservables').count();
  return {
    publicContent: Boolean(heading) && experience > 0,
    islands: experience > 0 && (bookCount > 0 || emptyServices > 0),
    viewer200: viewerOk,
    noViewer401: !viewer401,
    noSession: collected.sessionCalls.length === 0,
    noPrivatePrefetch: collected.privatePrefetch.length === 0,
    noPetMine: !petMineBefore,
    callbackUrl: callbackUrlOk,
    details: {
      viewerCalls: collected.viewerCalls,
      petMineCalls: collected.petMineCalls,
      bookable: bookCount > 0,
    },
    failures: extraFailures,
  };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  let storeSlug;
  try {
    storeSlug = await resolveStoreSlug();
  } catch (error) {
    console.error(error.message);
    fs.writeFileSync(path.join(outDir, 'visual-qa-report.json'), JSON.stringify({
      base,
      passed: false,
      skipped: false,
      failures: [error.message],
      matrix: [],
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!(await requireFixtures(storeSlug))) return;

  const publicRoutes = [
    { path: '/', expectedStatus: 200, urlIncludes: [`${base}/`], heading: null, screenshot: 'home' },
    { path: '/login', expectedStatus: 200, urlIncludes: ['/login'], heading: 'Inicia sesión', screenshot: 'login' },
    { path: '/register', expectedStatus: 200, urlIncludes: ['/register'], heading: null, screenshot: 'register' },
    { path: '/forgot-password', expectedStatus: 200, urlIncludes: ['/forgot-password'], heading: null, screenshot: 'forgot-password' },
    { path: '/shop', expectedStatus: 200, urlIncludes: ['/shop'], heading: 'Negocios confiables para tu mascota', screenshot: 'shop' },
    { path: '/shop/missing-store', expectedStatus: 404, urlIncludes: ['/shop/missing-store'], heading: 'No encontramos este negocio', screenshot: 'shop-missing' },
  ];

  const authenticatedRoutes = [
    '/inicio',
    '/adoptions',
    '/community',
    '/community/events',
    '/community/groups',
    '/hogares-de-transito',
    '/map',
    '/provider',
    '/messages',
    '/profile',
    '/settings',
    '/alerts',
    '/help',
    '/create-pet',
  ];

  const browser = await chromium.launch({ headless: true });
  const matrix = [];
  const failures = [];

  try {
    for (const viewport of viewports) {
      const anonymous = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });

      for (const route of publicRoutes) {
        const result = await captureRoute({
          context: anonymous,
          viewport,
          route: route.path,
          authenticated: false,
          expectedStatus: route.expectedStatus,
          expectedUrlIncludes: route.urlIncludes,
          heading: route.heading,
          screenshot: screenshotName(route.path, viewport.name, false),
          extraEvaluate: ['/', '/shop'].includes(route.path)
            ? async (_page, collector) => {
              const collected = collector.snapshot();
              return {
                noSession: collected.sessionCalls.length === 0,
                noPrivatePrefetch: collected.privatePrefetch.length === 0,
              };
            }
            : undefined,
        });
        matrix.push(result.matrixRow);
        failures.push(...result.failures);
      }

      const storePath = `/shop/${storeSlug}`;
      const storePage = await anonymous.newPage();
      const storeCollector = createCollector(storePath, 200);
      storeCollector.attach(storePage);
      const storeResponse = await storePage.goto(`${base}${storePath}`, { waitUntil: 'networkidle' });
      await storePage.waitForTimeout(500);
      const storeStatus = storeResponse?.status() ?? 0;
      const storeSignals = await commonPageSignals(storePage);
      const storeExtra = await evaluateStoreDetail(storePage, storeCollector, { slug: storeSlug, authenticated: false });
      const storeScreenshot = path.join(outDir, screenshotName(storePath, viewport.name, false));
      await storePage.screenshot({ path: storeScreenshot, fullPage: true });
      const storeFinalUrl = storePage.url();
      await storePage.close();

      const storeEval = evaluateCommon({
        route: storePath,
        viewport: viewport.name,
        authenticated: false,
        expectedStatus: 200,
        expectedUrlIncludes: [storePath],
        status: storeStatus,
        finalUrl: storeFinalUrl,
        collector: storeCollector.snapshot(),
        overlay: storeSignals.overlay,
        overflow: storeSignals.overflow,
        html: storeSignals.html,
        lucideCount: storeSignals.lucideCount,
        interactive: storeSignals.interactive,
        extra: {
          publicContent: storeExtra.publicContent,
          islands: storeExtra.islands,
          viewer200: storeExtra.viewer200,
          noViewer401: storeExtra.noViewer401,
          noSession: storeExtra.noSession,
          noPrivatePrefetch: storeExtra.noPrivatePrefetch,
          noPetMine: storeExtra.noPetMine,
          callbackUrl: storeExtra.callbackUrl,
        },
      });
      matrix.push({
        route: storePath,
        viewport: viewport.name,
        authenticated: false,
        skipped: false,
        status: storeStatus,
        expectedStatus: 200,
        finalUrl: storeFinalUrl,
        screenshot: storeScreenshot,
        checks: storeEval.checks,
        details: storeExtra.details,
        passed: storeEval.failures.length === 0 && storeExtra.failures.length === 0,
      });
      failures.push(...storeEval.failures, ...storeExtra.failures.map((item) => `${viewport.name} ${storePath} ${item}`));

      await anonymous.close();

      const authed = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const loginPage = await authed.newPage();
      try {
        await login(loginPage);
      } catch (error) {
        await loginPage.close();
        await authed.close();
        throw new Error(`${viewport.name} no pudo autenticarse: ${error.message}`);
      }
      await loginPage.close();

      for (const route of authenticatedRoutes) {
        const result = await captureRoute({
          context: authed,
          viewport,
          route,
          authenticated: true,
          expectedStatus: 200,
          expectedUrlIncludes: [route],
          heading: null,
          screenshot: screenshotName(route, viewport.name, true),
        });
        matrix.push(result.matrixRow);
        failures.push(...result.failures);
      }

      const authStorePage = await authed.newPage();
      const authStoreCollector = createCollector(storePath, 200);
      authStoreCollector.attach(authStorePage);
      const authStoreResponse = await authStorePage.goto(`${base}${storePath}`, { waitUntil: 'networkidle' });
      await authStorePage.waitForTimeout(400);
      const authStoreStatus = authStoreResponse?.status() ?? 0;
      const petMineOnLoad = authStoreCollector.snapshot().petMineCalls.length;
      const bookButton = authStorePage.getByRole('button', { name: 'Reservar' });
      if (await bookButton.count()) {
        await bookButton.first().click();
        await authStorePage.waitForTimeout(500);
      }
      const authStoreSignals = await commonPageSignals(authStorePage);
      const authScreenshot = path.join(outDir, screenshotName(storePath, viewport.name, true));
      await authStorePage.screenshot({ path: authScreenshot, fullPage: true });
      const authCollected = authStoreCollector.snapshot();
      const authExtra = {
        noPetMine: petMineOnLoad === 0,
        islands: await authStorePage.getByText('Tu experiencia').count() > 0,
        viewer200: authCollected.viewerCalls.some((call) => call.status === 200),
        noViewer401: !authCollected.viewerCalls.some((call) => call.status === 401),
      };
      const authEval = evaluateCommon({
        route: storePath,
        viewport: viewport.name,
        authenticated: true,
        expectedStatus: 200,
        expectedUrlIncludes: [storePath],
        status: authStoreStatus,
        finalUrl: authStorePage.url(),
        collector: authCollected,
        overlay: authStoreSignals.overlay,
        overflow: authStoreSignals.overflow,
        html: authStoreSignals.html,
        lucideCount: authStoreSignals.lucideCount,
        interactive: authStoreSignals.interactive,
        extra: authExtra,
      });
      matrix.push({
        route: storePath,
        viewport: viewport.name,
        authenticated: true,
        skipped: false,
        status: authStoreStatus,
        expectedStatus: 200,
        finalUrl: authStorePage.url(),
        screenshot: authScreenshot,
        checks: authEval.checks,
        details: { petMineOnLoad, petMineAfterBooking: authCollected.petMineCalls },
        passed: authEval.failures.length === 0,
      });
      failures.push(...authEval.failures);
      await authStorePage.close();
      await authed.close();
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    await browser.close();
  }

  const skipped = matrix.some((row) => row.skipped !== false);
  const incomplete = matrix.length === 0;
  const report = {
    base,
    storeSlugSet: Boolean(storeSlug),
    authenticated: true,
    skipped: false,
    passed: failures.length === 0 && !skipped && !incomplete && matrix.every((row) => row.passed && row.skipped === false),
    failures,
    matrix,
  };
  const reportPath = path.join(outDir, 'visual-qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    reportPath,
    rows: matrix.length,
    failed: failures.length,
    passed: report.passed,
  }, null, 2));

  if (!report.passed) {
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
