# Medical CRM System

A comprehensive medical clinic management system with real-time queue management, appointment booking, and patient management.

## Quick Start

### First Time Setup
1. Run `FIRST_TIME_SETUP.bat` to install dependencies and initialize the system
2. Follow the on-screen instructions

### Daily Usage
1. Run `START_MEDICAL_CRM.bat` to start the system
2. Open http://localhost:3000 in your browser

## System Requirements

- **Python 3.8+** - Download from [python.org](https://python.org)
- **Node.js 16+** - Download from [nodejs.org](https://nodejs.org)
- **Windows 10/11** - For batch file compatibility

## Default Login Credentials

- **Admin**: `admin` / `admin123`
- **Reception**: `sara_reception` / `sara123`
- **Doctor**: `dr_mohamed` / `doctor123`
- **Doctor**: `dr_laila` / `doctor123`
- **Doctor**: `dr_ahmed` / `doctor123`

## Features

- **Real-time Queue Management** - Live updates between reception and doctor
- **Appointment Booking** - Complete booking wizard with clinic/doctor selection
- **Patient Management** - Comprehensive patient records and history
- **Payment Processing** - Integrated payment system
- **Role-based Access** - Admin, Reception, and Doctor roles
- **Real-time Communication** - SocketIO for live updates

## System Architecture

- **Backend**: Flask + SQLAlchemy + SocketIO
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite (development) / PostgreSQL (production)
- **Real-time**: SocketIO for live updates

## URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api/docs

## Troubleshooting

### Backend Issues
- Ensure Python virtual environment is activated
- Check if port 5000 is available
- Verify database file exists in `backend/instance/`

### Frontend Issues
- Ensure Node.js dependencies are installed
- Check if port 3000 is available
- Clear browser cache if needed

### Database Issues
- Run `python backend/seed.py` to reset database
- Check database file permissions

## Support

For technical support or issues, check the system logs in the console windows that open when starting the system.