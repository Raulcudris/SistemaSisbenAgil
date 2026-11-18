#!/bin/bash
# Bucle del servicio "backup": espera hasta la hora configurada y ejecuta
# la copia de seguridad una vez al día.
set -euo pipefail

SCHEDULE="${BACKUP_SCHEDULE_TIME:-02:00}"

if ! [[ "$SCHEDULE" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]]; then
    echo "ERROR: BACKUP_SCHEDULE_TIME='$SCHEDULE' no es válido. Use el formato HH:MM (24 h)." >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Copias automáticas activadas a las $SCHEDULE (TZ=${TZ:-sin definir}), retención ${BACKUP_RETENTION_DAYS:-14} días."

while true; do
    NOW="$(date +%s)"
    TARGET="$(date -d "today $SCHEDULE" +%s)"
    if [ "$TARGET" -le "$NOW" ]; then
        TARGET="$(date -d "tomorrow $SCHEDULE" +%s)"
    fi

    WAIT=$((TARGET - NOW))
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Próxima copia: $(date -d "@$TARGET" '+%Y-%m-%d %H:%M:%S') (en ${WAIT}s)"

    sleep "$WAIT"

    if /scripts/backup-mysql.sh; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Copia automática completada."
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR en la copia automática; se reintentará mañana." >&2
    fi
done
