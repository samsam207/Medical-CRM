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

echo Starting backend server...
cd backend
start "Medical CRM Backend" cmd /k "venv\Scripts\activate.bat && python run.py"

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
