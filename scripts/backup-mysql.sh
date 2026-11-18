#!/bin/bash
# Copia de seguridad lógica de la base de datos MySQL del stack Docker.
# Se ejecuta dentro del contenedor "backup" (imagen mysql:8.0) y deja el
# archivo comprimido en /backups, que está montado en ./backups del host.
set -euo pipefail

: "${DB_HOST:=db}"
: "${DB_PORT:=3306}"
: "${DB_NAME:?Falta DB_NAME}"
: "${DB_USER:?Falta DB_USER}"
: "${DB_PASSWORD:?Falta DB_PASSWORD}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
    echo "ERROR: BACKUP_RETENTION_DAYS debe ser un número entero." >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
OUT="$BACKUP_DIR/${DB_NAME}_${STAMP}.sql.gz"
TMP="$OUT.tmp"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando copia de ${DB_NAME}@${DB_HOST}:${DB_PORT}"

# --single-transaction: copia consistente sin bloquear la operación del kiosco.
# --no-tablespaces: evita requerir el privilegio PROCESS.
# Se escribe primero en .tmp para no dejar archivos incompletos.
if MYSQL_PWD="$DB_PASSWORD" mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --no-tablespaces \
    --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    "$DB_NAME" | gzip -9 > "$TMP"; then
    mv "$TMP" "$OUT"
else
    rm -f "$TMP"
    echo "ERROR: mysqldump falló; no se creó la copia." >&2
    exit 1
fi

if [ ! -s "$OUT" ]; then
    rm -f "$OUT"
    echo "ERROR: la copia quedó vacía." >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Copia creada: $OUT ($(du -h "$OUT" | cut -f1))"

# Retención: elimina copias más antiguas que BACKUP_RETENTION_DAYS.
ELIMINADOS="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete | wc -l)"
if [ "$ELIMINADOS" -gt 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Copias antiguas eliminadas: $ELIMINADOS (retención ${RETENTION_DAYS} días)"
fi
