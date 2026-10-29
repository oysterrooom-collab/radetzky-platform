#!/usr/bin/env bash
# Avvia un Postgres temporaneo (se DB non è dato), applica stub + migrazioni + seed + test. Ogni fallimento ⇒ exit != 0.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${DB:-}" ]; then
  PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); TMP=$(mktemp -d); PORT=${PGPORT_TEST:-55432}
  AS=(); if [ "$(id -u)" = 0 ]; then chown postgres "$TMP"; AS=(runuser -u postgres --); fi
  "${AS[@]}" "$PGBIN/initdb" -D "$TMP" -U postgres -A trust >/dev/null
  "${AS[@]}" "$PGBIN/pg_ctl" -D "$TMP" -o "-p $PORT -k $TMP" -l "$TMP/log" -w start >/dev/null
  trap '"${AS[@]}" "$PGBIN/pg_ctl" -D "$TMP" -m immediate stop >/dev/null; rm -rf "$TMP"' EXIT
  DB="postgresql://postgres@localhost:$PORT/postgres?host=$TMP"
fi
FILES=(tests/00_stub.sql migrations/*.sql seed.sql tests/rls.sql)
for f in "${FILES[@]}"; do [ -f "$f" ] || continue; echo "→ $f"; psql "$DB" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null; done
echo "OK"
