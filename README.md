# National Child Care Summit - Participant Management System

A participant management and on-site accreditation system built for the **National Child Care Summit**. It connects directly to responses from the summit's registration **Google Form**, automatically synchronizes and normalizes participants into a database, and provides a UI with full **CRUD** capabilities, on-site check-in with lanyard badge generation, and **Role-Based Access Control (RBAC)** restricted to administrators.

---

## 🏛️ System Architecture

```
[ Google Form (Registrations) ]
               │
               ▼
   [ Google Spreadsheet ]
               │
               ▼ (Automated Fetch & Field Normalization)
 [ Django REST Backend (venv) ] ──── [ SQLite / PostgreSQL Database ]
               │
               ▼ (REST API + JWT Bearer Auth)
[ React 19 + MUI + Framer Motion UI ]
```

- **Backend**: Python 3.14+, Django 5.x, Django REST Framework, SimpleJWT, `django-cors-headers`, `python-dotenv`, `requests`, and Google Client API.
- **Virtual Environment**: Isolated in `backend/venv` with all dependencies managed.
- **Frontend**: React 19 with Vite, Material-UI (MUI v9), `@emotion`, and `framer-motion` for fluid interactive animations.
- **RBAC & Multi-Role Governance**: 3 distinct roles:
  - **Admin**: Full site access (CRUD participants, User Management CRUD, Google Form sync, CSV report exports).
  - **Registration Host**: On-site desk operations (Check in participants for Day 1 / Day 2 / Fast-track, view dashboard & directory, add new participants, print badges).
  - **Viewer**: Read-only real-time summit dashboard analytics and headcounts.
- **User Management**: Dedicated administrative console (`/users`) with full CRUD for managing accounts, assigning roles, and toggling access.
- **Configuration**: Loaded securely via `.env` file for secrets, API endpoints, and administrator credentials.

---

## 🚀 Quick Start Guide

### 1. Launch Everything With One Click (Windows)
Double click `start_system.bat` in the root folder, or execute:
```powershell
.\start_system.bat
```
This automatically starts:
- **Backend API**: `http://127.0.0.1:8000`
- **Frontend Portal**: `http://localhost:5173`

---

### 2. Manual Startup

#### Backend (Django Virtual Environment):
```powershell
cd d:\Childcaresummit\backend

# 1. Activate the virtual environment
.\venv\Scripts\activate

# 2. Run database migrations
python manage.py migrate

# 3. Create or update the initial Admin user from .env
python manage.py setup_summit_admin

# 4. Start the Django API server
python manage.py runserver 127.0.0.1:8000
```

#### Frontend (React + Vite):
```powershell
cd d:\Childcaresummit\frontend

# Start Vite dev server with proxy to backend
npm run dev
```

---

## 🔐 Quick Role Logins (3 Default Accounts)

When you navigate to `http://localhost:5173`, the compact branded login screen lets you 1-click auto-fill or enter credentials for any of the 3 roles:

