#!/bin/sh
# Richtet den taeglichen Job ein: Gutschein-Codes am Lieferdatum und Erinnerungsmails.
# Laeuft jeden Tag um 06:00 UTC (07:00 Winterzeit, 08:00 Sommerzeit in Deutschland).
# Beide Aufgaben sind idempotent, ein doppelter Aufruf verschickt nichts doppelt.
set -e

printf 'export CRON_SECRET="%s"\n' "$CRON_SECRET" > /etc/cron-env

cat > /etc/crontabs/root <<'CRON'
0 6 * * * . /etc/cron-env; wget -q -O- --header "Authorization: Bearer $CRON_SECRET" http://app:3000/api/cron/taeglich > /proc/1/fd/1 2>&1
CRON

echo "Cronjob eingerichtet: taeglich 06:00 UTC gegen http://app:3000/api/cron/taeglich"
exec crond -f -l 8
