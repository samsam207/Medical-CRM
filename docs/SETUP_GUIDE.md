# Medical CRM - Complete Setup Guide

## 🚀 Quick Start (If Python & Node.js are installed)

1. **Double-click `start_medical_crm_simple.bat`**
2. Wait for setup to complete
3. Application opens automatically

## 📋 Prerequisites Installation

### Step 1: Install Python

**Option A: Official Python (Recommended)**
1. Go to https://www.python.org/downloads/
2. Download Python 3.8 or newer
3. **IMPORTANT**: During installation, check "Add Python to PATH"
4. Restart your computer after installation

**Option B: Microsoft Store Python**
1. Open Microsoft Store
2. Search for "Python 3.11" or newer
3. Install it
4. No PATH configuration needed

**Option C: Use our helper**
1. Double-click `install_python.bat`
2. Follow the instructions

### Step 2: Install Node.js

1. Go to https://nodejs.org/
2. Download the LTS version (16.x or newer)
3. Install with default settings
4. Restart your computer

### Step 3: Verify Installation

Open Command Prompt and test:
```cmd
python --version
node --version
```

Both should show version numbers.

## 🎯 Running the Application

### Method 1: Simple Launcher (Recommended)
- Double-click `start_medical_crm_simple.bat`

### Method 2: Advanced Launcher
- Double-click `START_MEDICAL_CRM.bat`

### Method 3: Manual Setup
```cmd
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
python run.py

# Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

## 🔑 Login Credentials

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `admin123` |
| **Receptionist** | `sara_reception` | `sara123` |
| **Doctor** | `dr_mohamed` | `doctor123` |

## 🌐 Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 🆘 Troubleshooting

### Python Not Found
1. Reinstall Python with "Add to PATH" checked
2. Restart computer
3. Try Microsoft Store Python
4. Manually add Python to PATH

### Node.js Not Found
1. Reinstall Node.js
2. Restart computer
3. Check if npm is working: `npm --version`

### Port Already in Use
1. Close other applications using ports 3000 or 5000
2. Restart computer
3. Use different ports in configuration

### Frontend Not Loading
1. Wait 1-2 minutes for Vite to start
2. Check the frontend terminal window
3. Refresh the browser page
4. Try http://localhost:3000 manually

### Backend Errors
1. Check the backend terminal window
2. Make sure database is initialized
3. Check if all dependencies are installed
4. Try running `python seed.py` manually

## 📞 Support

If you still have issues:
1. Check the terminal windows for error messages
2. Make sure you're running from the correct directory
3. Verify Python and Node.js are properly installed
4. Try the manual setup method

## ✨ Features

- Complete appointment booking system
- Patient management
- Doctor scheduling
- Payment tracking
- Real-time dashboard
- Multi-role authentication
- Queue management
