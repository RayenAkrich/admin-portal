require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Get all members
app.get('/members', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM checkin');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update member on check-in
app.post('/checkin', async (req, res) => {
  const { qrcode } = req.body;
  try {
    // Check if member exists
    const memberRes = await pool.query('SELECT * FROM checkin WHERE qrcode = $1', [qrcode]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found.' });
    }
    // Check if already present
    if (memberRes.rows[0].present === true) {
      return res.status(400).json({ error: 'Member already checked in.' });
    }
    // Check in the member
    const result = await pool.query(
      `UPDATE checkin SET present = true, checkin_time = NOW()
       WHERE qrcode = $1 AND present = false AND checkin_time IS NULL
       RETURNING *`, [qrcode]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Check-in failed.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
