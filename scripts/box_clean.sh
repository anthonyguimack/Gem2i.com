#!/usr/bin/env bash
# box_clean.sh — wipe all brand app artifacts from the gem2i box, keep runtimes.
# Idempotent. Stages a pre-clean backup of /etc/nginx + custom unit files first.
# Runtimes (python3/node/yarn/nginx/mongod/certbot) are NEVER touched.
set -u
echo "===== gem2i box clean starting on $(hostname) ====="

BK=/opt/_preclean_backup
sudo mkdir -p "$BK"
TS=$(date +%Y%m%d-%H%M%S)
echo "--- staging pre-clean backup in $BK"
sudo tar -czf "$BK/etc-nginx-$TS.tar.gz" -C /etc nginx 2>/dev/null || true
sudo cp -a /etc/systemd/system/*.service "$BK/" 2>/dev/null || true
# keep a mongodump of the carlos DB just in case (small, 32MB)
sudo mkdir -p "$BK/mongo-$TS"
mongodump --db carlosartiles_cms --out "$BK/mongo-$TS" >/dev/null 2>&1 || true
echo "    pre-clean backup staged."

echo "--- stopping + removing custom app services"
for u in carlos-artiles-backend lms-carlosartiles-backend mms-carlosartiles-backend pms-carlosartiles-backend; do
  sudo systemctl stop "$u" 2>/dev/null || true
  sudo systemctl disable "$u" 2>/dev/null || true
  sudo rm -f "/etc/systemd/system/${u}.service" 2>/dev/null || true
  echo "    removed $u"
done
# catch any other *-backend units generically (except gem2i)
for u in $(systemctl list-unit-files --type=service --no-legend --no-pager | awk '{print $1}' | grep -E '\-backend\.service$' | grep -v '^gem2i-backend'); do
  b=${u%.service}
  sudo systemctl stop "$b" 2>/dev/null || true
  sudo systemctl disable "$b" 2>/dev/null || true
  sudo rm -f "/etc/systemd/system/${u}" 2>/dev/null || true
  echo "    removed $b (generic sweep)"
done
sudo systemctl daemon-reload

echo "--- removing nginx server blocks (keep 'default')"
for f in /etc/nginx/sites-enabled/*; do
  [ -e "$f" ] || continue
  bn=$(basename "$f")
  [ "$bn" = "default" ] && continue
  sudo rm -f "$f"; echo "    disabled $bn"
done
for f in /etc/nginx/sites-available/*; do
  [ -e "$f" ] || continue
  bn=$(basename "$f")
  [ "$bn" = "default" ] && continue
  sudo rm -f "$f"; echo "    removed available $bn"
done

echo "--- deleting Let's Encrypt certificates"
for cn in $(sudo certbot certificates 2>/dev/null | awk '/Certificate Name:/{print $3}'); do
  sudo certbot delete --cert-name "$cn" -n 2>/dev/null && echo "    deleted cert $cn"
done

echo "--- removing /opt app dirs + backups (keep _preclean_backup, lost+found)"
for d in /opt/*; do
  [ -e "$d" ] || continue
  bn=$(basename "$d")
  case "$bn" in
    _preclean_backup|lost+found) continue ;;
  esac
  sudo rm -rf "$d"; echo "    removed /opt/$bn"
done

echo "--- dropping non-system MongoDB databases"
mongosh --quiet --eval '
db.adminCommand({listDatabases:1}).databases.forEach(function(d){
  if (["admin","config","local"].indexOf(d.name) === -1) {
    db.getSiblingDB(d.name).dropDatabase();
    print("    dropped " + d.name);
  }
});' 2>/dev/null || echo "    (mongo: check manually)"

echo "--- validating + reloading nginx"
sudo nginx -t 2>&1 | tail -2
sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null || true

echo
echo "===== CLEAN COMPLETE ====="
echo "/opt now:"; ls -1 /opt
echo "services (*-backend):"; systemctl list-units --type=service --no-legend --no-pager | grep -E '\-backend' || echo "  (none)"
echo "mongo dbs:"; mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.forEach(function(d){print("  "+d.name)})' 2>/dev/null
echo "runtimes still present:"; python3 --version; node --version; nginx -v 2>&1; certbot --version 2>&1
