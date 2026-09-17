# VACT SDK Documentation

## 1. Backend token
Mint a token from your backend. The App Secret lives only here, never in the app.

```javascript
// server.js
const express = require('express');
const app = express();

app.post('/api/vact-token', async (req, res) => {
  const r = await fetch('https://vact.online/v1/apps/YOUR_APP_ID/tokens', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer YOUR_APP_SECRET', 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: req.query.user || 'alice' }),
  });
  res.json(await r.json());
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

## 2. Install & permissions
npm install @firstlogicmetalab/client

Ask for permissions before the first call. If you request them while a call is already starting, the popup interrupts media setup and the first call often fails to connect.
```javascript
// The stream is discarded; it exists only to raise the prompt early.
const probe = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
probe.getTracks().forEach((t) => t.stop());
```

## 3. Connect
Create one client for the signed-in user and connect it with a token. Keep it alive for as long as the user is signed in.
```javascript
import { VactClient, VactError } from '@firstlogicmetalab/client';
const vact = new VactClient('YOUR_APP_ID');

const {accessToken} = await (await fetch('/api/vact-token', { method: 'POST' })).json();
await vact.connect(accessToken);
```

## 4. Place a call
Starting a call is one line. Attach the streams to two `<video>` elements.
```javascript
const active = await vact.call('target_userId', { video: true });
document.querySelector('#local').srcObject = active.localStream;
document.querySelector('#remote').srcObject = active.remoteStream;

active.onState = (state) => {
  if (state === 'ended') {
    // handle call ended
  }
};
```
Ending a call:
- `call.end()` - hanging up an answered call
- `call.cancel()` - giving up before they answer
- `vact.decline(incoming)` - rejecting a call you have not answered

## 5. Receive calls
Listen for incoming calls:
```javascript
vact.onIncomingCalls(async (calls) => {
  const incoming = calls[0]; // VactIncomingCall object
  // incoming.fromUserId, incoming.callerName, incoming.video
  
  // Accept the call
  const call = await vact.accept(incoming, { video: true, audio: true });
  document.querySelector('#remote').srcObject = call.remoteStream;
});
```

## Troubleshooting
- `invalid_access_token`: Token expired (5 mins). Mint a fresh one.
- `Black video, call otherwise fine`: Renderer not wired or camera permission denied.
- `First call never connects, later ones work`: Permission popup appeared during call setup.
- `call_not_ringing when accepting`: Normal. Another device answered or caller hung up.

## Client Protocol Events (onState)
- `ringing`
- `connecting`
- `connected`
- `reconnecting`
- `ended`
- `failed`
