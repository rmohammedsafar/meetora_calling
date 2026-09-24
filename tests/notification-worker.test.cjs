const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('background push waits for notification display and cancellation', async () => {
  let handler;
  let finish;
  let closed = false;
  const display = new Promise(resolve => { finish = resolve; });
  const context = {
    importScripts() {}, console,
    firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage(fn) { handler = fn; } }) },
    self: { addEventListener() {}, registration: {
      showNotification: () => display,
      getNotifications: async () => [{ close() { closed = true; } }],
    } },
  };
  vm.runInNewContext(fs.readFileSync('public/firebase-messaging-sw.js', 'utf8'), context);
  const result = handler({ data: { type: 'incoming_call', callId: 'test-call' } });
  assert.equal(result, display);
  finish();
  await result;
  await handler({ data: { type: 'call_cancelled', callId: 'test-call' } });
  assert.equal(closed, true);
  assert.equal(handler({ notification: { title: 'FCM rendered' }, data: {
    type: 'incoming_call', callId: 'test-call',
  } }), undefined, 'must not display a second notification');
});

test('Answer and Decline decode FCM data and deliver acknowledged actions', async () => {
  for (const action of ['answer', 'decline']) {
    let click;
    let work;
    let received;
    let stopped = false;
    let saved;
    const client = {
      focus: async () => {
        assert.equal(saved.action, action, 'persist action before waking page');
        return client;
      },
      postMessage(message, ports) {
        received = message;
        ports[0].postMessage({ received: true });
      },
    };
    const context = {
      importScripts() {}, console, setTimeout, clearTimeout, Response,
      caches: { open: async () => ({ put: async (key, response) => {
        saved = await response.json();
      } }) },
      MessageChannel: require('node:worker_threads').MessageChannel,
      firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage() {} }) },
      clients: { matchAll: async () => [client] },
      self: { addEventListener(name, fn) { if (name === 'notificationclick') click = fn; } },
    };
    vm.runInNewContext(fs.readFileSync('public/firebase-messaging-sw.js', 'utf8'), context);
    click({ action, notification: {
      data: { FCM_MSG: { data: { type: 'incoming_call', callId: 'call-test' } } },
      close() {},
    }, stopImmediatePropagation() { stopped = true; }, waitUntil(promise) { work = promise; } });
    await work;
    assert.equal(stopped, true);
    assert.equal(received.callId, 'call-test');
    assert.equal(received.action, action);
  }
});
