# Setup Guide

## System Requirements

### Required Software
- **Python 3.8+** - [Download from python.org](https://python.org)
- **Node.js 16+** - [Download from nodejs.org](https://nodejs.org)
- **Windows 10/11** - For batch file compatibility

### Hardware Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for initial setup

## Installation Steps

### 1. Download and Install Python
1. Go to [python.org](https://python.org)
2. Download Python 3.8 or newer
3. **Important**: Check "Add Python to PATH" during installation
4. Verify installation: Open Command Prompt and run `python --version`

### 2. Download and Install Node.js
1. Go to [nodejs.org](https://nodejs.org)
2. Download the LTS version
3. Install with default settings
4. Verify installation: Open Command Prompt and run `node --version`

### 3. Setup Medical CRM
1. Navigate to the project folder
2. Double-click `FIRST_TIME_SETUP.bat`
3. Wait for the setup to complete
4. The system will be ready to use

## Verification

After setup, verify the installation:

1. **Backend**: Check `backend/venv/` folder exists
2. **Frontend**: Check `frontend/node_modules/` folder exists
3. **Database**: Check `backend/instance/medical_crm.db` exists

## Starting the System

1. Double-click `START_MEDICAL_CRM.bat`
2. Two console windows will open (backend and frontend)
3. Open browser to http://localhost:3000
4. Login with admin/admin123

## Troubleshooting

### Python Issues
- **Error**: "Python is not recognized"
- **Solution**: Reinstall Python with "Add to PATH" option

### Node.js Issues
- **Error**: "Node is not recognized"
- **Solution**: Reinstall Node.js with default settings

### Port Conflicts
- **Error**: "Port already in use"
- **Solution**: Close other applications using ports 3000 or 5000

### Database Issues
- **Error**: "Database not found"
- **Solution**: Run `FIRST_TIME_SETUP.bat` again

## Uninstallation

To completely remove the system:

1. Delete the entire project folder
2. No system files are modified outside the project folder
3. Virtual environment and node_modules are contained within the project

## Support

For additional help:
1. Check the console windows for error messages
2. Verify all requirements are met
3. Try running `FIRST_TIME_SETUP.bat` again