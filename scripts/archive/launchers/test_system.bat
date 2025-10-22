@echo off
title Medical CRM - System Test
color 0E

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                 MEDICAL CRM - SYSTEM TEST                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 🔍 Testing Medical CRM System...
echo.

:: Test Backend Health
echo [1/4] Testing Backend Health...
curl -s http://localhost:5000/api/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend: NOT RUNNING
    echo    Please start the backend server first
) else (
    echo ✅ Backend: RUNNING
    for /f "tokens=*" %%i in ('curl -s http://localhost:5000/api/health 2^>nul') do echo    Response: %%i
)

:: Test Backend Login
echo.
echo [2/4] Testing Backend Login...
curl -s -X POST -H "Content-Type: application/json" -d "{\"username\":\"sara_reception\",\"password\":\"sara123\"}" http://localhost:5000/api/auth/login >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend Login: FAILED
) else (
    echo ✅ Backend Login: SUCCESS
)

:: Test Frontend
echo.
echo [3/4] Testing Frontend...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend: NOT RUNNING
    echo    Please start the frontend server first
) else (
    echo ✅ Frontend: RUNNING
)

:: Test Database
echo.
echo [4/4] Testing Database...
cd backend
call venv\Scripts\activate.bat 2>nul
python -c "from app import create_app, db; from app.models.user import User; app = create_app(); app.app_context().push(); users = User.query.count(); print(f'Database: {users} users found')" 2>nul
if errorlevel 1 (
    echo ❌ Database: ERROR
) else (
    echo ✅ Database: CONNECTED
)
cd ..

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    TEST COMPLETE                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 🌐 Opening application...
start http://localhost:3000

echo.
echo Test complete! Check the results above.
pause
