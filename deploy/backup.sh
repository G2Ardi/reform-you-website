#!/bin/sh
# Taegliche Sicherung der Datenbank in /backups (Ordner "backups" neben der
# docker-compose.yml). Das erste Backup entsteht beim Start, danach alle 24 Stunden.
# Alte Sicherungen werden nach BACKUP_TAGE Tagen geloescht (Standard 14).
#
# WICHTIG: Der Ordner liegt auf demselben Host wie die Datenbank. Er muss
# zusaetzlich auf ein anderes System gesichert werden (z. B. Proxmox Backup
# Server oder ein Netzlaufwerk), sonst ist es keine echte Sicherung.
set -e

while true; do
  datei="/backups/reformyou-$(date +%Y-%m-%d-%H%M).dump"
  if pg_dump -Fc -f "$datei"; then
    echo "Sicherung erstellt: $datei"
  else
    echo "FEHLER: Sicherung fehlgeschlagen" >&2
    rm -f "$datei"
  fi
  find /backups -name 'reformyou-*.dump' -mtime +"${BACKUP_TAGE:-14}" -delete
  sleep 86400
done
