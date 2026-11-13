#!/usr/bin/env bash
# ==============================================================================
# National Child Care Summit - Automated Production Deployment Script
# Targets: Ubuntu 22.04 LTS / 24.04 LTS
# ==============================================================================

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}==================================================================${NC}"
echo -e "${GREEN}  National Child Care Summit - Autonomous Deployment Agent Script  ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Check for root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run as root or with sudo:${NC} sudo bash deploy.sh"
  exit 1
fi

# Detect Server External IP
VM_IP=$(curl -s ifconfig.me || curl -s api.ipify.org || hostname -I | awk '{print $1}')
echo -e "${YELLOW}--> Detected Server IP: ${VM_IP}${NC}"

# 1. Update system packages
echo -e "${YELLOW}--> [1/8] Updating Ubuntu system packages...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt update -y && apt upgrade -y
apt install -y python3 python3-pip python3-venv python3-dev \
    libpq-dev postgresql postgresql-contrib nginx curl git ufw

# 2. Install Node.js 20 LTS
echo -e "${YELLOW}--> [2/8] Installing Node.js 20 LTS & npm...${NC}"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo -e "    Node version: $(node -v)"
echo -e "    NPM version:  $(npm -v)"

# 3. Setup PostgreSQL Database & User
echo -e "${YELLOW}--> [3/8] Configuring PostgreSQL database...${NC}"
systemctl start postgresql
systemctl enable postgresql

DB_NAME="childcaresummit_db"
DB_USER="childcare_user"
DB_PASS="SummitDbPass2026!"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -c "ALTER ROLE $DB_USER SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE $DB_USER SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE $DB_USER SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# 4. Clone or Pull Application Repository
echo -e "${YELLOW}--> [4/8] Fetching application code...${NC}"
APP_DIR="/var/www/childcaresummit"
REPO_URL="https://github.com/aunikml/ccscheckin.git"

if [ -d "$APP_DIR/.git" ]; then
  echo -e "    Updating existing repository..."
  cd "$APP_DIR"
  git pull origin main
else
  echo -e "    Cloning fresh repository..."
  mkdir -p "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

# 5. Configure Python Virtual Environment & Dependencies
echo -e "${YELLOW}--> [5/8] Setting up Python backend virtual environment...${NC}"
cd "$APP_DIR/backend"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Generate .env file if missing
if [ ! -f ".env" ]; then
  SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
  cat <<EOF > .env
SECRET_KEY=$SECRET_KEY
DEBUG=False
ALLOWED_HOSTS=$VM_IP,localhost,127.0.0.1

DB_ENGINE=django.db.backends.postgresql
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_HOST=127.0.0.1
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://$VM_IP,https://$VM_IP

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@childcaresummit.org
ADMIN_PASSWORD=admin12345
EOF
fi

# 6. Database Migrations, Static Assets & Default Admin
echo -e "${YELLOW}--> [6/8] Running database migrations & collecting static files...${NC}"
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py setup_summit_admin

# 7. Compile React Frontend
echo -e "${YELLOW}--> [7/8] Compiling Vite React production bundle...${NC}"
cd "$APP_DIR/frontend"
npm install
npm run build

chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR/frontend/dist"

# 8. Configure Systemd & Nginx
echo -e "${YELLOW}--> [8/8] Configuring Gunicorn and Nginx reverse proxy...${NC}"

# Gunicorn Service
cat <<EOF > /etc/systemd/system/childcaresummit.service
[Unit]
Description=Gunicorn daemon for National Child Care Summit
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/venv/bin/gunicorn \
    --workers 3 \
    --bind unix:/run/childcaresummit.sock \
    config.wsgi:application
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now childcaresummit
systemctl restart childcaresummit

# Nginx Server Block
cat <<EOF > /etc/nginx/sites-available/childcaresummit
server {
    listen 80;
    server_name $VM_IP;

    client_max_body_size 25M;

    # 1. Frontend SPA
    location / {
        root $APP_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # 2. Django Static Assets
    location /static/ {
        alias $APP_DIR/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # 3. Django REST API
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/run/childcaresummit.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/childcaresummit /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Firewall settings
if ufw status | grep -q "Status: active"; then
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
fi

echo -e "\n${GREEN}==================================================================${NC}"
echo -e "${GREEN}  DEPLOYMENT SUCCESSFUL! All services are active and running.     ${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "  🌐 Portal URL:       http://${VM_IP}"
echo -e "  👤 Admin Username:   admin"
echo -e "  🔑 Admin Password:   admin12345"
echo -e "${GREEN}==================================================================${NC}\n"
