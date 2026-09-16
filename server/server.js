const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { VactServer } = require('@firstlogicmetalab/server-sdk');

const app = express();
const port = process.env.PORT || 3001;

// Allow CORS from our local React dev server
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Initialize VACT Server SDK
const vact = new VactServer({
  appId: process.env.VACT_APP_ID,
  appSecret: process.env.VACT_APP_SECRET,
});

app.post('/api/vact-token', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const token = await vact.createAccessToken({
      userId: userId
    });

    res.json({ accessToken: token });
  } catch (error) {
    console.error('Error minting VACT token:', error);
    res.status(500).json({ error: 'Failed to mint token' });
  }
});

app.listen(port, () => {
  console.log(`VACT Auth Server listening at http://localhost:${port}`);
});
