const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { VactServer } = require('@firstlogicmetalab/server-sdk');

const app = express();
const port = process.env.PORT || 3001;

// Allow CORS from any origin for testing
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const appId = process.env.VACT_APP_ID || 'vact_app_12c938ca7ac6f7708669a1f9';
const appSecret = process.env.VACT_APP_SECRET || 'vact_live_e77aaf189a50456c_g3yXZOG7IotQXtA3H6AI4erAoZBOVSCBb4D5r0W8K-A';

app.post('/api/vact-token', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const r = await fetch(
      `https://vact.online/v1/apps/${appId}/tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId }),
      },
    );
    
    if (!r.ok) {
      console.error('VACT API Error:', await r.text());
      return res.status(500).json({ error: 'Failed to mint token from VACT API' });
    }

    const data = await r.json();
    res.json({ accessToken: data.token || data.accessToken });
  } catch (error) {
    console.error('Error minting VACT token:', error);
    res.status(500).json({ error: 'Failed to mint token' });
  }
});

app.listen(port, () => {
  console.log(`VACT Auth Server listening at http://localhost:${port}`);
});
