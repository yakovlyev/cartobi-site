const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('./brief-form.html', `file://${__dirname}/`), 'utf8');

function boot(storedConsent = null, storageThrows = false, search = '?track=kids') {
  const start = html.indexOf('// ---------- Аналітика:');
  const end = html.indexOf('// ---------- Мова:', start);
  assert.ok(start >= 0 && end > start, 'analytics block must exist');
  const requests = [];
  const context = {
    URLSearchParams,
    location: { search },
    JSON,
    Promise,
    fetch: (...args) => {
      requests.push(args);
      return Promise.resolve({ ok: true });
    },
    localStorage: {
      getItem: () => {
        if (storageThrows) throw new Error('storage unavailable');
        return storedConsent;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext("const params = new URLSearchParams(location.search); let track = params.get('track') || 'romance';", context);
  vm.runInContext(html.slice(start, end), context);
  return requests;
}

test('fresh direct brief open sends no analytics before consent', () => {
  assert.equal(boot().length, 0);
});

test('declined brief consent sends no analytics', () => {
  assert.equal(boot('declined').length, 0);
});

test('accepted brief consent sends one bounded form-open event', () => {
  const requests = boot('accepted');
  assert.equal(requests.length, 1);
  assert.match(requests[0][0], /\/rest\/v1\/cartobi_visits$/);
  assert.equal(JSON.parse(requests[0][1].body).page, 'brief_kids');
});

test('unavailable consent storage fails closed without analytics', () => {
  assert.equal(boot(null, true).length, 0);
});

test('unknown track value is normalized before entering telemetry', () => {
  const requests = boot('accepted', false, '?track=attacker-controlled');
  assert.equal(requests.length, 1);
  assert.equal(JSON.parse(requests[0][1].body).page, 'brief_romance');
});
