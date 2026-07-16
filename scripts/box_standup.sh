#!/usr/bin/env bash
# box_standup.sh — stand up the gem2i instance on the cleaned box.
# Assumes code is already at /opt/beta.gem2i.com (backend/ + frontend/) and
# /tmp/gem2i_nginx.conf has been uploaded. Idempotent where practical.
set -e

DIR=/opt/beta.gem2i.com
SVC=gem2i-backend
PORT=8050
DOMAIN=beta.gem2i.com
URL=https://$DOMAIN
DB=gem2i_cms

echo "===== gem2i stand-up starting ====="

echo "--- python venv + requirements"
cd "$DIR/backend"
if [ ! -d venv ]; then python3 -m venv venv; fi
venv/bin/pip install --upgrade pip -q
venv/bin/pip install -r requirements.txt -q 2>&1 | grep -v '^\[notice\]' || true

echo "--- backend/.env (created once; never overwritten)"
if [ ! -f .env ]; then
  cat > .env <<ENV
MONGO_URL=mongodb://localhost:27017
DB_NAME=$DB
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=$URL
ADMIN_EMAIL=admin@gem2i.com
ADMIN_PASSWORD=$(openssl rand -base64 15)
ENV
  echo "    .env created"
else
  echo "    .env already present — kept"
fi

echo "--- backend import smoke test"
venv/bin/python -c "import server; print('backend import OK')"

echo "--- frontend .env + install + build"
cd "$DIR/frontend"
echo "REACT_APP_BACKEND_URL=$URL" > .env
yarn install 2>&1 | grep -v '^warning' || true
NODE_OPTIONS=--max_old_space_size=2048 yarn build 2>&1 | tail -6

echo "--- systemd unit $SVC"
sudo tee /etc/systemd/system/$SVC.service > /dev/null <<UNIT
[Unit]
Description=gem2i backend (FastAPI)
After=network.target mongod.service

[Service]
User=ubuntu
WorkingDirectory=$DIR/backend
ExecStart=$DIR/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port $PORT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now $SVC
sleep 5
sudo systemctl is-active $SVC || (sudo journalctl -u $SVC -n 40 --no-pager; exit 1)

echo "--- nginx vhost"
sudo mv /tmp/gem2i_nginx.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
sudo nginx -t
sudo systemctl reload nginx

echo "--- Let's Encrypt cert"
sudo certbot --nginx -d $DOMAIN -n --agree-tos -m admin@gem2i.com --redirect 2>&1 | tail -4 || echo "    (certbot: check DNS points to this box if this failed)"

echo "--- health check"
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/api/health)
echo "    http://127.0.0.1:$PORT/api/health -> $code"

echo "===== stand-up complete ====="
echo "service: $(systemctl is-active $SVC)"
echo "admin bootstrap password is in $DIR/backend/.env (ADMIN_PASSWORD) — retrieve, then change after first login"
