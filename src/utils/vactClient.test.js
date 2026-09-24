import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VactClient } from './vactClient.js';

function fixture() {
  const client = new VactClient('app_12345678', {
    webrtc: { RTCPeerConnection: class {}, MediaStream: class {}, mediaDevices: {} },
  });
  const applied = [];
  const pc = {
    setRemoteDescription: async () => {}, createAnswer: async () => ({}),
    setLocalDescription: async () => {},
    addIceCandidate: async candidate => applied.push(candidate),
  };
  client.peer = async () => ({ pc, media: {}, early: [] });
  client.request = async () => ({});
  client.activate = id => {
    const call = { pc, queued: [], remoteReady: false, shutdown() {} };
    client.calls.set(id, call);
    return call;
  };
  return { client, applied };
}

test('retains ICE before Answer and during accept HTTP request; applies once', async () => {
  const { client, applied } = fixture();
  await client.handle({ type: 'incoming_call', callId: 'one', offer: {} });
  await client.handle({ type: 'ice_candidate', callId: 'one', candidate: 'early' });
  client.request = async () => {
    await client.handle({ type: 'ice_candidate', callId: 'one', candidate: 'during' });
    return {};
  };
  await client.incoming.get('one').accept({ video: false });
  await client.handle({ type: 'ice_candidate', callId: 'one', candidate: 'after' });
  assert.deepEqual(applied, ['early', 'during', 'after']);
  assert.equal(client.earlyCandidates.size, 0);
});

test('discards buffered ICE on end, decline, failure and disconnect', async () => {
  for (const outcome of ['end', 'decline', 'failure', 'disconnect']) {
    const { client } = fixture();
    await client.handle({ type: 'incoming_call', callId: 'one', offer: {} });
    await client.handle({ type: 'ice_candidate', callId: 'one', candidate: 'early' });
    if (outcome === 'end') await client.handle({ type: 'call_ended', callId: 'one' });
    if (outcome === 'decline') await client.incoming.get('one').decline();
    if (outcome === 'disconnect') client.disconnect();
    if (outcome === 'failure') {
      client.request = async () => { throw new Error('accept failed'); };
      await assert.rejects(client.incoming.get('one').accept({}), /accept failed/);
    }
    assert.equal(client.earlyCandidates.size, 0, outcome);
  }
});