| Role | Username | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin12345` | Full site access: Participant CRUD, User Management CRUD, Google Sheet sync, full CSV export. |
| **Registration Host** | `host` | `host12345` | On-site desk mode: View Dashboard & Participant list, Check in Day 1 / Day 2, Add participants, print lanyard badges. Cannot delete or access User Management / Sync. |
| **Viewer** | `viewer` | `viewer12345` | Executive view: Real-time dashboard analytics and attendance metrics only. Directory, Check-in, and Admin consoles are restricted. |

---

## 🔄 Google Form & Sheet Integration

The system synchronizes responses submitted to your Google Form spreadsheet:

### How to Connect Your Google Form:
1. Open your **Google Form** and switch to the **Responses** tab.
2. Click **Link to Sheets** to open the connected Google Spreadsheet.
3. Click the green **Share** button in the top right corner of the sheet.
4. Under **General access**, select **"Anyone with the link"** as **Viewer**.
5. Copy the spreadsheet URL or ID (e.g. `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n.../edit`).
6. In the Summit Portal, go to **Google Form Sync** in the top navigation bar, paste the URL into **Google Sheet URL or ID**, and click **Save Configuration**.
7. Click **"Pull Live From Sheet"** to ingest registrations immediately!

### Idempotency & Upserting:
- Syncing matches participants by **Email Address**.
- New rows are added with auto-generated Summit IDs (`NCCS-2026-0001`, `NCCS-2026-0002`...).
- Existing rows are updated with any new edits without duplicating records.
- If you don't have an active external Google Sheet yet, click **"Load Sample Form Data"** in the UI to immediately load 8 realistic summit registrations (Speakers, VIPs, Delegates, Healthcare Specialists, NGOs) to explore all features.

---

## ✨ Features Breakdown

### 1. 📊 Command Center & Analytics Dashboard
- **Animated KPI Cards**: Total Registrations, Checked-In Count with live percentage progress bar, In-Person vs Virtual split.
- **Sector Distribution**: Real-time breakdown of participants across Speakers, VIPs, Government, NGOs, Educators, Healthcare, and Media.
- **Google Sheet Pipeline Status**: Shows connection health, last pull timestamp, and row audit.
- **Recent Check-ins**: Live desk feed displaying who just checked in, with single-click undo option.

### 2. 👥 Full CRUD Participant Directory & Multi-Day Check-in
- **Dedicated Columns**: Separate columns for **Full Name**, **Email Address**, **Mobile**, **Guest Type**, **Summit Session**, **Day 1 / Day 2 Check-in**, and **Status**.
- **Separate Day 1 & Day 2 Check-in Desk**: Independent interactive toggle buttons (`D1: In`, `D2: In`) on every row recording exact check-in timestamps.
- **Fast Check-in Desk**: Station selector for `Day 1 Check-in`, `Day 2 Check-in`, or `Both Days` with QR code or Summit ID scan.
- **Instant Search**: Search across name, email, mobile, summit ID, guest type, or session with debounced filtering.
- **Multi-dimensional Filters**: Filter by Guest Type, Summit Session, Check-in State (`Day 1 Checked In`, `Day 2 Checked In`, `Both Days Checked In`), and Status.
- **Create & Edit Participant**: Modal covering full name, email, mobile number, guest type, multi-select session checkboxes, registration timestamp, and status.
- **Bulk Operations**: Multi-select participants to bulk check-in for Day 1, Day 2, or Both Days.
- **Specialized Check-in CSV Exports**: 1-click export reports for:
  - `Export Day 1 Check-ins` (includes Day 1 Check-in timestamps)
  - `Export Day 2 Check-ins` (includes Day 2 Check-in timestamps)
  - `Export Both Days Check-ins`
  - `Export All Check-in Data`
  - `Export Full Filtered Roster`

### 3. 🪪 Printable Summit Accreditation Pass (Lanyard Badge)
- Click the Summit ID or badge icon for any attendee to view their **Official Summit Accreditation Badge**.
- Features summit branding, attendee name, designation, organization, category color ribbon, access level, and simulated **QR Code**.
- Includes a **"Print Badge"** action with print-optimized CSS for fast on-site badge printing at registration desks.

### 4. 🛡️ Role-Based Access Control (RBAC)
- Strict access policy configured: Only users with `role == 'ADMIN'` (or staff/superuser) can log in and execute operations.
- Non-admin tokens are rejected with `403 Forbidden` (`IsAdminUserOnly` permission class).
- Extensible architecture ready to support `STAFF` (check-in desk only) and `VIEWER` (reports only) when desired.

---

## ⚙️ Environment Variables (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `SECRET_KEY` | Django cryptographic secret key | Secure random string |
| `DEBUG` | Enable/disable debug mode (must be `False` in production) | `False` |
| `ALLOWED_HOSTS` | Permitted server domains / IPs | `summit.example.com,YOUR_VM_IP,localhost` |
| `CORS_ALLOWED_ORIGINS`| Permitted origins for React frontend | `https://summit.example.com,http://localhost:5173` |
| `DB_ENGINE` | Database backend engine | `django.db.backends.postgresql` |
| `DB_NAME` | PostgreSQL database name | `childcaresummit_db` |
| `DB_USER` | PostgreSQL username | `childcare_user` |
| `DB_PASSWORD` | PostgreSQL user password | `StrongSecretPassword123!` |
| `DB_HOST` | PostgreSQL host address | `127.0.0.1` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `ADMIN_USERNAME` | Default initial admin username | `admin` |
| `ADMIN_EMAIL` | Default initial admin email | `admin@childcaresummit.org` |
| `ADMIN_PASSWORD` | Default initial admin password | `admin12345` |
| `GOOGLE_SHEET_ID` | Default Google Sheet URL or ID | Configurable via UI or .env |
| `GOOGLE_SHEET_TAB_NAME`| Default sheet tab name | `Form Responses 1` |

