# Medical CRM - Quick Start Guide

## 🚀 One-Click Launch

### Option 1: Windows Batch File (Recommended)
1. Double-click `start_medical_crm.bat`
2. Wait for setup to complete
3. Application will open automatically in your browser

### Option 2: PowerShell Script
1. Right-click `start_medical_crm.ps1`
2. Select "Run with PowerShell"
3. Wait for setup to complete
4. Application will open automatically in your browser

## 📋 What the Script Does

1. ✅ Checks Python and Node.js installation
2. ✅ Creates virtual environment for backend
3. ✅ Installs all backend dependencies
4. ✅ Initializes and seeds the database
5. ✅ Installs frontend dependencies
6. ✅ Starts backend server (http://localhost:5000)
7. ✅ Starts frontend server (http://localhost:3000)
8. ✅ Opens application in your browser

## 🔑 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `admin123` |
| **Receptionist** | `sara_reception` | `sara123` |
| **Doctor** | `dr_mohamed` | `doctor123` |

## 🌐 Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 🛠️ Manual Setup (If Needed)

If the automated script doesn't work, you can set up manually:

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
python run.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🎯 Features Available

- ✅ Complete appointment booking system
- ✅ Patient management
- ✅ Doctor scheduling
- ✅ Payment tracking
- ✅ Real-time dashboard
- ✅ Multi-role authentication
- ✅ Queue management

## 🆘 Troubleshooting

1. **Python not found**: Install Python 3.8+ from python.org
2. **Node.js not found**: Install Node.js 16+ from nodejs.org
3. **Port already in use**: Close other applications using ports 3000 or 5000
4. **Permission denied**: Run as administrator

## 📞 Support

If you encounter any issues, check the console output for error messages and ensure all dependencies are properly installed.
