@echo off
echo ========================================
echo    Medical CRM - First Time Setup
echo ========================================
echo.

echo Checking system requirements...

:: Check if Python is installed (try multiple commands)
set PYTHON_CMD=
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :python_found
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    goto :python_found
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3
    goto :python_found
)

echo ERROR: Python is not installed or not in PATH
echo Please install Python 3.8+ from https://python.org
echo.
echo Alternatively, you can add Python to your PATH:
echo 1. Find your Python installation (usually in C:\Users\YourName\AppData\Local\Programs\Python)
echo 2. Add it to your system PATH environment variable
pause
exit /b 1

:python_found
echo ✓ Python found: %PYTHON_CMD%
%PYTHON_CMD% --version

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
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

:: Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

:: Initialize database
echo Initializing database...
call venv\Scripts\python.exe seed.py
if %errorlevel% neq 0 (
    echo WARNING: Failed to initialize database. You may need to run migrations manually.
    echo Run: venv\Scripts\python.exe -m flask db upgrade
)

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
