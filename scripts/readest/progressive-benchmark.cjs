// Real-backend A/B check. Credentials are supplied only through the environment.
const { chromium } = require('../../app/node_modules/@playwright/test');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const targets = [process.env.READEST_BASELINE_URL, process.env.READEST_CANDIDATE_URL];
const password = process.env.READEST_PASSWORD;
const bookId = process.env.READEST_BOOK_ID || '10';
assert(targets.every(Boolean) && password, 'Set baseline/candidate URLs and READEST_PASSWORD');
assert(/^[1-9][0-9]*$/.test(bookId));

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const results = [];
  try {
    for (let trial = 1; trial <= Number(process.env.READEST_TRIALS || 3); trial++) {
      // Alternate order to reduce systematic warm-server bias.
      for (const index of trial % 2 ? [0, 1] : [1, 0]) {
        const base = targets[index];
        const context = await browser.newContext({ viewport: { width: 412, height: 915 },
          isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36' });
        try {
          const login = await context.request.post(base + '/api/user/sign_in', { form: { username: process.env.READEST_USERNAME || 'admin', password } });
          assert.equal((await login.json()).err, 'ok');
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: Number(process.env.READEST_LATENCY || 100), downloadThroughput: 1250000, uploadThroughput: 1250000 });
          const requests = new Map();
          const errors = [];
          page.on('pageerror', e => errors.push(e.message));
          let epoch;
          cdp.on('Network.requestWillBeSent', e => {
            epoch ??= e.timestamp;
            const url = new URL(e.request.url);
            if (url.origin !== base) return;
            requests.set(e.requestId, { path: url.pathname, type: e.type, initiator: e.initiator.type, startMs: (e.timestamp - epoch) * 1000 });
          });
          cdp.on('Network.responseReceived', e => {
            const r = requests.get(e.requestId);
            if (r) Object.assign(r, { status: e.response.status, cached: !!e.response.fromDiskCache });
          });
          cdp.on('Network.loadingFinished', e => {
            const r = requests.get(e.requestId);
            if (r) Object.assign(r, { endMs: (e.timestamp - epoch) * 1000, bytes: e.encodedDataLength });
          });
          cdp.on('Network.loadingFailed', e => {
            const r = requests.get(e.requestId);
            if (r) r.failed = e.errorText;
          });
          const started = Date.now();
          await page.goto(base + `/read/${bookId}?reader=readest`);
          await page.waitForFunction(() => /\d+\s*\/\s*\d+/.test(document.body.innerText), null, { timeout: 90000 });
          await page.waitForFunction(() => {
            const walk = root => [...root.querySelectorAll('*')].some(el => {
              if (el.shadowRoot && walk(el.shadowRoot)) return true;
              if (el.tagName !== 'IFRAME') return false;
              try {
                const doc = el.contentDocument;
                return el.getBoundingClientRect().width > 0 && !!doc?.body &&
                  (!!doc.body.innerText.trim() || [...doc.images].some(img => img.complete && img.naturalWidth > 0));
              } catch { return false; }
            });
            return walk(document);
          }, null, { timeout: 90000 });
          const readyMs = Date.now() - started;
          assert.equal(errors.length, 0);
          assert(page.frames().length > 1);
          const network = [...requests.values()];
          const bootstrap = network.find(r => r.path.endsWith('/reader-bootstrap'));
          const reader = network.find(r => r.type === 'Document' && r.path === '/readest/reader.html');
          const earlyAssets = network.filter(r => r.path.startsWith('/readest/_next/static/') && r.startMs < reader.startMs);
          const result = { variant: index ? 'progressive' : 'baseline', trial, readyMs,
            bootstrapEndMs: bootstrap.endMs, readerStartMs: reader.startMs,
            earlyAssetCount: earlyAssets.length,
            staticBytes: network.filter(r => r.path.startsWith('/readest/_next/static/')).reduce((sum, r) => sum + (r.bytes || 0), 0),
            earlyAssets, network, errors };
          results.push(result);
          console.log(JSON.stringify({ ...result, network: undefined, earlyAssets: undefined }));
        } finally { await context.close(); }
      }
    }
  } finally {
    await browser.close();
    if (process.env.READEST_RESULT_PATH) fs.writeFileSync(process.env.READEST_RESULT_PATH, JSON.stringify(results, null, 2));
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
