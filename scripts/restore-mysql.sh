#!/bin/bash
# Restaura una copia de seguridad sobre la base de datos actual.
# Uso dentro del contenedor:
#   /usr/local/bin/restore-mysql.sh /backups/dispensamaster_2026-11-17_02-00-00.sql.gz
# Para omitir la confirmación: FORCE=1
set -euo pipefail

: "${DB_HOST:=db}"
: "${DB_PORT:=3306}"
: "${DB_NAME:?Falta DB_NAME}"
: "${DB_USER:?Falta DB_USER}"
: "${DB_PASSWORD:?Falta DB_PASSWORD}"

FILE="${1:-}"
if [ -z "$FILE" ]; then
    echo "Uso: restore-mysql.sh /backups/archivo.sql.gz" >&2
    exit 1
fi
if [ ! -f "$FILE" ]; then
    echo "ERROR: no existe el archivo $FILE" >&2
    exit 1
fi

echo "ATENCIÓN: se sobrescribirán los datos de la base '$DB_NAME' en $DB_HOST:$DB_PORT."
if [ "${FORCE:-0}" != "1" ]; then
    read -r -p "Escriba SI para continuar: " ANSWER
    if [ "$ANSWER" != "SI" ]; then
        echo "Restauración cancelada."
        exit 1
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restaurando $FILE ..."
gunzip -c "$FILE" | MYSQL_PWD="$DB_PASSWORD" mysql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --default-character-set=utf8mb4 \
    "$DB_NAME"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauración completada."
