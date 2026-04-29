#!/usr/bin/env bash
# =============================================================================
#  Traccia Fondi — VPS deployment script (Ubuntu 22.04)
# =============================================================================
#  Run AS ROOT on a fresh Ubuntu 22.04 VPS:
#     bash deploy.sh
#
#  This script installs everything, fetches the code from GitHub,
#  configures the production .env (with Atlas + Cloudinary + Resend),
#  builds the frontend, starts the backend with PM2, configures nginx,
#  and (if DNS already points to this server) gets a free Let's Encrypt
#  SSL certificate.
#
#  Edit the variables in the CONFIG block below before running.
# =============================================================================

set -euo pipefail

# ===== CONFIG ================================================================
DOMAIN="traccia-fondi.com"
WWW_DOMAIN="www.traccia-fondi.com"
GIT_REPO="https://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@github.com/sarrile60/FUNDS-AI.git"
GIT_BRANCH="main"
APP_DIR="/var/www/traccia-fondi"
ADMIN_EMAIL_FOR_LETSENCRYPT="support@traccia-fondi.com"

# MongoDB Atlas (production)
MONGO_URL="mongodb+srv://pierangelamarcio232_db_user:yo123mama@cluster0.jqvhvbe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME="traccia_fondi"

# Admin credentials for the Traccia Fondi admin panel
ADMIN_PANEL_EMAIL="admin@traccia-fondi.com"
ADMIN_PANEL_PASSWORD="AdminTF#2026!"

# Cloudinary (file storage)
CLOUDINARY_CLOUD_NAME="ditryuycq"
CLOUDINARY_API_KEY="458857888894956"
CLOUDINARY_API_SECRET="7JcM2POPh-YCdlLSTHlyncitZAE"

# Resend (email delivery)
RESEND_API_KEY="re_BXpgajXt_P5ENhvhG2ur6hauBvfon4cqV"
RESEND_FROM_RECOVERY="Traccia Fondi <recovery@traccia-fondi.com>"
RESEND_FROM_NOREPLY="Traccia Fondi <noreply@traccia-fondi.com>"
RESEND_REPLY_TO="support@traccia-fondi.com"
# =============================================================================

step() { echo -e "\n\033[1;36m==>  $1\033[0m"; }
ok()   { echo -e "\033[1;32m✓ $1\033[0m"; }
warn() { echo -e "\033[1;33m! $1\033[0m"; }
err()  { echo -e "\033[1;31m✗ $1\033[0m" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "Run this script as root:  sudo bash deploy.sh"
  exit 1
fi

if [[ "$GIT_REPO" == *"REPLACE_ME"* ]]; then
  err "Edit GIT_REPO at the top of this file before running."
  exit 1
fi

# ===== 1. System packages ====================================================
step "1/8  Updating system & installing base packages"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl git nginx ufw certbot python3-certbot-nginx \
  python3 python3-pip python3-venv build-essential ca-certificates gnupg
ok "Base packages installed"

# ===== 2. Node.js 20 + Yarn + PM2 ============================================
step "2/8  Installing Node.js 20, Yarn, PM2"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g --silent yarn pm2
ok "Node $(node -v), Yarn $(yarn -v), PM2 ready"

# ===== 3. Firewall ===========================================================
step "3/8  Configuring firewall (SSH + HTTP/HTTPS only)"
ufw allow OpenSSH    >/dev/null
ufw allow 'Nginx Full' >/dev/null
yes | ufw enable     >/dev/null || true
ok "Firewall enabled"

# ===== 4. Clone repo =========================================================
step "4/8  Fetching project from GitHub"
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR" && git fetch --all && git reset --hard "origin/$GIT_BRANCH"
else
  git clone -b "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
fi
ok "Code at $APP_DIR"

# ===== 5. Backend: venv + .env + deps ========================================
step "5/8  Backend: venv, dependencies, .env"
cd "$APP_DIR/backend"

if [[ ! -d venv ]]; then
  python3 -m venv venv
fi
# shellcheck disable=SC1091
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
deactivate

JWT_SECRET=$(openssl rand -hex 32)
cat > "$APP_DIR/backend/.env" <<EOF
MONGO_URL="$MONGO_URL"
DB_NAME="$DB_NAME"
JWT_SECRET="$JWT_SECRET"
CORS_ORIGINS="https://$DOMAIN,https://$WWW_DOMAIN"
ADMIN_EMAIL="$ADMIN_PANEL_EMAIL"
ADMIN_PASSWORD="$ADMIN_PANEL_PASSWORD"
CLOUDINARY_CLOUD_NAME="$CLOUDINARY_CLOUD_NAME"
CLOUDINARY_API_KEY="$CLOUDINARY_API_KEY"
CLOUDINARY_API_SECRET="$CLOUDINARY_API_SECRET"
RESEND_API_KEY="$RESEND_API_KEY"
RESEND_FROM_RECOVERY="$RESEND_FROM_RECOVERY"
RESEND_FROM_NOREPLY="$RESEND_FROM_NOREPLY"
RESEND_REPLY_TO="$RESEND_REPLY_TO"
EOF
chmod 600 "$APP_DIR/backend/.env"
ok "Backend deps + .env ready"

# ===== 6. Frontend: build ====================================================
step "6/8  Frontend: install + production build"
cd "$APP_DIR/frontend"
cat > .env <<EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF
yarn install --silent
yarn build
ok "Frontend built into $APP_DIR/frontend/build"

# ===== 7. PM2 backend ========================================================
step "7/8  Starting backend with PM2"
cd "$APP_DIR/backend"
pm2 delete traccia-fondi-api >/dev/null 2>&1 || true
pm2 start "venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2" \
  --name traccia-fondi-api \
  --time
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
sleep 3
if curl -fs http://127.0.0.1:8001/api/health >/dev/null; then
  ok "Backend healthy on 127.0.0.1:8001"
else
  err "Backend did not respond. Check:  pm2 logs traccia-fondi-api"
  exit 1
fi

# ===== 8. nginx ==============================================================
step "8/8  Configuring nginx"
cat > /etc/nginx/sites-available/traccia-fondi <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    client_max_body_size 30M;

    root $APP_DIR/frontend/build;
    index index.html;

    # Static well-known routes
    location = /robots.txt   { try_files \$uri =404; }
    location = /sitemap.xml  { try_files \$uri =404; }
    location = /.well-known/security.txt { try_files \$uri =404; }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
    }

    # Static asset caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)\$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # SPA fallback — every non-existent route falls back to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/traccia-fondi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "nginx serving on http://$DOMAIN"

# ===== 9. Optional: HTTPS via Let's Encrypt ==================================
step "9/9  Trying to issue HTTPS certificate (only works if DNS already points here)"
if certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" \
     --non-interactive --agree-tos -m "$ADMIN_EMAIL_FOR_LETSENCRYPT" \
     --redirect 2>/tmp/certbot.log; then
  ok "HTTPS active. Visit  https://$DOMAIN"
else
  warn "HTTPS not issued yet — most likely DNS hasn't propagated to this server."
  warn "After DNS resolves to $(curl -s ifconfig.me), run:"
  warn "    certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos -m $ADMIN_EMAIL_FOR_LETSENCRYPT --redirect"
fi

echo
ok "Deployment finished."
echo "  • Public URL:  http://$DOMAIN  (https after certbot succeeds)"
echo "  • Admin panel: http://$DOMAIN/admin   ($ADMIN_PANEL_EMAIL / $ADMIN_PANEL_PASSWORD)"
echo "  • Logs:        pm2 logs traccia-fondi-api"
echo "  • Update later: cd $APP_DIR && git pull && bash deploy.sh"
