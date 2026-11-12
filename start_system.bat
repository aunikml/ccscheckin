@echo off
title National Child Care Summit - System Launcher
echo ========================================================
echo   National Child Care Summit - Participant Management
echo ========================================================
echo.
echo Launching Django Backend in virtual environment...
start "Child Care Summit - Backend (Django)" "%~dp0run_backend.bat"

echo Launching React Frontend (MUI + Framer Motion)...
start "Child Care Summit - Frontend (React)" "%~dp0run_frontend.bat"

echo.
echo Both servers are starting up!
echo   Frontend UI:  http://localhost:5173
echo   Backend API:   http://127.0.0.1:8000/api/
echo   Default Admin: username=admin, password=admin12345
echo.
pause

