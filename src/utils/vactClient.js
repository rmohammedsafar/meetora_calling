import { VactClient as SDKClient } from '@firstlogicmetalab/client';

// SDK 1.5 drops remote ICE while the incoming call is waiting for Answer:
// its active-call record is created only after the accept request completes.
export class VactClient extends SDKClient {
  earlyCandidates = new Map();
  acceptingCalls = new Set();

  async handle(event) {
    if (event.type === 'call_ended') this.earlyCandidates.delete(event.callId);
    if (event.type === 'ice_candidate' && !this.calls.has(event.callId) &&
        (this.incoming.has(event.callId) || this.acceptingCalls.has(event.callId))) {
      const candidates = this.earlyCandidates.get(event.callId) || [];
      // Bound memory while a call waits for user input.
      if (candidates.length < 256) candidates.push(event.candidate);
      this.earlyCandidates.set(event.callId, candidates);
      return;
    }
    return super.handle(event);
  }

  async accept(incoming, options) {
    const id = incoming.callId;
    this.acceptingCalls.add(id);
    try {
      const call = await super.accept(incoming, options);
      const candidates = this.earlyCandidates.get(id) || [];
      this.earlyCandidates.delete(id);
      for (const candidate of candidates) {
        try {
          await call.pc.addIceCandidate(candidate);
        } catch (error) {
          console.warn('VACT buffered ICE candidate could not be applied:', error.name);
        }
      }
      return call;
    } finally {
      this.acceptingCalls.delete(id);
      this.earlyCandidates.delete(id);
    }
  }

  decline(id) {
    this.earlyCandidates.delete(id);
    return super.decline(id);
  }

  disconnect() {
    this.earlyCandidates.clear();
    this.acceptingCalls.clear();
    return super.disconnect();
  }
}
