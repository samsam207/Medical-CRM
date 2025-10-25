# Quick Start Guide

## First Time Setup

1. **Run Setup**: Double-click `FIRST_TIME_SETUP.bat`
2. **Wait for completion**: The script will install all dependencies
3. **Start system**: Run `START_MEDICAL_CRM.bat`

## Daily Usage

1. **Start system**: Double-click `START_MEDICAL_CRM.bat`
2. **Open browser**: Navigate to http://localhost:3000
3. **Login**: Use any of the following credentials:
   - Admin: admin/admin123
   - Reception: sara_reception/sara123
   - Doctor: dr_mohamed/doctor123
   - Doctor: dr_laila/doctor123
   - Doctor: dr_ahmed/doctor123

## System Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## User Roles

### Admin (admin/admin123)
- Full system access
- User management
- System configuration

### Reception (sara_reception/sara123)
- Patient management
- Appointment booking
- Queue management
- Payment processing

### Doctor (dr_mohamed/doctor123, dr_laila/doctor123, dr_ahmed/doctor123)
- Patient queue access
- Visit management
- Consultation notes

## Features Overview

### Reception Dashboard
- Quick appointment booking
- Patient check-in
- Queue management
- Payment processing

### Doctor Dashboard
- Patient queue
- Visit management
- Consultation workflow

### Real-time Updates
- Live queue updates
- Instant notifications
- Synchronized data

## Troubleshooting

### System Won't Start
1. Check if Python and Node.js are installed
2. Run `FIRST_TIME_SETUP.bat` again
3. Check console windows for error messages

### Database Issues
1. Delete `backend/instance/medical_crm.db`
2. Run `FIRST_TIME_SETUP.bat` again

### Port Conflicts
- Backend uses port 5000
- Frontend uses port 3000
- Close other applications using these ports