---

## 🐧 Production Deployment on Ubuntu VM with PostgreSQL

This guide provides end-to-end instructions for deploying the **National Child Care Summit** system on a clean **Ubuntu 22.04 LTS / 24.04 LTS** virtual machine using **PostgreSQL**, **Gunicorn**, and **Nginx**.

```
[ Internet / Browsers ]
          │ (Port 80 / 443 HTTPS)
          ▼
    [ Nginx Reverse Proxy ]
     ├── Static Single Page App (/var/www/childcaresummit/frontend/dist)
     ├── Django Static Assets   (/var/www/childcaresummit/backend/staticfiles)
     └── Pass API Requests (/api/*)
          │
          ▼ (Unix Socket: /run/childcaresummit.sock)
    [ Gunicorn WSGI Server ]
          │
          ▼
   [ Django REST Backend ] ──── [ PostgreSQL Database (5432) ]
```

---

### Step 1: Update System & Install Dependencies

SSH into your Ubuntu VM as `root` or a user with `sudo` privileges:

```bash
sudo apt update && sudo apt upgrade -y

# Install Python 3, PostgreSQL, Nginx, Git, build libraries
sudo apt install -y python3 python3-pip python3-venv python3-dev \
    libpq-dev postgresql postgresql-contrib nginx curl git ufw
```

Install **Node.js 20 LTS** and **npm** for compiling the React frontend:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Should display v20.x or higher
npm -v
```

---

### Step 2: Configure PostgreSQL Database

Switch to the `postgres` system account to create the summit database and dedicated user:

```bash
sudo -u postgres psql
```

Inside the PostgreSQL interactive shell, run the following SQL commands (replace `YourSecurePasswordHere` with a strong password):

```sql
-- 1. Create the database
CREATE DATABASE childcaresummit_db;

-- 2. Create the dedicated database user
CREATE USER childcare_user WITH PASSWORD 'YourSecurePasswordHere';

-- 3. Configure performance & character encoding settings
ALTER ROLE childcare_user SET client_encoding TO 'utf8';
ALTER ROLE childcare_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE childcare_user SET timezone TO 'UTC';

-- 4. Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE childcaresummit_db TO childcare_user;

-- 5. Grant schema permissions (PostgreSQL 15+)
\c childcaresummit_db
GRANT ALL ON SCHEMA public TO childcare_user;

-- Exit psql
\q
```

---

### Step 3: Deploy Application Code & Python Virtual Environment

Clone or upload your repository to `/var/www/childcaresummit`:

```bash
sudo mkdir -p /var/www/childcaresummit
sudo chown -R $USER:$USER /var/www/childcaresummit

# Clone your repository (or copy your code files):
git clone <YOUR_GIT_REPOSITORY_URL> /var/www/childcaresummit
cd /var/www/childcaresummit
```

Set up an isolated Python virtual environment for the backend:

```bash
cd /var/www/childcaresummit/backend
python3 -m venv venv
source venv/bin/activate

# Upgrade pip and install all production backend dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 4: Configure Production Environment Variables

Create the production `.env` file in `/var/www/childcaresummit/backend/.env`:

```bash
nano /var/www/childcaresummit/backend/.env
```

Paste and adjust the following configuration:

```ini
# Production Django Settings
SECRET_KEY=generate_a_random_50_character_secret_key_here
DEBUG=False
ALLOWED_HOSTS=summit.yourdomain.org,YOUR_SERVER_IP,127.0.0.1,localhost

# Database Configuration (PostgreSQL)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=childcaresummit_db
DB_USER=childcare_user
DB_PASSWORD=YourSecurePasswordHere
DB_HOST=127.0.0.1
DB_PORT=5432

# CORS Settings (Allow your production domain)
CORS_ALLOWED_ORIGINS=https://summit.yourdomain.org,http://summit.yourdomain.org

# Initial Administrator Credentials
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@childcaresummit.org
ADMIN_PASSWORD=SummitAdmin2026!

# Google Sheet Integration (Optional, can also configure in UI)
GOOGLE_SHEET_TAB_NAME=Form Responses 1
```

> [!TIP]
> You can generate a secure Django secret key anytime by running:
> `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`

---

### Step 5: Run Migrations, Collect Static Files & Seed Admin

With the virtual environment active (`source venv/bin/activate`):

