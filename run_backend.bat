@echo off
title National Child Care Summit - Backend (Django)
cd /d "%~dp0backend"
echo Activating Python virtual environment...
call venv\Scripts\activate
echo Checking migrations and admin user...
python manage.py migrate
python manage.py setup_summit_admin
echo Starting Django REST API server on http://127.0.0.1:8000 ...
python manage.py runserver 127.0.0.1:8000
pause

