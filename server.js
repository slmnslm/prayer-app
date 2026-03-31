require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3030;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Pool
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

// Initialize Tables
async function initDatabase() {
  try {
    // Iqama times table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS iqama_times (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        prayer VARCHAR(50) NOT NULL,
        time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_date_prayer (date, prayer)
      )
    `);

    // Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        city VARCHAR(100) NOT NULL DEFAULT 'Oakville',
        country VARCHAR(100) NOT NULL DEFAULT 'Canada',
        method INT NOT NULL DEFAULT 2,
        method_name VARCHAR(100) NOT NULL DEFAULT 'ISNA',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
  }
}
initDatabase();

// ====================== SETTINGS API ======================

// Get current settings
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json({ city: "Oakville", country: "Canada", method: 2, method_name: "ISNA" });
    }
  } catch (err) {
    res.json({ city: "Oakville", country: "Canada", method: 2, method_name: "ISNA" });
  }
});

// Save settings
app.post('/api/settings', async (req, res) => {
  const { city, country, method } = req.body;

  const methodNames = {
    2: "ISNA",
    5: "Muslim World League",
    1: "University of Islamic Sciences, Karachi",
    4: "Egyptian General Authority of Survey",
    6: "Islamic Union of North America",
    12: "Union of Islamic Organisations in France",
    13: "Ministry of Awqaf and Islamic Affairs, Kuwait",
    14: "One-Seventh of the Night"
  };

  try {
    await pool.query(`
      INSERT INTO settings (city, country, method, method_name)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        city = VALUES(city),
        country = VALUES(country),
        method = VALUES(method),
        method_name = VALUES(method_name)
    `, [city, country, method, methodNames[method] || "ISNA"]);

    res.json({ message: "Settings saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save settings" });
  }
});

// ====================== EXISTING IQAMA ROUTES ======================
// (Keep all your existing iqama routes here - /api/iqama, /api/iqama/all, /api/iqama/date, /admin/save-range, /admin/delete)

app.get('/api/iqama', async (req, res) => { /* your existing code */ });
app.get('/api/iqama/all', async (req, res) => { /* your existing code */ });
app.get('/api/iqama/date', async (req, res) => { /* your existing code */ });
app.post('/admin/save-range', async (req, res) => { /* your existing code */ });
app.post('/admin/delete', async (req, res) => { /* your existing code */ });

// ====================== FRONTEND ROUTES ======================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Prayer Times App running on port ${PORT}`);
  console.log(`🌐 https://mnh.slmnslm.theworkpc.com`);
});