```bash
cd /var/www/childcaresummit/backend

# 1. Run database migrations to create PostgreSQL tables
python manage.py migrate

# 2. Collect all static assets for Nginx into staticfiles/
python manage.py collectstatic --noinput

# 3. Initialize or verify the initial Admin user
python manage.py setup_summit_admin
```

---

### Step 6: Configure Gunicorn as a Systemd Service

Create a systemd service file to manage the Gunicorn WSGI process automatically across server reboots:

```bash
sudo nano /etc/systemd/system/childcaresummit.service
```

Paste the following service definition:

```ini
[Unit]
Description=Gunicorn daemon for National Child Care Summit API
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/childcaresummit/backend
EnvironmentFile=/var/www/childcaresummit/backend/.env
ExecStart=/var/www/childcaresummit/backend/venv/bin/gunicorn \
    --access-logfile /var/log/gunicorn-access.log \
    --error-logfile /var/log/gunicorn-error.log \
    --workers 3 \
    --bind unix:/run/childcaresummit.sock \
    config.wsgi:application
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Give `www-data` ownership of the application directory and start the service:

```bash
sudo chown -R www-data:www-data /var/www/childcaresummit
sudo systemctl daemon-reload
sudo systemctl start childcaresummit
sudo systemctl enable childcaresummit

# Verify Gunicorn is running:
sudo systemctl status childcaresummit
```

---

### Step 7: Build the Frontend for Production

Compile the Vite React application into optimized static HTML, CSS, and JavaScript bundles:

```bash
cd /var/www/childcaresummit/frontend
npm install
npm run build
```

This generates production-optimized assets in `/var/www/childcaresummit/frontend/dist/`.

Make sure `www-data` retains read and execute permissions:
```bash
sudo chown -R www-data:www-data /var/www/childcaresummit/frontend/dist
sudo chmod -R 755 /var/www/childcaresummit/frontend/dist
```

---

### Step 8: Configure Nginx Reverse Proxy

Create an Nginx server block configuration for the summit portal:

```bash
sudo nano /etc/nginx/sites-available/childcaresummit
```

Paste the following configuration (replace `summit.yourdomain.org` with your domain or server IP):

```nginx
server {
    listen 80;
    server_name summit.yourdomain.org YOUR_SERVER_IP;

    client_max_body_size 25M;

    # 1. Frontend React SPA
    location / {
        root /var/www/childcaresummit/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. Django Static Files
    location /static/ {
        alias /var/www/childcaresummit/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # 3. Backend REST API Proxy
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/run/childcaresummit.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

Enable the configuration and reload Nginx:

```bash
# Enable site configuration
sudo ln -sf /etc/nginx/sites-available/childcaresummit /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 9: Configure Firewall & SSL / HTTPS (Let's Encrypt)

Allow HTTP, HTTPS, and SSH through the Ubuntu UFW firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

If you have a domain name pointing to your VM's public IP address, obtain a free SSL certificate via Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d summit.yourdomain.org
```

Certbot will automatically configure HTTPS, handle TLS renewals, and redirect all HTTP traffic to HTTPS.

---

### Step 10: Automated Google Form Periodic Sync (Optional Cron)

To automatically pull responses from the connected Google Form sheet in the background every 5 minutes:

```bash
sudo crontab -u www-data -e
```

Add the following line:

```cron
*/5 * * * * /var/www/childcaresummit/backend/venv/bin/python /var/www/childcaresummit/backend/manage.py sync_google_sheet >> /var/log/summit_sync.log 2>&1
```

---

### Step 11: Useful Maintenance & Troubleshooting Commands

```bash
# Check status of Gunicorn backend:
sudo systemctl status childcaresummit

# View live Gunicorn application logs:
sudo journalctl -u childcaresummit -f

# View live Nginx error logs:
sudo tail -f /var/log/nginx/error.log

# Restart services after updating code:
sudo systemctl restart childcaresummit
sudo systemctl reload nginx

# Run PostgreSQL backup:
pg_dump -U childcare_user -h 127.0.0.1 -d childcaresummit_db > summit_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🛠️ CLI Management Commands

You can also run tasks from the command line inside `backend`:

```powershell
# Activate venv
.\venv\Scripts\activate

# Reset / ensure default admin user:
python manage.py setup_summit_admin

# Pull Google Form responses via CLI:
python manage.py sync_google_sheet --sample

# Or pull from a specific Google Sheet URL:
python manage.py sync_google_sheet --sheet-url "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
```

