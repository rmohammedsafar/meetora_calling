[Get started](https://vact.online/docs.html#quickstart)[1 · Backend token](https://vact.online/docs.html#backend)[Storing the secret](https://vact.online/docs.html#secrets)[Choose your platform](https://vact.online/docs.html#platforms)[2 · Install & permissions](https://vact.online/docs.html#install)[3 · Connect](https://vact.online/docs.html#connect)[4 · Place a call](https://vact.online/docs.html#calling)[5 · Receive calls](https://vact.online/docs.html#incoming)[6 · Closed-app ringing](https://vact.online/docs.html#background)[Troubleshooting](https://vact.online/docs.html#troubleshooting)[How it works](https://vact.online/docs.html#plain)[Credentials](https://vact.online/docs.html#credentials)[API v1](https://vact.online/docs.html#api)[Webhook events](https://vact.online/docs.html#events)[Error reference](https://vact.online/docs.html#errors)[Client protocol](https://vact.online/docs.html#protocol)[Security](https://vact.online/docs.html#security)[Privacy](https://vact.online/docs.html#privacy)[Mobile production](https://vact.online/docs.html#mobile)[Product scope](https://vact.online/docs.html#scope)Packages
[Flutter · pub.dev ↗](https://pub.dev/packages/vact_sdk)[JavaScript · npm ↗](https://www.npmjs.com/package/@firstlogicmetalab/client)[Node server · npm ↗](https://www.npmjs.com/package/@firstlogicmetalab/server-sdk)[Python · PyPI ↗](https://pypi.org/project/vact-server/)[PHP · Packagist ↗](https://packagist.org/packages/firstlogicmetalab/vact-server)
[Dashboard ↗](https://vact.online/)
Developer documentation · v1Voice and video calls without shipping a secret.
VACT supplies one-to-one WebRTC signalling, managed TURN, incoming-call events, telemetry and authoritative usage billing through one small client API.
[Open dashboard](https://vact.online/)[Choose your platform](https://vact.online/docs.html#platforms)[Client protocol](https://vact.online/docs.html#protocol)
Never put the vact_live_... App Secret in a client.Flutter, Android, iOS, web and desktop binaries are inspectable. Keep the secret in your backend secret manager and send the app only a five-minute, one-time access token.
Your first call in 5 minutes
What you needAn app — [create one free in the dashboard](https://vact.online/) and copy its App ID and App Secret · a backend that can make one HTTPS request · a browser. That is it. No Firebase, no vendor account, nothing to install on the server side.
This is the shortest complete path: a Node backend that mints a token, and a web page that places a call. Copy the two blocks, fill in your two credentials, and you have a working call. Once it works, [pick your own stack below](https://vact.online/docs.html#platforms) — every step has the same code for Flutter, React, Python, PHP and more.
1. Mint a token from your backend. The App Secret lives only here, never in the app.
// server.js · npm install express const express = require('express'); const app = express(); app.post('/api/vact-token', async (req, res) => { const r = await fetch( 'https://vact.online/v1/apps/YOUR_APP_ID/tokens', { method: 'POST', headers: { Authorization: 'Bearer YOUR_APP_SECRET', // keep this on the server 'Content-Type': 'application/json', }, // In real code, use YOUR logged-in user's id here. body: JSON.stringify({ userId: req.query.user || 'alice' }), }, ); res.json(await r.json()); }); app.listen(3000, () => console.log('http://localhost:3000'));Copy
2. Place a call from a web page. No build step — open it in two browser tabs, one as alice, one as bob.
<!-- index.html --> <video id="remote" autoplay playsinline></video> <video id="local" autoplay playsinline muted></video> <button id="call">Call bob</button> <script type="module"> import {VactClient} from 'https://esm.sh/@firstlogicmetalab/client'; const me = new URLSearchParams(location.search).get('me') || 'alice'; const vact = new VactClient('YOUR_APP_ID'); // Ring on incoming calls. vact.onIncomingCall = async (c) => { const call = await c.accept(); remote.srcObject = call.remoteStream; }; // Ask your backend for a one-time token, then connect. const {accessToken} = await (await fetch('/api/vact-token?user=' + me)).json(); await vact.connect(accessToken); call.onclick = async () => { const c = await vact.call('bob', {video: true}); local.srcObject = c.localStream; remote.srcObject = c.remoteStream; }; </script>Copy
Open ?me=alice in one tab and ?me=bob in another, click Call bob, and the two tabs are on a video call. That is the whole system — everything below is the same three steps with your framework, plus production concerns like closed-app ringing and billing.
Jump to: [backend token](https://vact.online/docs.html#backend) · [your platform](https://vact.online/docs.html#platforms) · [placing calls](https://vact.online/docs.html#calling) · [receiving calls](https://vact.online/docs.html#incoming) · [billing](https://vact.online/docs.html#billing) · [troubleshooting](https://vact.online/docs.html#troubleshooting)
1. Mint a token on your backend
Your backend—not the app—decides the VACT user ID after checking its normal login, permissions and abuse limits. Pick your stack:
Firebase FunctionsNode · ExpressNode · Server SDKPythonPHPcURL
A callable function is the shortest path when your app already uses Firebase Authentication: the caller's identity arrives verified, so you never trust a client-supplied user ID.
const {onCall, HttpsError} = require('firebase-functions/v2/https'); const {defineSecret} = require('firebase-functions/params'); const APP_SECRET = defineSecret('VACT_APP_SECRET'); const APP_ID = 'vact_app_your_public_app_id'; exports.vactToken = onCall({secrets: [APP_SECRET]}, async (request) => { // Firebase verified this identity; the client cannot forge it. if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first'); const response = await fetch( `https://vact.online/v1/apps/${APP_ID}/tokens`, { method: 'POST', headers: { Authorization: `Bearer ${APP_SECRET.value()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: request.auth.uid, permissions: [ 'call:create', 'call:receive', 'call:accept', 'call:end', 'telemetry:write' ], sessionTtlSeconds: 3600 }) } ); if (!response.ok) throw new HttpsError('unavailable', 'calling_unavailable'); const token = await response.json(); return {accessToken: token.accessToken, expiresAt: token.tokenExpiresAt}; });Copy
Store the secret once, then deploy:
firebase functions:secrets:set VACT_APP_SECRET firebase deploy --only functions:vactTokenCopy
Calling it from Flutter:
final result = await FirebaseFunctions.instance .httpsCallable('vactToken') .call(); await vact.connect(accessToken: result.data['accessToken'] as String);Copy
The grant expires in five minutes and is single-use. Never accept an arbitrary userId from the client and pass it through.
Storing the App Secret
The examples above read the secret from the environment. Put it in a managed secret store — not in source control, a Dockerfile, a build arg or a .env file you commit. Pick your host:
FirebaseGoogle CloudAWSAzureVercel / NetlifyDocker / VM
Firebase Functions has a built-in secret store backed by Google Secret Manager. Declare the secret in code, set it once, then deploy.
# 1. Store it (prompts for the value; never appears in shell history) firebase functions:secrets:set VACT_APP_SECRET # 2. Deploy — the function declares {secrets: [APP_SECRET]} firebase deploy --only functions:vactToken # Rotate later: set a new version, then redeploy firebase functions:secrets:set VACT_APP_SECRET firebase deploy --only functions:vactTokenCopy
Access it with defineSecret('VACT_APP_SECRET').value(), as in the Firebase tab above. Never use functions.config() or a plain env var for this value.
Rotating without downtimeSeveral App Secrets can be active at once. Create a new key in the dashboard, deploy your backend with it, confirm traffic is healthy, then revoke the old key. Revoking with revokeSessions: true also bumps the auth epoch, which invalidates every live SDK session immediately — use that only if a secret has leaked.
Choose your client platform
Steps 2 to 6 below are tabbed. Pick your framework once and every step on this page follows you — the choice is remembered while you read.
Platform
What you install
Status
Flutter
[vact_sdk](https://pub.dev/packages/vact_sdk) on pub.dev
Packaged SDK — one line to connect
Web (any framework)
[Reference client](https://vact.online/docs.html#client) — no packages
Copy one file into your project
React
Reference client + the hooks below
Copy one file into your project
React Native
Reference client + react-native-webrtc
Copy one file, three lines of setup
Android (Kotlin)
org.webrtc only
Implement the [protocol](https://vact.online/docs.html#protocol) — code below
iOS (Swift)
WebRTC.framework only
Implement the [protocol](https://vact.online/docs.html#protocol) — code below
VACT needs no SDK and no third-party account.Every platform talks to the same plain HTTPS API: JSON over fetch (or your language's HTTP client) plus the WebRTC that is already built into browsers and mobile OSes. There is no Firebase, no signalling library and no vendor account to create — the [reference client](https://vact.online/docs.html#client) below is a complete working implementation in one dependency-free file, and the [protocol reference](https://vact.online/docs.html#protocol) documents every call so you can port it anywhere. Flutter additionally has a packaged SDK.
The JavaScript reference client
Web, React and React Native share one package with zero dependencies — a single small file, no transitive installs, TypeScript types included. It performs the exact sequence described in the [protocol reference](https://vact.online/docs.html#protocol), so behaviour, error codes and billing are identical on every platform.
npm install @firstlogicmetalab/clientCopy
[View @firstlogicmetalab/client on npm →](https://www.npmjs.com/package/@firstlogicmetalab/client)
import {VactClient, VactError} from '@firstlogicmetalab/client';Copy
Prefer not to add a dependency at all? The entire package is the single file below — paste it in as vact-client.js and it behaves identically.
// vact-client.js — a complete VACT client. No dependencies at all. // On the web it uses only fetch() and the WebRTC APIs already in your runtime. // On React Native, pass react-native-webrtc's primitives via the constructor // (see @firstlogicmetalab/react-native) — nothing else changes. const API_BASE = 'https://vact.online'; const HEARTBEAT_MS = 45000; // must stay well under the 180s server grace export class VactError extends Error { constructor(code, message, status) { super(message); this.code = code; this.status = status; } } // A non-cryptographic v4 UUID, used only for the create-call Idempotency-Key. // Web and modern Node have crypto.randomUUID; React Native does not, so this // is the fallback when no randomUUID is supplied. function fallbackUuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }); } export class VactClient { // `webrtc` lets a non-browser runtime (React Native) inject its own // RTCPeerConnection / mediaDevices / MediaStream. Omit it on the web. constructor(appId, { apiBase = API_BASE, webrtc, randomUUID } = {}) { if (!/^(vact_app_[a-f0-9]{24}|app_[a-f0-9]{8})$/.test(appId)) { throw new VactError('invalid_app_id', 'Invalid VACT App ID'); } this.appId = appId; this.apiBase = apiBase; this.calls = new Map(); // callId -> internal call record this.incoming = new Map(); // callId -> ringing VactIncomingCall this.incomingListeners = new Set(); this.cursor = 0; // position in the event feed // Resolve the WebRTC primitives once. Browser globals by default. const g = typeof globalThis !== 'undefined' ? globalThis : {}; this._RTCPeerConnection = webrtc?.RTCPeerConnection ?? g.RTCPeerConnection; this._mediaDevices = webrtc?.mediaDevices ?? g.navigator?.mediaDevices; this._MediaStream = webrtc?.MediaStream ?? g.MediaStream; this._randomUUID = randomUUID ?? (g.crypto?.randomUUID ? g.crypto.randomUUID.bind(g.crypto) : fallbackUuid); if (!this._RTCPeerConnection || !this._mediaDevices || !this._MediaStream) { throw new VactError('webrtc_unavailable', 'No WebRTC support found. On React Native, pass react-native-webrtc via the `webrtc` option.'); } } // ---- 1. Session --------------------------------------------------------- /** Exchanges the one-time vact_at_ ticket your backend minted. */ async connect(accessToken) { const session = await this.request('POST', '/v1/session/exchange', { appId: this.appId, accessToken, }); this.sessionToken = session.sessionToken; this.userId = session.userId; this.sessionExpiresAt = new Date(session.sessionExpiresAt); this.listen(); // start the event loop return this.userId; } /** Swaps in a fresh session. Active calls are unaffected. */ async renew(accessToken) { const session = await this.request('POST', '/v1/session/exchange', { appId: this.appId, accessToken, }); this.sessionToken = session.sessionToken; this.sessionExpiresAt = new Date(session.sessionExpiresAt); } disconnect() { this.stopped = true; for (const call of this.calls.values()) call.shutdown(); if (this.incoming.size) { this.incoming.clear(); this.emitIncoming(); } this.sessionToken = null; } // ---- 2. The event loop -------------------------------------------------- // One long-poll carries everything: ringing calls, the answer, remote ICE // candidates and status changes. It returns as soon as something happens, // so this is not polling in the wasteful sense. async listen() { while (!this.stopped && this.sessionToken) { try { const batch = await this.request( 'GET', `/v1/events?cursor=${this.cursor}&wait=25`); this.cursor = batch.cursor; for (const event of batch.events) await this.handle(event); } catch (e) { if (e.code === 'expired_session') { this.onSessionExpired?.(); return; } await new Promise((r) => setTimeout(r, 2000)); // back off, then retry } } } // Subscribe to the set of currently-ringing calls. The listener is called // immediately with the current list and again whenever it changes (a new // call rings, or one is answered, declined or cancelled). Returns an // unsubscribe function. Mirrors the Flutter SDK's incomingCalls(). onIncomingCalls(listener) { this.incomingListeners.add(listener); listener([...this.incoming.values()]); return () => this.incomingListeners.delete(listener); } emitIncoming() { const list = [...this.incoming.values()]; for (const listener of this.incomingListeners) listener(list); } async handle(event) { const call = this.calls.get(event.callId); switch (event.type) { case 'incoming_call': { // Removing from the ringing set is idempotent, so answering/declining // updates every onIncomingCalls listener exactly once. const clear = () => { if (this.incoming.delete(event.callId)) this.emitIncoming(); }; const incoming = { id: event.callId, fromUserId: event.fromUserId, callerName: event.callerName, video: event.callType === 'video', offer: event.offer, accept: (opts) => { clear(); return this.accept(event, opts); }, decline: () => { clear(); return this.decline(event.callId); }, }; this.incoming.set(event.callId, incoming); this.onIncomingCall?.(incoming); // backward-compatible singular hook this.emitIncoming(); break; } case 'call_answered': if (call) { await call.pc.setRemoteDescription(event.answer); call.remoteReady = true; while (call.queued.length) { await call.pc.addIceCandidate(call.queued.shift()).catch(() => {}); } } break; case 'ice_candidate': if (!call) break; if (call.remoteReady) await call.pc.addIceCandidate(event.candidate).catch(() => {}); else call.queued.push(event.candidate); break; case 'call_connected': call?.setState('connected'); break; case 'call_ended': call?.shutdown(); // The caller hung up before we answered: drop it from the ringing set. if (this.incoming.delete(event.callId)) this.emitIncoming(); break; } } // ---- 3. Placing and answering ------------------------------------------- async call(toUserId, { video = false, callerName } = {}) { const { pc, media, early } = await this.peer(video); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); const created = await this.request('POST', '/v1/calls', { toUserId, callType: video ? 'video' : 'audio', ...(callerName ? { callerName } : {}), offer: { type: offer.type, sdp: offer.sdp }, }, { 'Idempotency-Key': this._randomUUID() }); return this.activate(created.callId, toUserId, true, pc, media, early); } async accept(incoming, { video } = {}) { const wantsVideo = video ?? incoming.callType === 'video'; const { pc, media, early } = await this.peer(wantsVideo); await pc.setRemoteDescription(incoming.offer); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); await this.request('POST', `/v1/calls/${incoming.callId}/accept`, { answer: { type: answer.type, sdp: answer.sdp }, }); const call = this.activate(incoming.callId, incoming.fromUserId, false, pc, media, early); call.remoteReady = true; // the offer was already applied above return call; } decline(callId) { return this.request('POST', `/v1/calls/${callId}/decline`, {}); } // ---- 4. Internals ------------------------------------------------------- async peer(video) { const media = await this._mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false, }); // TURN credentials are session-scoped and expire in 15 minutes. const { iceServers } = await this.request('GET', '/v1/rtc/config'); const pc = new this._RTCPeerConnection({ iceServers, iceCandidatePoolSize: 2 }); media.getTracks().forEach((track) => pc.addTrack(track, media)); // Gathering begins at setLocalDescription — before we know the callId to // post candidates to. Buffer anything emitted in that window so fast // (loopback / host-only) candidates are not lost before activate() runs. const early = []; pc.onicecandidate = (e) => { if (e.candidate) early.push({ candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex, }); }; return { pc, media, early }; } activate(callId, otherUserId, isCaller, pc, media, early = []) { const remote = new this._MediaStream(); pc.ontrack = (e) => (e.streams[0] || new this._MediaStream([e.track])) .getTracks() .forEach((t) => { if (!remote.getTrackById(t.id)) remote.addTrack(t); }); const client = this; const record = { id: callId, otherUserId, isCaller, pc, localStream: media, remoteStream: remote, state: isCaller ? 'ringing' : 'connecting', remoteReady: false, queued: [], pending: [], beat: null, isScreenSharing: false, _cameraTrack: null, onState: null, onScreenShare: null, setState(s) { if (this.state !== s) { this.state = s; this.onState?.(s); } }, setMicrophoneEnabled: (on) => media.getAudioTracks().forEach((t) => { t.enabled = on; }), setCameraEnabled: (on) => media.getVideoTracks().forEach((t) => { t.enabled = on; }), // Replace the outgoing camera track with the screen, keeping the same // sender so no renegotiation is needed. Requires a call started with // video. Reverts automatically when the user stops sharing in the // browser's own UI. async startScreenShare(options) { if (record.isScreenSharing) return; const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video'); if (!sender) { throw new VactError('screen_share_unavailable', 'Start the call with video before sharing your screen.'); } if (!client._mediaDevices.getDisplayMedia) { throw new VactError('screen_share_unsupported', 'This runtime cannot capture the screen (getDisplayMedia is unavailable).'); } const display = await client._mediaDevices.getDisplayMedia({ video: options?.video ?? { frameRate: 15 }, audio: false, }); const screenTrack = display.getVideoTracks()[0]; record._cameraTrack = sender.track; await sender.replaceTrack(screenTrack); // Reflect the shared surface in the local preview stream. if (record._cameraTrack) media.removeTrack(record._cameraTrack); media.addTrack(screenTrack); record.isScreenSharing = true; record.onScreenShare?.(true); // The browser's built-in "Stop sharing" control ends the track. screenTrack.addEventListener?.('ended', () => { record.stopScreenShare().catch(() => {}); }); }, async stopScreenShare() { if (!record.isScreenSharing) return; const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video'); const screenTrack = sender?.track; if (sender && record._cameraTrack) await sender.replaceTrack(record._cameraTrack); if (screenTrack) { media.removeTrack(screenTrack); screenTrack.stop(); } if (record._cameraTrack) media.addTrack(record._cameraTrack); record._cameraTrack = null; record.isScreenSharing = false; record.onScreenShare?.(false); }, end: () => this.finish(callId, 'end'), cancel: () => this.finish(callId, 'cancel'), shutdown: () => { if (record.state === 'ended') return; record.setState('ended'); clearInterval(record.beat); media.getTracks().forEach((t) => t.stop()); if (record._cameraTrack) { record._cameraTrack.stop(); record._cameraTrack = null; } pc.close(); this.calls.delete(callId); }, }; this.calls.set(callId, record); // Batch candidates: one request per burst instead of one per candidate. const flush = () => { clearTimeout(record.flush); record.flush = setTimeout(() => { const batch = record.pending.splice(0, 32); if (batch.length) { this.request('POST', `/v1/calls/${callId}/candidates`, { candidates: batch }) .catch(() => {}); } }, 50); }; pc.onicecandidate = (e) => { if (!e.candidate) return; record.pending.push({ candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex, }); flush(); }; // Send anything gathered before the callId was known (see peer()). if (early.length) { record.pending.push(...early); flush(); } pc.onconnectionstatechange = () => { if (pc.connectionState === 'connected') { record.setState('connected'); // The heartbeat doubles as a liveness gate: if the server reports the // call is no longer active — a hang-up elsewhere, a backend terminate, // or the sweep — tear the media down. This is what makes a server-side // termination actually stop the call on this end. record.beat ||= setInterval(() => { this.request('POST', `/v1/calls/${callId}/heartbeat`, {}).catch((e) => { if (e instanceof VactError && (e.code === 'call_not_active' || e.code === 'call_not_found')) { record.shutdown(); } }); }, HEARTBEAT_MS); // Billing starts here — never when the user merely taps Accept. this.request('POST', `/v1/calls/${callId}/connected`, {}).catch(() => {}); } else if (pc.connectionState === 'failed') { record.setState('failed'); } }; return record; } async finish(callId, action) { const record = this.calls.get(callId); try { await this.request('POST', `/v1/calls/${callId}/${action}`, action === 'end' ? { endReason: 'completed' } : {}); } finally { record?.shutdown(); } } async request(method, path, body, extraHeaders) { const headers = { Accept: 'application/json', ...extraHeaders }; if (body) headers['Content-Type'] = 'application/json'; if (this.sessionToken) headers.Authorization = `Bearer ${this.sessionToken}`; const res = await fetch(this.apiBase + path, { method, headers, body: body ? JSON.stringify(body) : undefined, }); const payload = await res.json().catch(() => ({})); if (!res.ok) { const err = payload.error || {}; throw new VactError(err.code || 'request_failed', err.message || 'VACT request failed', res.status); } return payload; } }Copy
What this file deliberately leaves outICE restart after a network change. The Flutter SDK renegotiates through the restart_offer / restart_answer events described in the [protocol reference](https://vact.online/docs.html#protocol); the reference client reports failed instead. Add it once calls work.
Screen sharing
On a video call, swap your camera for your screen. It reuses the same video sender via replaceTrack, so there is no renegotiation — the other side simply starts seeing your screen. It reverts automatically when the user stops sharing from the browser's own control.
// call must have been started with { video: true } await call.startScreenShare(); // camera → screen call.onScreenShare = (sharing) => updateButton(sharing); // later… await call.stopScreenShare(); // screen → cameraCopy
Platform supportScreen capture uses getDisplayMedia, which exists on the web and in Electron but not in React Native (where screen sharing needs a native module — startScreenShare throws screen_share_unsupported there). On an audio-only call it throws screen_share_unavailable: start with video first.
2. Install and set up permissions
Calls need the camera and microphone, so each platform needs a little one-time setup. Do this before writing any call code.
FlutterWeb / ReactReact NativeAndroid · KotliniOS · Swift
a. Add the package
One package, zero dependencies. WebRTC is already in every browser.
npm install @firstlogicmetalab/clientCopy
Or paste [the single-file client](https://vact.online/docs.html#client) in instead — same code, no dependency at all.
b. Serve over HTTPS
Browsers expose getUserMedia only on a secure origin. localhost counts as secure, so local development works — but a staging site on plain http:// will fail with NotAllowedError before VACT is ever reached.
c. Permissions
There is nothing to declare. The browser prompts the user the first time you call getUserMedia. Trigger that prompt on a real click — Chrome and Safari block it otherwise:
// Call this from a button handler, on a screen BEFORE the call screen. // The stream is discarded; it exists only to raise the prompt early. const probe = await navigator.mediaDevices.getUserMedia({audio: true, video: true}); probe.getTracks().forEach((t) => t.stop());Copy
d. If your app is cross-origin
Embedding your call UI in an <iframe> needs an explicit grant, or the camera is silently denied:
<iframe src="https://your-app.example" allow="camera; microphone"></iframe>Copy
Ask for permissions before the first callIf you request them while a call is already starting, the popup interrupts media setup and the first call often fails to connect. Ask on the screen before anyone taps “call”. This is true on every platform above.
3. Connect
Create one client for the signed-in user and connect it with a token from [step 1](https://vact.online/docs.html#backend). Keep it alive for as long as the user is signed in — one per app, not one per call. Mint the token immediately before connecting: it dies after five minutes and works once.
FlutterWeb / ReactReact NativeAndroid · KotliniOS · Swift
Using [the reference client](https://vact.online/docs.html#client). Plain JavaScript first; the React wiring is directly below it.
import {VactClient, VactError} from './vact-client.js'; const vact = new VactClient('vact_app_your_public_app_id'); // Ask YOUR backend for a fresh token (see step 1), then connect. const {accessToken} = await (await fetch('/api/vact-token', { method: 'POST', credentials: 'include', // your own login cookie decides who the user is })).json(); try { await vact.connect(accessToken); console.log('connected as', vact.userId); // e.g. "user_42" } catch (e) { if (e instanceof VactError) console.error(e.code, e.message); }Copy
In React, connect once in a provider so the whole tree shares one client and one incoming-call listener:
// useVact.js — one client for the whole app, shared through context. import { createContext, useContext, useEffect, useRef, useState } from 'react'; import { VactClient } from './vact-client'; const VactContext = createContext(null); export function VactProvider({ appId, getAccessToken, children }) { const clientRef = useRef(null); const [ready, setReady] = useState(false); const [incoming, setIncoming] = useState(null); useEffect(() => { let stopIncoming = () => {}; let cancelled = false; const client = new VactClient(appId); clientRef.current = client; (async () => { // Mint the token immediately before connecting: it dies in 5 minutes. await client.connect(await getAccessToken()); if (cancelled) return; setReady(true); stopIncoming = client.onIncomingCalls((calls) => setIncoming(calls[0] || null)); })(); return () => { cancelled = true; stopIncoming(); client.disconnect(); }; }, [appId, getAccessToken]); return ( <VactContext.Provider value={{ vact: clientRef.current, ready, incoming }}> {children} </VactContext.Provider> ); } export const useVact = () => useContext(VactContext); // useCall.js — drives one call and re-renders on every state change. export function useCall() { const { vact } = useVact(); const [call, setCall] = useState(null); const [state, setState] = useState('idle'); const attach = (next) => { next.onState = (s) => { setState(s); if (s === 'ended') setCall(null); }; setCall(next); setState(next.state); return next; }; return { call, state, start: async (toUserId, video = true) => attach(await vact.call(toUserId, { video })), answer: async (incoming) => attach(await vact.accept(incoming)), hangUp: () => call?.end(), }; }Copy
Wrap your app in it, and the rest of the page is ordinary React:
<VactProvider appId="vact_app_your_public_app_id" getAccessToken={async () => { const r = await fetch('/api/vact-token', {method: 'POST', credentials: 'include'}); return (await r.json()).accessToken; }}> <CallScreen /> </VactProvider>Copy
Keeping the session alive
A session lasts one hour by default. Rather than discovering that from failed calls, listen for the warning and swap in a fresh token. Renewing does not interrupt an active call — the underlying identity is unchanged.
// Fires 5 minutes before expiry, then again at expiry with Duration.zero. vact.sessionExpiring.listen((remaining) async { final token = await yourApi.getVactToken(); // a NEW one-time token await vact.renew(accessToken: token); });Copy
If you would rather drive it yourself, vact.sessionExpiresAt is the exact deadline.
Sessions expire.A session lasts one hour by default. Read sessionExpiresAt and reconnect with a fresh token before it passes, or calls start failing with expired_session. Reconnecting is the same three lines as connecting — mint a new token and call connect again.
4. Place a call and show the video
Starting a call is one line. The interesting part is rendering it, so here is a complete screen you can copy.
FlutterWeb / ReactReact NativeAndroid · KotliniOS · Swift
A call from [the reference client](https://vact.online/docs.html#client) gives you the same three things the Flutter SDK does: localStream, remoteStream and a state callback. Attach the streams to two <video> elements and you are done.
<!-- index.html — the markup app.js drives. --> <video id="remote" autoplay playsinline></video> <video id="local" autoplay playsinline muted></video> <input id="to" placeholder="user_42"> <button id="call">Call</button> <button id="hangup">Hang up</button> <span id="status">idle</span> <script type="module" src="./app.js"></script>Copy
// app.js — a working call page in 40 lines. import { VactClient, VactError } from './vact-client.js'; const vact = new VactClient('vact_app_your_public_app_id'); let active = null; // 1. Connect. getVactToken() is YOUR endpoint from step 1. const token = await (await fetch('/api/vact-token', { method: 'POST' })).json(); await vact.connect(token.accessToken); console.log('connected as', vact.userId); // 2. Place a call and show both video streams. document.querySelector('#call').onclick = async () => { try { active = await vact.call(document.querySelector('#to').value, { video: true }); document.querySelector('#local').srcObject = active.localStream; document.querySelector('#remote').srcObject = active.remoteStream; active.onState = (state) => { document.querySelector('#status').textContent = state; if (state === 'ended') active = null; }; } catch (e) { if (e instanceof VactError) alert(e.message); // e.code is for your logs } }; // 3. Hang up. document.querySelector('#hangup').onclick = () => active?.end(); // 4. Ring on incoming calls. vact.onIncomingCalls((calls) => { const incoming = calls[0]; if (!incoming || active) return; if (confirm(`${incoming.callerName} is calling`)) { vact.accept(incoming).then((call) => { active = call; document.querySelector('#local').srcObject = call.localStream; document.querySelector('#remote').srcObject = call.remoteStream; }); } else { vact.decline(incoming); } });Copy
In React, a MediaStream cannot be passed as a prop — it has to be attached to the element imperatively. That one detail is the only React-specific part of the whole integration:
// CallScreen.jsx — a MediaStream cannot be a React prop, so attach it in an // effect. This is the one React-specific detail of the whole integration. import { useEffect, useRef } from 'react'; import { useCall, useVact } from './useVact'; function Video({ stream, muted, className }) { const ref = useRef(null); useEffect(() => { if (ref.current) ref.current.srcObject = stream || null; }, [stream]); return <video ref={ref} className={className} autoPlay playsInline muted={muted} />; } export default function CallScreen() { const { ready, incoming, vact } = useVact(); const { call, state, start, answer, hangUp } = useCall(); if (!ready) return <p>Connecting…</p>; if (!call && incoming) { return ( <div> <h2>{incoming.callerName} is calling</h2> <button onClick={() => answer(incoming)}>Accept</button> <button onClick={() => vact.decline(incoming)}>Decline</button> </div> ); } if (!call) return <button onClick={() => start('user_42', true)}>Call user_42</button>; return ( <div className="call"> <Video stream={call.remoteStream} className="remote" /> <Video stream={call.localStream} className="local" muted /> <p>{state}</p> <button onClick={() => call.setMicrophoneEnabled(false)}>Mute</button> <button onClick={hangUp}>Hang up</button> </div> ); }Copy
Ending a call
call.end(); // hanging up a call that was answered call.cancel(); // you are the caller, giving up before they answer vact.decline(incoming); // rejecting a call you have not answeredCopy
All three are safe to call more than once, and billing is finalised server-side either way.
5. Receive calls
You only ever see calls addressed to the connected user, so there is nothing to filter — the security rules enforce that, not your code. Nothing is answered automatically: the call connects only when you accept it.
FlutterWeb / ReactReact NativeAndroid · KotliniOS · Swift
onIncomingCalls returns an unsubscribe function and hands you only calls addressed to the connected user. Nothing is answered until you call accept.
const stop = vact.onIncomingCalls(async (calls) => { const incoming = calls[0]; if (!incoming) return setRinging(null); // caller hung up or it timed out setRinging(incoming); // {callerName, video, fromUserId} }); // Later, from your Accept button: try { const call = await vact.accept(incoming); document.querySelector('#remote').srcObject = call.remoteStream; } catch (e) { // call_not_ringing is normal: another device answered, or it expired. setRinging(null); } // And on sign-out: stop();Copy
In React the listener already lives in VactProvider from [step 3](https://vact.online/docs.html#connect), so a component only reads incoming from the context — see the CallScreen above.
6. Ringing a closed app (optional)
Everything above works while your app is running. A closed or backgrounded app has nothing listening, so the operating system must wake it with a push notification — and only your Firebase/Apple account can push to your app. So VACT tells your server, and your server sends the push.
caller places a call │ ▼ VACT backend ──POST──> your webhook ──> your FCM / APNs ──> callee's device │ app wakes, shows call UICopy
Set the webhook up once from a trusted backend script:
const {VactServer} = require('@firstlogicmetalab/server-sdk'); const vact = new VactServer({ appId: process.env.VACT_APP_ID, appSecret: process.env.VACT_APP_SECRET, }); const {signingSecret} = await vact.configureWebhook({ url: 'https://api.example.com/webhooks/vact', }); // Store signingSecret alongside your App Secret — you need it to verify.Copy
Then receive and verify. Always verify the signature before trusting the body, and always deduplicate on eventId — VACT retries delivery, so the same event can legitimately arrive twice:
const {verifyVactWebhook} = require('@firstlogicmetalab/server-sdk'); // Note: express.raw — the signature covers the EXACT bytes sent. app.post('/webhooks/vact', express.raw({type: 'application/json'}), async (req, res) => { let event; try { event = verifyVactWebhook({ rawBody: req.body, headers: req.headers, signingSecret: process.env.VACT_WEBHOOK_SECRET, }); } catch (e) { return res.status(400).send('bad signature'); // never process it } // Reply fast, then do the slow work — VACT retries on timeouts. res.sendStatus(200); if (await alreadyHandled(event.eventId)) return; await markHandled(event.eventId); if (event.type === 'incoming_call') { const tokens = await yourDb.pushTokensFor(event.data.toUserId); await yourFcm.sendEach(tokens.map((t) => ({ token: t, data: { callId: event.data.callId, from: event.data.fromUserId, callerName: event.data.callerName, callType: event.data.callType, }, android: {priority: 'high'}, apns: {headers: {'apns-priority': '10', 'apns-push-type': 'voip'}}, }))); } });Copy
Receiving that push in your app
The webhook and the FCM/APNs send above are the same on every platform. What differs is how your app turns the push into a ringing screen — and on both mobile operating systems this is a native requirement, not something VACT can do for you.
FlutterWeb / ReactReact NativeAndroid · KotliniOS · Swift
A browser tab that is closed cannot ring, so this step does not apply the way it does on mobile. What you can do is a Web Push notification from a service worker, which the user must grant:
// sw.js — your own service worker, pushed to by your own backend. self.addEventListener('push', (event) => { const call = event.data.json(); event.waitUntil(self.registration.showNotification( `${call.callerName} is calling`, {body: 'Tap to answer', data: call, requireInteraction: true}, )); }); self.addEventListener('notificationclick', (event) => { event.waitUntil(clients.openWindow(`/call?id=${event.notification.data.callId}`)); });Copy
Web push is a notification, not a ring.There is no browser API that opens a full-screen incoming call from a closed tab. If the tab is open, the ordinary onIncomingCalls listener from step 5 is all you need and is far more reliable.
The mobile half is your app's jobWithout the native work above, calls simply will not ring when the app is closed. That is an operating-system rule, not a VACT limitation — and it is why VACT notifies your server rather than pretending it can wake your app itself.
Billing and payments
You are charged for connected call time and nothing else. Ringing, declined and missed calls are free, and the clock starts only once WebRTC actually connects — not when a user taps Accept.
What
How it works
Free trial
₹100 of free credit is added to a new app's wallet automatically. Integrate and place real calls before paying anything.
Rate
Default ₹0.10 per minute for audio and ₹0.40 per minute for video. Rates are set per app and are visible in the dashboard.
Measurement
Per call, from the connected report to hang-up, rounded to the second and priced in whole paise.
Rate changes
Each call freezes the rate at creation, so a mid-call price change never re-prices a call in progress.
Wallet
A prepaid balance. Bills are settled from it automatically, oldest first.
Bill
Generated on the 1st of each month for the month just ended.
Due date
2 days after the bill is generated.
The monthly cycle
during the month calls accumulate usage 1st, 00:30 UTC a bill is generated for the month just ended any wallet balance is applied to it immediately 1st + 2 days if anything is still owing, NEW CALLS ARE BLOCKED on payment the bill settles and calling resumes within the hourCopy
What "blocked" means, preciselyOnly starting new calls stops. Calls already in progress finish normally, incoming calls still work, and the dashboard and payment pages stay reachable so you can settle the bill. Creating a call while suspended returns HTTP 402 with payment_required — handle it by showing your users a billing notice rather than a generic failure.
try { final call = await vact.call('user_42', video: true); } on VactException catch (e) { if (e.code == 'payment_required') { showBillingNotice(); // your account owes a bill } else if (e.code == 'usage_limit_reached') { showSpendCapNotice(); // your own monthly cap, not a debt } }Copy
Paying
Top up the wallet from the dashboard's payment overview card. Payments go through Paygic; the minimum is ₹1 and the maximum is ₹10,00,000 per transaction. A recharge that has left your bank but has not been confirmed yet shows as pending — the gateway is re-checked automatically every 15 minutes, so a payment is never lost because a callback went missing.
Paying immediately settles the oldest outstanding bills, and any suspension is lifted as soon as nothing is overdue.
Spend caps
Separately from bills, an app can carry a monthly hard limit. When the month's usage reaches it, new calls are refused with usage_limit_reached (HTTP 402). This is your own guardrail against a runaway integration, not a debt — it resets with the month.
Reading your usage programmatically
Everything the dashboard shows is available to any signed-in member of the app:
GET /v1/billing/{appId}/summary # wallet balance, unbilled and billed due GET /v1/billing/{appId}/bills # bill history, newest first GET /v1/billing/{appId}/transactions # every money movementCopy
{ "wallet": {"balanceMinor": 250000, "currency": "INR", "minorUnit": 2}, "summary": { "unbilledMinor": 41250, // used this month, not yet billed "billedDueMinor": 0, // owed on generated bills "suspended": false } }Copy
Amounts are always integer minor units.250000 with minorUnit: 2 means ₹2,500.00. Money never travels as a float — divide by 10^minorUnit only when you display it.
Troubleshooting
The errors you are most likely to hit first, and what they actually mean.
Symptom
Cause and fix
invalid_access_token on connect()
The token expired (5 minutes), was already used, or you sent an App Secret by mistake. Mint a fresh one immediately before connecting. Tokens are single-use — you cannot reuse one across app restarts.
invalid_app_id
You passed the App Secret where the App ID belongs. The App ID starts vact_app_; the secret starts vact_live_ and must never be in the app.
Black video, call otherwise fine
The renderer was not wired. Check you called initialize() on each RTCVideoRenderer and set srcObject, and that you setState afterwards.
First call never connects, later ones work
The permission popup appeared during call setup. Request camera/mic on a screen before the first call.
Callee never rings
Check both devices connected with different userIds under the same App ID, and that you are calling the exact id the other device connected with.
Rings, connects, then drops after ~1 minute
The call ended without a hang-up and was swept. Usually the app was backgrounded and stopped its heartbeat — expected on mobile without the background setup above.
Audio only, no video, on a video call
Camera permission was denied. Check Permission.camera.status and send the user to settings if it is permanently denied.
call_not_ringing when accepting
Normal and safe: another device answered first, the caller hung up, or the 45-second ring window elapsed. Close your ringing screen.
Every SDK error is a VactException with a stable code and a readable message. Log the code, show the message:
try { final call = await vact.call('user_42', video: true); } on VactException catch (e) { print('VACT error: ${e.code}'); // for you showSnackBar(e.message); // for the user }Copy
How it works, in plain terms
Background reading. You already placed a call above; this explains why the design looks the way it does.
There are three pieces of information, and the whole design comes down to which one lives where.
What
Looks like
Lives where
Why
App ID
vact_app_…
Anywhere, including your app
Only names your account. Grants nothing on its own.
App Secret
vact_live_…
Your server only
Full power. Anyone who extracts it can act as your app.
Access token
vact_at_…
Handed to your app
Works once, expires in 5 minutes, scoped to one user.
A phone app can be unpacked and read, so it must never contain the App Secret. Instead your server keeps the secret and hands the app a short-lived ticket. That is the entire idea; everything below follows from it.
The seven steps
Create an app in the dashboard. Store the App Secret in your server's secret manager — never in source control or an app binary.
Add one endpoint to your backend. It checks your own login, then asks VACT for a token for that user. This is the only backend work required.
Connect from the app with connect(accessToken:). The SDK swaps the ticket for a session and handles the rest.
Place a call with call(userId), using an id from your own contact list — VACT stores no directory.
Receive calls from incomingCalls(). You only ever see calls addressed to you, and nothing is answered until your UI calls accept().
Optional: ring a closed app. Only your own Firebase/Apple account can wake your app, so VACT notifies your server by webhook and your server sends the push.
Read the dashboard. Duration, quality, failures and billing appear automatically — you never report usage.
Steps 1–5 are a complete working integration. Step 6 is only needed if calls must ring while the app is closed.
Two rules worth rememberingThe App Secret never leaves your server, and your server — not the app — decides who the user is. Everything else is ordinary app code.
Credential model
Value
Location
Lifetime
Power
vact_app_...
Backend + app
Long-lived
Public tenant identifier only
vact_live_...
Backend secret manager
Until rotation
Mints user grants
vact_at_...
App memory
5 minutes, one use
Starts one scoped session
vact_st_...
App memory
Session lifetime (1 h default)
Participant API and event feed
TURN credential
SDK memory
15 minutes
Authenticated relay only
What may be visible in a package?Only the App ID, API hostname and public Firebase application identifiers. These values do not authorize data access. No App Secret, provider token, customer record, service account, SDP or ICE candidate is built into the SDK.
API v1
Base URL: https://vact.online · Machine-readable spec: [openapi.yaml](https://vact.online/openapi.yaml) (OpenAPI 3.1 — import into Postman, Insomnia, or generate a client).
Method
Endpoint
Auth
GET
/v1/bootstrap
Public identifiers
POST
/v1/apps/{appId}/tokens
Backend App Secret
PUT
/v1/apps/{appId}/webhook
Backend App Secret
POST
/v1/session/exchange
One-time access token
GET
/v1/events
Session token
POST
/v1/calls/{id}/candidates
Session token
GET
/v1/rtc/config
SDK session
POST
/v1/calls
call:create
POST
/v1/calls/{id}/{accept|connected|decline|cancel|end|heartbeat}
Scoped SDK session
POST
/v1/telemetry
telemetry:write
PUT
/v1/devices/{deviceId}
device:write
DELETE
/v1/devices/{deviceId}
device:write
DELETE
/v1/apps/{appId}/users/{userId}
Backend App Secret
GET
/v1/apps/{appId}/webhook-deliveries
Backend App Secret
POST
/v1/apps/{appId}/calls/{callId}/terminate
Backend App Secret
POST
/v1/apps/{appId}/firstparty-tokens
Verified Google ID token
GET
/v1/billing/{appId}/summary
Dashboard sign-in
GET
/v1/billing/{appId}/bills
Dashboard sign-in
GET
/v1/billing/{appId}/transactions
Dashboard sign-in
POST
/v1/billing/{appId}/recharge
Dashboard sign-in
Deleting a user's data
One authenticated call erases sessions, signalling and device registrations, and anonymizes the identity fields kept in billing records. It pages internally until the user is gone; truncated is true only when the work exceeded one request, in which case call it again.
curl -X DELETE https://vact.online/v1/apps/$APP_ID/users/user_42 \ -H "Authorization: Bearer $VACT_APP_SECRET" \ -H "Content-Type: application/json" \ -d '{"confirm": true}'Copy
{ "ok": true, "sessionsDeleted": 3, "callsDeleted": 41, "logsAnonymized": 41, "billingEventsAnonymized": 39, "passes": 1, "truncated": false }Copy
Registering a device for push
Only needed if you use VACT's own sender. Most apps should take the [webhook route](https://vact.online/docs.html#background) and push from their own Firebase or Apple account instead.
await vact.registerDevice( deviceId: 'stable-per-install-id', fcmToken: token, platform: 'android', // or 'ios' );Copy
{ "error": { "code": "invalid_access_token", "message": "access token is invalid, expired, or already exchanged" } }Copy
Webhook events
Every event is delivered to the URL you registered, signed with your vact_whsec_ secret. Verify the signature before trusting the body, and deduplicate on eventId — delivery is retried, so the same event can legitimately arrive more than once.
Event
Fires when
Typically used to
incoming_call
A call starts ringing
Push to the callee so a closed app wakes up
call_answered
The callee accepts
Stop the caller's ringback; dismiss the callee's other devices
call_ended
An answered call finishes
Tear down call UI on both sides; write your own call record
call_cancelled
The call ends before it was answered — declined, cancelled or unanswered
Dismiss the ringing UI; log a missed call
All four share one payload shape. status is what distinguishes a decline from a cancel from a ring timeout:
{ "eventId": "call_abc123:call_cancelled:declined", "type": "call_cancelled", "apiVersion": "v1", "createdAt": "2026-07-22T09:14:03.221Z", "data": { "appId": "vact_app_...", "callId": "call_abc123", "status": "declined", // declined | cancelled | missed | ended | accepted | ringing "toUserId": "user_42", // the callee — call direction, not who to notify "fromUserId": "user_7", // the caller "callType": "video", "callerName": "Priya", "endedBy": "user_42", // null unless someone actively ended it "endReason": "declined", "expiresAt": "2026-07-22T09:14:45.000Z" } }Copy
toUserId is the callee, not the recipient.The payload describes the call's direction, which never changes. Who needs telling depends on the event: a decline concerns the caller, a cancel concerns the callee, and an end concerns both. Route on type and status, not on toUserId.
Delivery history
Every attempt is recorded, so you can see exactly what failed while your endpoint was down instead of inferring it from missing calls. Transient failures (timeouts, 5xx, 429) are retried automatically; willRetry tells you whether one is still coming.
curl "https://vact.online/v1/apps/$APP_ID/webhook-deliveries?failed=true&limit=50" -H "Authorization: Bearer $VACT_APP_SECRET"Copy
{ "deliveries": [ { "eventId": "call_abc123:incoming_call:ringing", "type": "incoming_call", "callId": "call_abc123", "outcome": "retrying", // delivered | retrying | rejected | unreachable "status": 503, // what your endpoint returned, if it answered "attempts": 3, "willRetry": true, "lastAttemptAt": "2026-07-22T09:14:31.882Z", "deliveredAt": null } ] }Copy
History is kept for 30 days.
Error reference
Every failure is {"error": {"code": "...", "message": "..."}} with a matching HTTP status. Branch on code; show message. In the Flutter SDK these arrive as VactException.code.
Worth handling explicitly
Code
HTTP
Meaning and what to do
invalid_access_token
400 / 401
Expired (5 min), already used, or minted for another app. Mint a fresh one and connect again.
expired_session
401
The session's lifetime ran out. Get a new access token and reconnect.
payment_required
402
An unpaid bill is past its due date. Existing calls continue; show a billing notice. See [billing](https://vact.online/docs.html#billing).
usage_limit_reached
402
Your own monthly spend cap was hit. Raise or clear the cap.
call_not_ringing
409
Normal: another device answered, the caller hung up, or the 45s window closed. Dismiss the ringing screen.
call_not_active
409
Heartbeat or end for a call already finished. Stop the timer; treat the call as over.
callee_not_allowed
403
This session was scoped with allowedCalleeIds that exclude the target.
rate_limited
429
Too many requests. Back off and retry; do not loop.
idempotency_conflict
409
The same Idempotency-Key was reused with a different body. Use a fresh key per distinct call.
Configuration mistakes
These mean something is wrong with your setup, not with a particular call. They should surface in development and never in production.
Code
Cause
invalid_app_id
You passed a secret where the public App ID belongs.
invalid_app_credentials
The App Secret is wrong, revoked, or for another app.
app_secret_required
A backend-only endpoint was called without the App Secret.
insufficient_scope
The session lacks a permission — for example calling without call:create.
invalid_user_id
User IDs allow A-Z a-z 0-9 _ . -, up to 64 characters.
self_call
Caller and callee are the same user.
invalid_offer / invalid_answer
Malformed SDP, or the wrong type for the stage.
invalid_webhook_url
Webhook URLs must be public HTTPS; private and loopback hosts are refused.
first_party_disabled
First-party sign-in is not enabled for this app.
dashboard_login_required
An SDK session token was used on a dashboard endpoint.
Service-side
Code
HTTP
Meaning
turn_unavailable
502
Relay credentials could not be issued. Retry; calls may still connect peer-to-peer.
gateway_unavailable
502
The payment gateway did not respond. Your money is safe — pending payments are re-checked automatically.
gateway_not_configured
503
Payments are not set up on this deployment yet.
internal_error
500
Report it with the timestamp; nothing is billed for a failed request.
Client protocol reference
Everything on this page — the Flutter SDK included — is built on the sequence below. If your platform is not listed above, implement these eleven steps and you have a complete VACT client.
The sequence
#
What you do
Call
1
Exchange the one-time ticket for a session
POST /v1/session/exchange
2
Fetch ICE servers and build your peer connection
GET /v1/rtc/config
3
Create an offer, then place the call
POST /v1/calls
4
Send your ICE candidates as they are gathered
POST /v1/calls/{id}/candidates
5
Hold one long poll open for everything inbound
GET /v1/events
6
Callee answers with its SDP
POST /v1/calls/{id}/accept
7
Report real connectivity — this starts billing
POST /v1/calls/{id}/connected
8
Beat every 45 s while the call is up
POST /v1/calls/{id}/heartbeat
9
Hang up
POST /v1/calls/{id}/end (or cancel / decline)
That is the entire protocol. Every call is JSON over HTTPS with an Authorization: Bearer header.
The session token
Exchanging an access grant returns a vact_st_ session token. Send it as the bearer on every subsequent request. It is opaque — nothing to decode, verify or refresh mid-flight — and it expires at sessionExpiresAt, at which point you exchange a fresh access token from your backend.
POST /v1/session/exchange {"appId": "vact_app_...", "accessToken": "vact_at_..."} 200 OK { "sessionToken": "vact_st_...", // bearer for every later call "userId": "user_42", // the id your backend chose "appId": "vact_app_...", "sessionExpiresAt": "2026-07-23T11:00:00.000Z" }Copy
The event feed
One long poll delivers everything the client needs to react to. It returns the moment something happens, so ringing is immediate; if nothing happens it returns empty after wait seconds and you call again with the same cursor. Persist the cursor and a reconnect resumes exactly where it left off.
GET /v1/events?cursor=0&wait=25 200 OK { "events": [ {"id": "call_1_ringing", "type": "incoming_call", "callId": "call_1", "fromUserId": "user_7", "callerName": "Priya", "callType": "video", "offer": {"type": "offer", "sdp": "v=0..."}}, ], "cursor": 1770000000000 }Copy
Event
Carries
What to do
incoming_call
offer, caller, call type
Ring. Accept with your answer SDP, or decline.
call_answered
answer
setRemoteDescription; the call can now connect.
ice_candidate
candidate
addIceCandidate. Queue any that arrive before the answer.
call_connected
status
Media is flowing; billing has started.
call_ended
status, endReason
Tear down. status says ended, declined, cancelled or missed.
restart_offer / restart_answer / restart_request
SDP and a sequence n
ICE restart after a network change. Ignore any n you have already applied.
Events are idempotent.Each has a stable id. A retry or an overlapping poll can deliver one twice, so skip ids you have already handled — a set of the last few hundred is plenty.
Sending ICE candidates
Post candidates as you gather them; batching a burst into one request is cheaper and perfectly fine. The other side receives each as an ice_candidate event. Up to 128 per side are accepted.
POST /v1/calls/{callId}/candidates { "candidates": [ {"candidate": "candidate:842163049 1 udp ...", "sdpMid": "0", "sdpMLineIndex": 0} ] }Copy
Timing that matters
Value
Limit
What happens at the edge
Access token
5 minutes, single use
invalid_access_token
Session
1 hour by default
expired_session — reconnect with a fresh token
Ring window
45 seconds
Status becomes missed
Heartbeat
Send every 45 s
Swept after 180 s of silence; billed to your last beat
TURN credential
15 minutes
Refetch /v1/rtc/config for the next call
ICE candidates
128 per side
Further writes are rejected by the rules
Billing is server-authoritative.A client cannot start, stop or alter billed time. The clock starts at your connected report — after real WebRTC connectivity, not when a user taps Accept — and stops at end or at your last successful heartbeat, whichever comes first.
Security guarantees
Secrets are random, shown once, stored only as hashes and compared in constant time.
Access grants are short-lived, one-time, hashed at rest, rate-limited and scoped.
Key, webhook and token events create server-only audit records with hashed user IDs.
Every API call rechecks server-owned session expiry, app state and revocation epoch.
Call IDs use 128 bits of cryptographic randomness and are created only by the server.
Lifecycle and billing fields cannot be written directly by client SDKs.
Participants can read only their own calls and write at most 128 immutable ICE candidates on their side while the call is live.
Billable time starts only after the SDK reports a real WebRTC connection, not when the user merely taps Accept.
Billing uses server timestamps, immutable events and a per-call rate snapshot.
Telemetry is participant-only and field-allowlisted; arbitrary JSON is rejected.
A per-user concurrent-call cap and a per-app daily relay-credential quota bound abusive usage before it reaches your bill.
Your backend can force-disconnect any call with POST /v1/apps/{appId}/calls/{callId}/terminate; the SDK tears the media down within one heartbeat.
Ending a call — by hang-up, backend terminate, or the server sweep — stops the SDK's media automatically, and relay credentials cannot be renewed for a call that is no longer active.
What server-side enforcement can and cannot do.Billing is server-authoritative: durations, rates and ledgers are set by the server and cannot be forged by any client. When a call ends, the SDK stops the media automatically, and a relay call can no longer renew its credentials. The one thing no signalling provider can prevent is a deliberately modified client keeping a direct peer-to-peer stream open after it stops billing — the media never touches the server, so nothing server-side sees it. This is inherent to peer-to-peer WebRTC. The concurrent cap, relay quota, force-terminate and anomaly detection exist to make that costly and visible rather than free and silent.
Privacy and retention
WebRTC media is protected in transit with DTLS-SRTP. A standard TURN service relays encrypted packets; VACT does not intentionally record media. VACT does process SDP, ICE candidates, opaque user IDs, timestamps, call state, usage totals and registered push tokens.
Use opaque internal IDs and avoid phone numbers, emails or real names unless required. SDP and ICE candidates are erased when a call ends; seven-day TTL fields provide fallback cleanup for abandoned calls. Sessions expire at their configured lifetime, rate buckets expire automatically and device registrations are refreshed or expire after 90 days. The server SDK's deleteUserData(userId) deletes sessions/signalling/devices and anonymizes identity fields in retained billing records.
Mobile production responsibilities
The SDK provides signalling and push-token registration. The integrating app still needs Android notification channels, foreground/full-screen call behaviour, OEM testing and iOS native PushKit/CallKit handling. Background FCM/APNs alone is not a promise of WhatsApp-like terminated-app reliability.
Scope and roadmap
VACT v1 is one-to-one P2P/TURN calling. It is not yet a group-room SFU/MCU and does not provide server recording, webinars, live streaming, transcription or media moderation. Agora-level breadth also requires regional control planes, global TURN capacity, native incoming-call modules, load/chaos evidence, a public status page and contractual SLA/DPA processes.
VACT v1 · Last updated July 20, 2026 · Legacy unversioned endpoints are disabled.
