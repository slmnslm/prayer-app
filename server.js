require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3030;

// ====================== MIDDLEWARE ======================
app.set('trust proxy', 1); // Important for Dokploy / reverse proxy
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ====================== MySQL CONNECTION ======================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0
});

// Test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to MySQL');
    connection.release();
  } catch (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
    console.error('Please check your .env file and MySQL service in Dokploy');
  }
}
testConnection();

// ====================== DATABASE INITIALIZATION ======================
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS iqama_times (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        date        DATE NOT NULL,
        prayer      VARCHAR(50) NOT NULL,
        time        TIME NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_date_prayer (date, prayer)
      )
    `);
    console.log('✅ iqama_times table is ready');
  } catch (err) {
    console.error('❌ Failed to initialize table:', err.message);
  }
}
initDatabase();

// ====================== API ROUTES ======================

// Get today's Iqama times
app.get('/api/iqama', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const [rows] = await pool.query(
      'SELECT prayer, TIME_FORMAT(time, "%H:%i") as time FROM iqama_times WHERE date = ?',
      [today]
    );
    const iqama = {};
    rows.forEach(row => {
      iqama[row.prayer] = row.time;
    });
    res.json({ iqama });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all saved schedules (for admin table)
app.get('/api/iqama/all', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        date,
        MAX(CASE WHEN prayer = 'Fajr'    THEN TIME_FORMAT(time, '%H:%i') END) AS Fajr,
        MAX(CASE WHEN prayer = 'Dhuhr'   THEN TIME_FORMAT(time, '%H:%i') END) AS Dhuhr,
        MAX(CASE WHEN prayer = 'Asr'     THEN TIME_FORMAT(time, '%H:%i') END) AS Asr,
        MAX(CASE WHEN prayer = 'Maghrib' THEN TIME_FORMAT(time, '%H:%i') END) AS Maghrib,
        MAX(CASE WHEN prayer = 'Isha'    THEN TIME_FORMAT(time, '%H:%i') END) AS Isha
      FROM iqama_times
      GROUP BY date
      ORDER BY date DESC
    `);
    res.json({ entries: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Iqama for specific date (for editing)
app.get('/api/iqama/date', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const [rows] = await pool.query(
      'SELECT prayer, TIME_FORMAT(time, "%H:%i") as time FROM iqama_times WHERE date = ?',
      [date]
    );
    const iqama = {};
    rows.forEach(r => iqama[r.prayer] = r.time);
    res.json({ iqama });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Save Iqama times for a date range
app.post('/admin/save-range', async (req, res) => {
  const { startDate, endDate, fajr, dhuhr, asr, maghrib, isha } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and End date are required' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return res.status(400).json({ message: 'End date must be after Start date' });
  }

  const prayers = [
    { prayer: 'Fajr',    time: fajr },
    { prayer: 'Dhuhr',   time: dhuhr },
    { prayer: 'Asr',     time: asr },
    { prayer: 'Maghrib', time: maghrib },
    { prayer: 'Isha',    time: isha }
  ];

  try {
    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];

      // Delete old entries for this date
      await pool.query('DELETE FROM iqama_times WHERE date = ?', [dateStr]);

      // Insert new entries
      for (const p of prayers) {
        if (p.time) {
          await pool.query(
            'INSERT INTO iqama_times (date, prayer, time) VALUES (?, ?, ?)',
            [dateStr, p.prayer, p.time]
          );
        }
      }
      current.setDate(current.getDate() + 1);
    }

    res.json({ message: `Successfully saved Iqama times from ${startDate} to ${endDate}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error while saving' });
  }
});

// Delete Iqama times for a specific date
app.post('/admin/delete', async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ message: 'Date is required' });

  try {
    await pool.query('DELETE FROM iqama_times WHERE date = ?', [date]);
    res.json({ message: `Deleted all Iqama times for ${date}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error while deleting' });
  }
});

// ====================== SERVE FRONTEND ======================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Prayer Times App is running on port ${PORT}`);
  console.log(`🌐 Live Site: https://mnh.slmnslm.theworkpc.com`);
  console.log(`🔧 Admin Panel: https://mnh.slmnslm.theworkpc.com/admin`);
});