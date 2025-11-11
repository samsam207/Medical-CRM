@echo off
echo ========================================
echo    Medical CRM - Starting System
echo ========================================
echo.

:: Check if backend virtual environment exists
if not exist "backend\venv" (
    echo ERROR: Backend not set up. Please run FIRST_TIME_SETUP.bat first.
    pause
    exit /b 1
)

:: Check if frontend node_modules exists
if not exist "frontend\node_modules" (
    echo ERROR: Frontend not set up. Please run FIRST_TIME_SETUP.bat first.
    pause
    exit /b 1
)

echo Checking if port 5000 is available...
netstat -ano | findstr :5000 >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 5000 is already in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
        echo Killing process %%a...
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo Starting backend server...
cd backend
:: Try to use Python from venv, fallback to py launcher
if exist "venv\Scripts\python.exe" (
    start "Medical CRM Backend" cmd /k "venv\Scripts\activate.bat && venv\Scripts\python.exe run.py"
) else (
    start "Medical CRM Backend" cmd /k "venv\Scripts\activate.bat && py run.py"
)

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting frontend server...
cd ..\frontend
start "Medical CRM Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo    Medical CRM is Starting...
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Default login credentials:
echo - Admin: admin / admin123
echo - Reception: sara_reception / sara123
echo - Doctor: dr_mohamed / doctor123
echo - Doctor: dr_laila / doctor123
echo - Doctor: dr_ahmed / doctor123
echo.
echo Press any key to open the application in your browser...
pause >nul

:: Open browser
start http://localhost:3000

echo.
echo System started successfully!
echo Close this window when you're done using the system.
echo.
pause
