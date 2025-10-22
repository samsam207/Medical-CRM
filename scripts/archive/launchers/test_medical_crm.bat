@echo off
echo ========================================
echo    Medical CRM - Quick Test
echo ========================================
echo.

echo Testing Backend API...
curl -s http://localhost:5000/api/health >nul 2>&1
if errorlevel 1 (
    echo Backend: NOT RUNNING
) else (
    echo Backend: RUNNING ✓
)

echo Testing Frontend...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo Frontend: NOT RUNNING
) else (
    echo Frontend: RUNNING ✓
)

echo.
echo Opening application...
start http://localhost:3000

echo.
echo Test complete!
pause
