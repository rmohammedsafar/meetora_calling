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
});
