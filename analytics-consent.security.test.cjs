const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('./index.html', `file://${__dirname}/`), 'utf8');

function extract(startCandidates, endMarker) {
  const starts = startCandidates.map((marker) => html.indexOf(marker)).filter((index) => index >= 0);
  const start = Math.min(...starts);
  const end = html.indexOf(endMarker, start);
  assert.ok(Number.isFinite(start) && start >= 0 && end > start, `cannot extract ${startCandidates.join(' or ')}`);
  return html.slice(start, end);
}

function boot(storedConsent = null, storageThrows = false, storageWriteThrows = false) {
  const requests = [];
  const scripts = [];
  const storage = new Map();
  const banner = { style: {}, textContent: '', innerHTML: '' };
  if (storedConsent !== null) storage.set('cartobi_cookie_consent', storedConsent);

  const context = {
    URL,
    URLSearchParams,
    Date,
    JSON,
    Promise,
    location: { search: '' },
    fetch: (...args) => {
      requests.push(args);
      return Promise.resolve({ ok: true });
    },
    localStorage: {
      getItem: (key) => {
        if (storageThrows) throw new Error('storage unavailable');
        return storage.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (storageWriteThrows) throw new Error('storage write unavailable');
        storage.set(key, value);
      },
    },
    document: {
      referrer: '',
      head: { appendChild: (node) => scripts.push(node.src) },
      createElement: () => ({ async: false, src: '' }),
      getElementsByTagName: () => [{ parentNode: { insertBefore: (node) => scripts.push(node.src) } }],
      getElementById: () => banner,
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);

  const visitBlock = extract(['function trackVisit()', '(function trackVisit()'], 'const LANGUAGES');
  const consentBlock = extract(['function loadTrackers()'], 'function setLang');
  vm.runInContext(visitBlock, context);
  vm.runInContext(consentBlock, context);

  return { context, requests, scripts, storage, banner };
}

test('fresh visitor sends no analytics before consent', () => {
  const app = boot();
  app.context.initCookieBanner();
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.scripts, []);
});

test('declined consent sends no analytics', () => {
  const app = boot('declined');
  app.context.initCookieBanner();
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.scripts, []);
});

test('stored accepted consent loads each analytics destination once', () => {
  const app = boot('accepted');
  app.context.initCookieBanner();
  assert.equal(app.requests.length, 1);
  assert.match(app.requests[0][0], /\/rest\/v1\/cartobi_visits$/);
  assert.deepEqual(app.scripts, [
    'https://www.googletagmanager.com/gtag/js?id=G-8M8BE7D8CG',
    'https://connect.facebook.net/en_US/fbevents.js',
  ]);
});

test('explicit accept loads analytics once and repeated accept does not duplicate it', () => {
  const app = boot();
  app.context.cookieChoice(true);
  app.context.cookieChoice(true);
  assert.equal(app.storage.get('cartobi_cookie_consent'), 'accepted');
  assert.equal(app.requests.length, 1);
  assert.equal(app.scripts.length, 2);
});

test('explicit decline persists choice without analytics', () => {
  const app = boot();
  app.context.cookieChoice(false);
  assert.equal(app.storage.get('cartobi_cookie_consent'), 'declined');
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.scripts, []);
});

test('unavailable consent storage fails closed without breaking banner init', () => {
  const app = boot(null, true);
  assert.doesNotThrow(() => app.context.initCookieBanner());
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.scripts, []);
});

test('direct tracker loader call cannot bypass missing consent', () => {
  const app = boot();
  app.context.loadTrackers();
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.scripts, []);
});

test('truthy non-accepted value cannot enable analytics', () => {
  const app = boot('true');
  app.context.initCookieBanner();
  app.context.loadTrackers();
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.scripts, []);
});

test('direct tracker loader fails closed when consent storage is unavailable', () => {
  const app = boot(null, true);
  assert.doesNotThrow(() => app.context.loadTrackers());
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.scripts, []);
});

test('blocked consent storage write does not break choice handler or enable analytics', () => {
  const app = boot(null, false, true);
  assert.doesNotThrow(() => app.context.cookieChoice(true));
  assert.equal(app.banner.style.display, 'none');
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.scripts, []);
});
