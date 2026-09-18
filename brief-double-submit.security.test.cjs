const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('./brief-form.html', `file://${__dirname}/`), 'utf8');

function extractSubmitHandlerSource() {
  const start = html.indexOf('let briefAlreadySubmitted = false;');
  assert.ok(start >= 0, 'submit handler (with guard) not found');
  const anchor = html.indexOf('\n\nvalidateForm();', start);
  assert.ok(anchor > start, 'end-of-handler anchor not found');
  const end = html.lastIndexOf('});', anchor) + 3;
  return html.slice(start, end);
}

function bootSubmitHandler({ track = 'romance', answers = {}, presetGenre = null, currentLang = 'ua' } = {}) {
  const sendDataCalls = [];
  let closeCalls = 0;
  const tg = {
    sendData: (json) => sendDataCalls.push(json),
    close: () => { closeCalls += 1; },
  };
  const clickCallbacks = [];
  const submitBtn = {
    addEventListener: (event, cb) => {
      if (event === 'click') clickCallbacks.push(cb);
    },
  };
  const context = {
    submitBtn, tg, track, answers, presetGenre, currentLang, JSON,
    validateForm: () => [],
    form: { querySelector: () => null },
    alert: () => {},
  };
  vm.createContext(context);
  vm.runInContext(extractSubmitHandlerSource(), context);
  return { clickCallbacks, sendDataCalls, getCloseCalls: () => closeCalls };
}

test('a single click sends exactly one sendData call', () => {
  const app = bootSubmitHandler();
  app.clickCallbacks[0]();
  assert.equal(app.sendDataCalls.length, 1);
});

test('CRITICAL - rapid double-click/tap before tg.close() takes effect must not send the brief twice', () => {
  const app = bootSubmitHandler();
  app.clickCallbacks[0]();
  app.clickCallbacks[0]();
  assert.equal(app.sendDataCalls.length, 1);
});

test('repeated invocation of the same handler for a non-Telegram browser preview does not throw', () => {
  const clickCallbacks = [];
  const submitBtn = {
    addEventListener: (event, cb) => clickCallbacks.push(cb),
  };
  const context = {
    submitBtn, tg: null, track: 'romance', answers: {},
    presetGenre: null, currentLang: 'ua', JSON,
    validateForm: () => [],
    form: { querySelector: () => null },
    alert: () => {},
  };
  vm.createContext(context);
  vm.runInContext(extractSubmitHandlerSource(), context);
  assert.doesNotThrow(() => {
    clickCallbacks[0]();
    clickCallbacks[0]();
  });
});
