import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'artifacts', 'performance-remediation');
const profileDir = path.join(outDir, 'chrome-profile-audit');
const base = (process.env.PERF_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const routes = ['/', '/login', '/shop'];
const runsPerRoute = 3;

const budgets = {
  performance: 0.9,
  fcp: 2200,
  lcp: 2800,
  cls: 0.1,
  tbt: 200,
  bytes: 450000,
};

function isCleanupError(error) {
  if (!error) return false;
  const code = error.code || error.errno;
  const message = String(error.message || error);
  return (
    code === 'EPERM'
    || code === 'EBUSY'
    || code === 'ENOENT'
    || /EPERM|EBUSY|ENOENT|Access is denied|resource busy|no such file/i.test(message)
  );
}

function pick(lhr) {
  const performance = lhr.categories?.performance?.score;
  const fcp = lhr.audits?.['first-contentful-paint']?.numericValue;
  const lcp = lhr.audits?.['largest-contentful-paint']?.numericValue;
  const cls = lhr.audits?.['cumulative-layout-shift']?.numericValue;
  const tbt = lhr.audits?.['total-blocking-time']?.numericValue;
  const bytes = lhr.audits?.['total-byte-weight']?.numericValue;

  if (
    typeof performance !== 'number'
    || typeof fcp !== 'number'
    || typeof lcp !== 'number'
    || typeof cls !== 'number'
    || typeof tbt !== 'number'
    || typeof bytes !== 'number'
  ) {
    throw new Error(`Incomplete Lighthouse metrics for ${lhr.requestedUrl || 'unknown URL'}`);
  }

  return {
    requestedUrl: lhr.requestedUrl,
    fetchTime: lhr.fetchTime,
    performance,
    fcp,
    lcp,
    cls,
    tbt,
    bytes,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function routeFileStem(route) {
  return route === '/' ? 'home' : route.replace(/^\//, '').replaceAll('/', '-');
}

function evaluatePass(medianMetrics) {
  return {
    performance: medianMetrics.performance >= budgets.performance,
    fcp: medianMetrics.fcp <= budgets.fcp,
    lcp: medianMetrics.lcp <= budgets.lcp,
    cls: medianMetrics.cls < budgets.cls,
    tbt: medianMetrics.tbt < budgets.tbt,
    bytes: medianMetrics.bytes <= budgets.bytes,
  };
}

async function killChrome(chrome) {
  if (!chrome) return;
  try {
    await chrome.kill();
  } catch (error) {
    if (isCleanupError(error)) {
      console.warn(`chrome.kill cleanup ignored: ${error.message || error}`);
      return;
    }
    throw error;
  }
}

async function runAudit(route, runIndex) {
  let chrome;
  try {
    chrome = await launch({
      chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check'],
      userDataDir: profileDir,
    });

    const result = await lighthouse(
      `${base}${route}`,
      {
        port: chrome.port,
        onlyCategories: ['performance'],
        output: 'json',
        logLevel: 'error',
      },
      {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'mobile',
          screenEmulation: {
            mobile: true,
            width: 390,
            height: 844,
            deviceScaleFactor: 2.625,
            disabled: false,
          },
          throttling: {
            rttMs: 150,
            throughputKbps: 1638.4,
            requestLatencyMs: 150,
            downloadThroughputKbps: 1638.4,
            uploadThroughputKbps: 675,
            cpuSlowdownMultiplier: 4,
          },
        },
      }
    );

    if (!result?.lhr) {
      throw new Error(`Lighthouse returned no LHR for ${route}`);
    }

    return pick(result.lhr);
  } finally {
    await killChrome(chrome);
  }
}

let auditsCompleted = false;

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const results = [];

  for (const route of routes) {
    const samples = [];
    for (let run = 1; run <= runsPerRoute; run += 1) {
      const metrics = await runAudit(route, run);
      samples.push(metrics);
      const fileName = `lh-${routeFileStem(route)}-${run}.json`;
      fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(metrics, null, 2));
      console.log(JSON.stringify({ route, run, ...metrics }));
    }

    const medianMetrics = {
      performance: median(samples.map((sample) => sample.performance)),
      fcp: median(samples.map((sample) => sample.fcp)),
      lcp: median(samples.map((sample) => sample.lcp)),
      cls: median(samples.map((sample) => sample.cls)),
      tbt: median(samples.map((sample) => sample.tbt)),
      bytes: median(samples.map((sample) => sample.bytes)),
    };

    results.push({
      route,
      median: medianMetrics,
      runs: samples,
      pass: evaluatePass(medianMetrics),
    });
  }

  const summary = { budgets, results };
  fs.writeFileSync(path.join(outDir, 'lighthouse-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  const failed = results.filter((entry) => Object.values(entry.pass).some((value) => !value));
  auditsCompleted = true;
  if (failed.length > 0) {
    console.error('Performance budgets failed for:', failed.map((entry) => entry.route).join(', '));
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

main().catch((error) => {
  if (auditsCompleted && isCleanupError(error) && process.exitCode === 0) {
    console.warn(`post-run cleanup ignored: ${error.message || error}`);
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
