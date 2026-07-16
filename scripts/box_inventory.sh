#!/usr/bin/env bash
# box_inventory.sh — SAFE, read-only report of everything on the gem2i box.
# Run before any clean. Changes nothing.
echo "===== gem2i box inventory ($(hostname)) ====="
echo "--- uptime ---"; uptime
echo "--- runtimes (must survive a clean) ---"
python3 --version 2>&1; node --version 2>&1; (yarn --version 2>&1 | head -1); nginx -v 2>&1; (mongod --version 2>&1 | head -1); certbot --version 2>&1
echo "--- /opt ---"; ls -1 /opt 2>/dev/null
echo "--- custom systemd services ---"
systemctl list-units --type=service --all --no-legend --no-pager | grep -Ei 'backend|carlos|aurex|acapital|pms|lms|mms|journal|news|kms|morning|gem' || echo '(none)'
echo "--- nginx sites-enabled ---"; ls -1 /etc/nginx/sites-enabled/ 2>/dev/null
echo "--- Let's Encrypt certs ---"
sudo certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains' || echo '(none)'
echo "--- MongoDB databases ---"
mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.forEach(function(d){print("  "+d.name+"  "+(d.sizeOnDisk/1048576).toFixed(1)+" MB")})' 2>/dev/null || echo '(mongo shell not found)'
echo "--- disk ---"; df -h / | tail -1
echo "===== end inventory ====="
