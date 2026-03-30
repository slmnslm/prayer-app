# Salat & Iqama Timings

A clean and modern web application to display **Salat (Prayer)** times and **Iqama** times. Built with Node.js, Express, and MySQL. Designed for masjids and Muslim communities.

Live Site: [https://mnh.slmnslm.theworkpc.com](https://mnh.slmnslm.theworkpc.com)

## ✨ Features

- Beautiful, responsive design with live **countdown to next Iqama**
- Real-time Salat times fetched from AlAdhan API (ISNA method)
- Custom Iqama times managed via Admin Panel
- Support for date range scheduling (single day, week, month, or full year)
- Admin panel with full CRUD (Create, Read, Update, Delete) functionality
- Mobile-friendly interface
- Auto-refresh at midnight

## 🛠 Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Deployment**: Dokploy (with GitHub integration)

## 📁 Project Structure

```bash
prayer-app/
├── package.json
├── .env.example
├── Dockerfile
├── server.js
├── public/
│   ├── index.html          # Main prayer times page
│   └── admin.html          # Admin management panel
├── README.md
└── .gitignore