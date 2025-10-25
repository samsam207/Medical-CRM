@echo off
echo ========================================
echo    Medical CRM - First Time Setup
echo ========================================
echo.

echo Checking system requirements...

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo ✓ Python and Node.js are installed
echo.

echo Setting up backend...
cd backend

:: Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

:: Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

:: Initialize database
echo Initializing database...
python seed.py

echo ✓ Backend setup complete
echo.

echo Setting up frontend...
cd ..\frontend

:: Install Node.js dependencies
echo Installing Node.js dependencies...
npm install

echo ✓ Frontend setup complete
echo.

echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo The Medical CRM system is now ready to use.
echo.
echo To start the system, run: START_MEDICAL_CRM.bat
echo.
echo System will be available at:
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:5000
echo.
echo Default login credentials:
echo - Admin: admin / admin123
echo - Reception: sara_reception / sara123
echo.
pause
