const base = (process.env.PERF_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

module.exports = {
  ci: {
    collect: {
      url: [`${base}/`, `${base}/login`, `${base}/shop`],
      numberOfRuns: 3,
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
        onlyCategories: ['performance'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2200 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'total-byte-weight': ['error', { maxNumericValue: 450000 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './artifacts/performance-remediation/lhci',
    },
  },
};
