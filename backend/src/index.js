require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const spendRouter = require('./routes/spend');
const requirePasscode = require('./middleware/passcode');

const app = express();
const PORT = process.env.PORT || 3001;

// Behind Render's proxy, so req.ip is the real client (used by the passcode lockout).
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.use('/api/spend', requirePasscode, spendRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    if (!process.env.APP_PASSCODE) console.warn('APP_PASSCODE is not set — the API is open to anyone who can reach it.');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
